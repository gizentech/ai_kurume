# python/server.py
from flask import Flask, request, jsonify
import pyodbc
import logging
import json
import re
from datetime import datetime
from flask_cors import CORS

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # CORSを有効化

# データベース接続関数
def get_db_connection():
    try:
        driver_name = "InterSystems IRIS ODBC35"
        host = '172.21.2.3'
        port = '1972'
        cache_name = 'cresc-sora'
        username = 'soranomori'
        password = 'sora'
        
        connection_string = (
            f"DRIVER={{{driver_name}}};"
            f"SERVER={host};"
            f"PORT={port};"
            f"DATABASE={cache_name};"
            f"UID={username};"
            f"PWD={password}"
        )
        
        return pyodbc.connect(connection_string)
    except Exception as e:
        logger.error(f"データベース接続エラー: {e}")
        raise

def extract_text_from_json(content):
    """JSONフォーマットからテキスト部分だけを抽出して整形"""
    if not content:
        return ""
    
    # 結果のテキスト
    extracted_text = ""
    
    try:
        # "Text"フィールドを正規表現で抽出
        text_matches = re.findall(r'"Text":"([^"]*)"', content)
        
        if text_matches:
            # すべてのテキスト部分を結合
            extracted_text = "".join(text_matches)
        else:
            # 抽出に失敗した場合は元のコンテンツを返す
            return content
    except Exception as e:
        logger.error(f"JSONからのテキスト抽出エラー: {e}")
        return content  # エラーの場合は元のコンテンツを返す
    
    return extracted_text.strip()

def format_soap_content(section_name, content_text):
    """SOAPフォーマットの内容を適切に整形"""
    # JSONからテキストを抽出
    extracted_text = extract_text_from_json(content_text)
    return extracted_text

def format_free_content(content_text):
    """自由記載の内容をフォーマット"""
    # JSONからテキストを抽出
    extracted_text = extract_text_from_json(content_text)
    return extracted_text

