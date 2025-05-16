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
    """JSONフォーマットからテキスト部分だけを抽出して整形 - 改善版"""
    if not content:
        return ""
    
    try:
        # JSONデータでない場合はそのまま返す
        if not isinstance(content, str) or not ('"Text"' in content):
            return content
        
        logger.debug(f"JSONテキスト抽出処理開始: 長さ={len(content)}")
        
        # 正規表現で全てのTextフィールドを一度に抽出する方法
        all_text_fields = re.findall(r'"Text"\s*:\s*"([^"]*(?:\\"|[^"])*)"', content)
        if all_text_fields:
            # エスケープされた引用符を処理
            processed_texts = []
            for text in all_text_fields:
                # エスケープシーケンスを解決
                processed = text.replace('\\"', '"').replace('\\\\', '\\')
                processed_texts.append(processed)
            
            # すべてのテキストを結合
            result = ' '.join([t for t in processed_texts if t.strip()])
            logger.debug(f"正規表現による抽出結果: 長さ={len(result)}")
            return result
        
        # 別のアプローチ: JSON文字列を解析してみる
        try:
            # JSON配列の場合
            if content.strip().startswith('[') and content.strip().endswith(']'):
                try:
                    # 配列全体をパースしてみる
                    json_array = json.loads(content)
                    texts = []
                    for item in json_array:
                        if isinstance(item, dict) and 'Text' in item:
                            texts.append(item['Text'])
                    
                    if texts:
                        result = ' '.join([t for t in texts if t.strip()])
                        logger.debug(f"JSON配列パースによる抽出結果: 長さ={len(result)}")
                        return result
                except:
                    pass  # 配列パースに失敗した場合は次の方法を試す
            
            # エスケープ処理を修正して解析を試みる
            modified_content = content.replace('\\"', '"').replace('\\\\', '\\')
            
            # 文字列がダブルクォートで始まり終わる場合、それを削除して解析
            if modified_content.startswith('"') and modified_content.endswith('"'):
                try:
                    inner_content = json.loads(modified_content[1:-1])
                    if isinstance(inner_content, list):
                        texts = []
                        for item in inner_content:
                            if isinstance(item, dict) and 'Text' in item:
                                texts.append(item['Text'])
                        
                        if texts:
                            result = ' '.join([t for t in texts if t.strip()])
                            logger.debug(f"修正JSONパースによる抽出結果: 長さ={len(result)}")
                            return result
                except:
                    pass  # この方法も失敗した場合は次へ
            
            # もっと強力な方法: 文字列操作で全てのテキストを抽出
            # すべての "Text": "..." パターンを探して抽出
            text_blocks = []
            start_idx = 0
            
            while True:
                # "Text": を探す
                text_marker = content.find('"Text":', start_idx)
                if text_marker == -1:
                    break
                
                # テキスト開始の引用符を探す
                start_quote = content.find('"', text_marker + 7)  # 7 は "Text": の長さ
                if start_quote == -1:
                    break
                
                # テキスト終了の引用符を探す (エスケープされた引用符をスキップ)
                end_quote = start_quote + 1
                while True:
                    end_quote = content.find('"', end_quote)
                    if end_quote == -1:
                        break
                    
                    # エスケープされていない引用符を見つけたか確認
                    if content[end_quote - 1] != '\\':
                        break
                    end_quote += 1
                
                if end_quote == -1:
                    break
                
                # テキストを抽出して追加
                text_value = content[start_quote + 1:end_quote]
                # エスケープを処理
                text_value = text_value.replace('\\"', '"').replace('\\\\', '\\')
                text_blocks.append(text_value)
                
                # 次の検索開始位置を設定
                start_idx = end_quote + 1
            
            if text_blocks:
                result = ' '.join([t for t in text_blocks if t.strip()])
                logger.debug(f"手動文字列操作による抽出結果: 長さ={len(result)}")
                return result
            
        except Exception as e:
            logger.error(f"JSON構造解析エラー: {e}")
        
        # 最後の手段: オリジナルの文字列を返す
        logger.warning("テキスト抽出失敗: オリジナルの内容を返します")
        return content
        
    except Exception as e:
        logger.error(f"JSONからのテキスト抽出エラー: {e}")
        # エラーが発生しても何かしらの内容を返すべき
        return content

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
        
        # 検索クエリの作成 - isActive=1, isDelete=0 を追加
        sql_query = """
            SELECT 
                ゲスト番号, 漢字氏名, 生年月日, 性別
            FROM 
                view_cresc_data.ゲスト基本情報
            WHERE 
                (ゲスト番号 LIKE ? OR 漢字氏名 LIKE ?)
                AND isActive = 1 
                AND isDelete = 0
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

# 患者記録取得エンドポイント - SOAPフォーマットに統合した修正版
@app.route('/api/patient-records/<patient_id>', methods=['GET'])
def get_patient_records(patient_id):
    try:
        logger.info(f"患者記録取得: 患者ID = {patient_id}")
        
        # 患者IDの整形
        if patient_id.isdigit():
            patient_id = patient_id.zfill(8)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 患者情報の取得 - isActive=1, isDelete=0 を追加
        patient_query = """
            SELECT 
                uId, ゲスト番号, 漢字氏名, 生年月日, 性別
            FROM 
                view_cresc_data.ゲスト基本情報
            WHERE 
                ゲスト番号 = ?
                AND isActive = 1
                AND isDelete = 0
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
        if not patient_uid:
            logger.error("患者UIDが取得できません")
            cursor.close()
            conn.close()
            return jsonify({
                "error": "患者UIDが取得できません",
                "records": "",
                "patientName": patient_info.get('patientName', '')
            })
        
        # カルテ記載の取得 - isActive=1, isDelete=0 は既に適用されている
        records_query = """
            SELECT 
                k.uId AS カルテID,
                k.記載日時 AS 日付,
                k.記載方法,
                k.記載者uId AS 担当医ID,
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
            
            # 診療科の取得 - isActive=1, isDelete=0 を追加
            診療科 = "不明"
            診療科uId = record.get('診療科uId')
            if 診療科uId:
                try:
                    cursor.execute("""
                        SELECT 診療科名 
                        FROM view_cresc_data.診療科 
                        WHERE uId = ? 
                        AND isActive = 1 
                        AND isDelete = 0
                    """, (診療科uId,))
                    科row = cursor.fetchone()
                    if 科row:
                        診療科 = 科row[0]
                except Exception as e:
                    logger.error(f"診療科名取得エラー: {e}")
            
            # 担当医の取得 - isActive=1, isDelete=0 を追加
            担当医 = "不明"
            担当医ID = record.get('担当医ID')
            if 担当医ID:
                try:
                    cursor.execute("""
                        SELECT 漢字氏名 
                        FROM view_cresc_data.ユーザー 
                        WHERE uId = ? 
                        AND isActive = 1 
                        AND isDelete = 0
                    """, (担当医ID,))
                    医row = cursor.fetchone()
                    if 医row:
                        担当医 = 医row[0]
                except Exception as e:
                    logger.error(f"担当医名取得エラー: {e}")
            
            # 記載方法
            記載方法 = record.get('記載方法', 'SOAP')  # デフォルトをSOAPに設定
            
            # 記載内容リストの取得
            content_list = record.get('記載内容リスト', '')
            if not content_list:
                continue  # 内容がなければスキップ
            
            content_ids = str(content_list).split(',')
            
            # 1つの診療記録にSOAPの全セクションをまとめる
            soap_content = {
                'Subject': '',
                'Object': '',
                'Assessment': '',
                'Plan': ''
            }
            
            # その他のセクション用の辞書
            other_content = {}
            
            # 全ての記載内容を取得
            for content_id in content_ids:
                try:
                    # 記載内容の取得 - isActive=1, isDelete=0 を追加
                    content_query = """
                        SELECT 
                            uId, 記載区分, 記載内容
                        FROM 
                            cresc_data.カルテ記載内容
                        WHERE 
                            uId = ?
                            AND isActive = 1
                            AND isDelete = 0
                    """
                    
                    cursor.execute(content_query, (content_id,))
                    content_row = cursor.fetchone()
                    
                    if content_row:
                        content_uid, section, content_text = content_row
                        
                        # JSONからテキストを抽出
                        formatted_content = extract_text_from_json(content_text)
                        
                        # SOAPセクションに追加
                        if section in soap_content:
                            soap_content[section] = formatted_content
                        else:
                            # その他のセクション
                            other_content[section] = formatted_content
                except Exception as e:
                    logger.error(f"記載内容ID {content_id} の取得中にエラー: {e}")
            
            # 空のSOAPセクションを削除
            for section in list(soap_content.keys()):
                if not soap_content[section] or soap_content[section].strip() == "":
                    del soap_content[section]
            
            # SOAPセクションが存在しない場合はスキップ
            if not soap_content and not other_content:
                continue
            
            # 記録を整形
            record_text = f"日付：{formatted_date}\n"
            record_text += f"診療科：{診療科}\n"
            record_text += f"担当医：{担当医}\n"
            record_text += f"記載方法：{記載方法}\n"
            
            # SOAPセクションを追加
            for section, content in soap_content.items():
                if content and content.strip():
                    record_text += f"{section}：{content}\n"
            
            # その他のセクションを追加
            for section, content in other_content.items():
                if content and content.strip():
                    record_text += f"{section}：{content}\n"
            
            formatted_records.append(record_text)
        
        cursor.close()
        conn.close()
        
        logger.info(f"{len(formatted_records)}件の診療記録を取得しました: 患者ID = {patient_id}")
        
        # 結果の作成
        result = {
            "records": "\n\n---\n\n".join(formatted_records),
            "patientName": patient_info.get('patientName', ''),
            "birthDate": patient_info.get('birthDate', ''),
            "gender": patient_info.get('gender', '')
        }
        
        return jsonify(result)
    
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