# 患者検索エンドポイント
@app.route('/api/search-patients', methods=['GET'])
def search_patients():
    try:
        query = request.args.get('query', '')
        
        if not query or len(query) < 2:
            return jsonify({"error": "検索クエリは2文字以上必要です", "patients": []})
        
        logger.info(f"患者検索: クエリ = {query}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 検索クエリの作成
        sql_query = """
            SELECT 
                ゲスト番号, 漢字氏名, 生年月日, 性別
            FROM 
                view_cresc_data.ゲスト基本情報
            WHERE 
                (ゲスト番号 LIKE ? OR 漢字氏名 LIKE ?)
            ORDER BY 
                ゲスト番号
        """
        
        search_pattern = f"%{query}%"
        cursor.execute(sql_query, (search_pattern, search_pattern))
        
        # 結果の整形
        patients = []
        columns = [column[0] for column in cursor.description]
        
        for row in cursor.fetchall():
            patient = dict(zip(columns, row))
            
            # 患者IDの整形
            patient_id = patient.get('ゲスト番号', '')
            if isinstance(patient_id, int):
                patient_id = f"{patient_id:08d}"
            elif isinstance(patient_id, str):
                patient_id = patient_id.zfill(8)
                
            # 生年月日の整形
            birth_date = patient.get('生年月日', '')
            if birth_date and len(str(birth_date)) == 8:
                birth_date = f"{birth_date[:4]}年{birth_date[4:6]}月{birth_date[6:8]}日"
                
            patients.append({
                '患者ID': patient_id,
                '患者名': patient.get('漢字氏名', '不明'),
                '生年月日': birth_date,
                '性別': patient.get('性別', '不明')
            })
        
        cursor.close()
        conn.close()
        
        logger.info(f"検索結果: {len(patients)}件の患者が見つかりました")
        return jsonify({"patients": patients})
    
    except Exception as e:
        logger.error(f"患者検索エラー: {e}")
        return jsonify({"error": str(e), "patients": []})

# 患者記録取得エンドポイント
@app.route('/api/patient-records/<patient_id>', methods=['GET'])
def get_patient_records(patient_id):
    try:
        logger.info(f"患者記録取得: 患者ID = {patient_id}")
        
        # 患者IDの整形
        if patient_id.isdigit():
            patient_id = patient_id.zfill(8)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 患者情報の取得
        patient_query = """
            SELECT 
                uId, ゲスト番号, 漢字氏名, 生年月日, 性別
            FROM 
                view_cresc_data.ゲスト基本情報
            WHERE 
                ゲスト番号 = ?
        """
        
        cursor.execute(patient_query, (patient_id,))
        patient_row = cursor.fetchone()
        
        if not patient_row:
            cursor.close()
            conn.close()
            logger.warning(f"患者が見つかりません: ID = {patient_id}")
            return jsonify({
                "error": "患者情報が見つかりません",
                "records": "",
                "patientName": ""
            })
        
        # 患者情報の整形
        patient_columns = [column[0] for column in cursor.description]
        patient = dict(zip(patient_columns, patient_row))
        
        patient_uid = patient.get('uId')
        logger.info(f"患者UID: {patient_uid}")
        
        birth_date = patient.get('生年月日', '')
        if birth_date and len(str(birth_date)) == 8:
            birth_date = f"{birth_date[:4]}年{birth_date[4:6]}月{birth_date[6:8]}日"
        
        patient_info = {
            'patientId': patient_id,
            'patientName': patient.get('漢字氏名', ''),
            'birthDate': birth_date,
            'gender': patient.get('性別', '')
        }
        
        # 診療記録の取得 - uidを使用
        if patient_uid:
            records_query = """
                SELECT 
                    k.uId AS カルテID,
                    k.記載日時 AS 日付,
                    k.記載方法,
                    k.記載者uId AS 担当医,
                    k.記載内容リスト,
                    k.診療科uId
                FROM 
                    cresc_data.カルテ記載 k
                WHERE
                    k.患者uId = ?
                    AND k.isActive = 1
                    AND k.isDelete = 0
                ORDER BY
                    k.記載日時 DESC
            """
            
            cursor.execute(records_query, (patient_uid,))
        else:
            logger.error("患者UIDが取得できません")
            cursor.close()
            conn.close()
            return jsonify({
                "error": "患者UIDが取得できません",
                "records": "",
                "patientName": patient_info.get('patientName', '')
            })
        
        records_rows = cursor.fetchall()
        
        if not records_rows:
            cursor.close()
            conn.close()
            logger.warning(f"診療記録が見つかりません: 患者ID = {patient_id}, UID = {patient_uid}")
            return jsonify({
                "error": "該当する診療記録が見つかりません",
                "records": "",
                "patientName": patient_info.get('patientName', '')
            })
        
        # 記録をテキスト形式に変換
        formatted_records = []
        records_columns = [column[0] for column in cursor.description]
        
        for record_row in records_rows:
            record = dict(zip(records_columns, record_row))
            
            # 日付の整形
            record_date = record.get('日付', '')
            if record_date and str(record_date).isdigit() and len(str(record_date)) >= 8:
                try:
                    dt = datetime.strptime(str(record_date)[:8], "%Y%m%d")
                    formatted_date = dt.strftime("%Y年%m月%d日")
                except:
                    formatted_date = str(record_date)
            else:
                formatted_date = str(record_date)
            
            # 診療科の取得
            診療科 = "不明"
            診療科uId = record.get('診療科uId')
            if 診療科uId:
                try:
                    cursor.execute("SELECT 診療科名 FROM view_cresc_data.診療科 WHERE uId = ?", (診療科uId,))
                    科row = cursor.fetchone()
                    if 科row:
                        診療科 = 科row[0]
                except Exception as e:
                    logger.error(f"診療科名取得エラー: {e}")
            
            # 担当医の取得
            担当医 = record.get('担当医', '')
            if 担当医:
                try:
                    cursor.execute("SELECT 漢字氏名 FROM view_cresc_data.ユーザー WHERE uId = ?", (担当医,))
                    医row = cursor.fetchone()
                    if 医row:
                        担当医 = 医row[0]
                except Exception as e:
                    logger.error(f"担当医名取得エラー: {e}")
            
            # 記載内容リストの取得
            content_list = record.get('記載内容リスト', '')
            record_method = record.get('記載方法', '')
            content_data = {}
            
            if content_list:
                content_ids = str(content_list).split(',')
                
                for content_id in content_ids:
                    try:
                        # 記載内容の取得
                        content_query = """
                            SELECT 
                                記載区分, 記載内容
                            FROM 
                                cresc_data.カルテ記載内容
                            WHERE 
                                uId = ?
                        """
                        
                        cursor.execute(content_query, (content_id,))
                        content_row = cursor.fetchone()
                        
                        if content_row:
                            section, content_text = content_row
                            
                            # 記載方法に応じたフォーマット処理
                            if record_method == "自由記載":
                                formatted_content = format_free_content(content_text)
                            else:
                                formatted_content = format_soap_content(section, content_text)
                            
                            # 記載区分と内容を格納
                            content_data[section] = formatted_content
                    except Exception as e:
                        logger.error(f"記載内容ID {content_id} の取得中にエラー: {e}")
            
            # 記録を整形
            record_text = f"日付：{formatted_date}\n"
            record_text += f"診療科：{診療科}\n"
            record_text += f"担当医：{担当医}\n"
            record_text += f"記載方法：{record_method}\n"
            
            # SOAPの各セクションを追加
            for section in ['Subject', 'Object', 'Assessment', 'Plan']:
                if section in content_data and content_data[section].strip():
                    record_text += f"{section}：{content_data[section]}\n"
            
            # その他のセクションを追加
            for section, content in content_data.items():
                if section not in ['Subject', 'Object', 'Assessment', 'Plan'] and content.strip():
                    record_text += f"{section}：{content}\n"
            
            formatted_records.append(record_text)
        
        cursor.close()
        conn.close()
        
        logger.info(f"{len(records_rows)}件の診療記録を取得しました: 患者ID = {patient_id}")
        
        # 最初の記録のサンプルをログに出力
        if formatted_records:
            sample_length = min(200, len(formatted_records[0]))
            logger.info(f"最初の記録サンプル: {formatted_records[0][:sample_length]}...")
        
        # 結果の作成
        return jsonify({
            "records": "\n\n---\n\n".join(formatted_records),
            "patientName": patient_info.get('patientName', ''),
            "birthDate": patient_info.get('birthDate', ''),
            "gender": patient_info.get('gender', '')
        })
    
    except Exception as e:
        logger.error(f"診療記録取得エラー: {e}")
        return jsonify({
            "error": f"診療記録の取得に失敗しました: {str(e)}",
            "records": "",
            "patientName": ""
        })

# ヘルスチェックエンドポイント
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # 接続テスト
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # テスト用クエリ
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "ok", 
            "message": "Python サーバーは正常に動作しています",
            "db_connection": "成功"
        })
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"データベース接続エラー: {str(e)}",
            "db_connection": "失敗"
        })

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    logger.info(f"Python Flask サーバーを起動しています (ポート: {port})...")
    app.run(host='0.0.0.0', port=port, debug=True)