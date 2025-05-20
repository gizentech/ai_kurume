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
CORS(app)

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
    """JSON配列からテキストを抽出する - JSONコンバーター形式に対応"""
    if not content:
        return ""
    
    try:
        # 文字列でない場合はそのまま返す
        if not isinstance(content, str):
            return str(content)
        
        # JSONフォーマットでない場合はそのまま返す
        if '"Text"' not in content:
            return content
        
        logger.debug(f"JSON抽出開始: 長さ={len(content)}")
        
        # カンマで区切られた複数のJSON配列を分割
        # 例: "[{...}]","[{...}]" のような形式を処理
        
        # 一番外側の引用符を除去
        cleaned_content = content.strip()
        if cleaned_content.startswith('"') and cleaned_content.endswith('"'):
            cleaned_content = cleaned_content[1:-1]
        
        # エスケープされた引用符を元に戻す
        cleaned_content = cleaned_content.replace('""', '"')
        
        # カンマで区切られたJSON配列を分割
        json_arrays = []
        current_array = ""
        bracket_count = 0
        in_quotes = False
        escaped = False
        
        i = 0
        while i < len(cleaned_content):
            char = cleaned_content[i]
            
            if escaped:
                escaped = False
                current_array += char
                i += 1
                continue
            
            if char == '\\':
                escaped = True
                current_array += char
                i += 1
                continue
            
            if char == '"' and not escaped:
                in_quotes = not in_quotes
                current_array += char
            elif not in_quotes:
                if char == '[':
                    if bracket_count == 0:
                        current_array = char
                    else:
                        current_array += char
                    bracket_count += 1
                elif char == ']':
                    current_array += char
                    bracket_count -= 1
                    if bracket_count == 0:
                        json_arrays.append(current_array)
                        current_array = ""
                        # 次のJSON配列まで進む（", を探す）
                        while i + 1 < len(cleaned_content) and cleaned_content[i + 1] in ['"', ',', ' ']:
                            i += 1
                elif bracket_count > 0:
                    current_array += char
            else:
                current_array += char
            
            i += 1
        
        # 残ったものがあれば追加
        if current_array.strip():
            json_arrays.append(current_array.strip())
        
        # JSON配列が見つからなかった場合は全体を1つの配列として処理
        if not json_arrays:
            json_arrays = [cleaned_content]
        
        # 各JSON配列からテキストを抽出
        all_texts = []
        
        for json_array_str in json_arrays:
            try:
                # JSON配列として解析
                json_array = json.loads(json_array_str)
                
                if isinstance(json_array, list):
                    for item in json_array:
                        if isinstance(item, dict) and 'Text' in item:
                            text = item['Text']
                            # JSONコンバーターの規則：空のTextは改行として扱う
                            if text == "":
                                all_texts.append("")  # 空行として保持
                            elif text.strip():
                                all_texts.append(text.strip())
                elif isinstance(json_array, dict) and 'Text' in json_array:
                    # 単一のオブジェクトの場合
                    text = json_array['Text']
                    if text == "":
                        all_texts.append("")
                    elif text.strip():
                        all_texts.append(text.strip())
            
            except json.JSONDecodeError as e:
                logger.debug(f"JSON解析エラー: {e}, 内容: {json_array_str[:100]}...")
                # JSONとして解析できない場合は正規表現で抽出
                text_matches = re.findall(r'"Text"\s*:\s*"([^"]*)"', json_array_str)
                for match in text_matches:
                    if match == "":
                        all_texts.append("")
                    elif match.strip():
                        all_texts.append(match.strip())
        
        # JSONコンバーターの規則に従って結合
        # 連続する非空行は改行で結合、空のTextは段落の区切りとして扱う
        result_parts = []
        current_paragraph = []
        
        for text in all_texts:
            if text == "":
                # 空行の場合、現在の段落を結合して追加
                if current_paragraph:
                    result_parts.append('\n'.join(current_paragraph))
                    current_paragraph = []
                # 空行として段落区切りを追加
                result_parts.append("")
            else:
                # 非空行の場合、現在の段落に追加
                current_paragraph.append(text)
        
        # 最後の段落を追加
        if current_paragraph:
            result_parts.append('\n'.join(current_paragraph))
        
        # 結果を改行で結合（空の要素は改行として扱う）
        result = '\n'.join(result_parts)
        
        # 連続する改行を整理
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        logger.debug(f"抽出完了: {len(result)}文字")
        return result
        
    except Exception as e:
        logger.error(f"JSONテキスト抽出エラー: {e}")
        return content

def get_department_name(dept_uid, cursor):
    """診療科名を取得"""
    if not dept_uid:
        return "不明"
    
    try:
        cursor.execute("""
            SELECT name 
            FROM cresc_data.診療科マスター 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (dept_uid,))
        
        result = cursor.fetchone()
        if result:
            return result[0]
    except Exception as e:
        logger.debug(f"診療科マスター検索エラー: {e}")
    
    return "不明"

def get_user_name(user_uid, cursor):
    """ユーザー名を取得"""
    if not user_uid:
        return "不明"
    
    try:
        # まずnameフィールドを試す
        cursor.execute("""
            SELECT name 
            FROM cresc_data.ユーザー 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (user_uid,))
        
        result = cursor.fetchone()
        if result and result[0]:
            return result[0]
        
        # nameがない場合はview_cresc_dataから漢字氏名を取得
        cursor.execute("""
            SELECT 漢字氏名 
            FROM view_cresc_data.ユーザー 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (user_uid,))
        
        result = cursor.fetchone()
        if result and result[0]:
            return result[0]
    except Exception as e:
        logger.debug(f"ユーザー名取得エラー: {e}")
    
    return "不明"

def get_record_type_name(type_uid, cursor):
    """記載種別名を取得"""
    if not type_uid:
        return "不明"
    
    try:
        cursor.execute("""
            SELECT name 
            FROM cresc_data.カルテ記載種別マスター 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (type_uid,))
        
        result = cursor.fetchone()
        if result:
            return result[0]
    except Exception as e:
        logger.debug(f"記載種別取得エラー: {e}")
    
    return "不明"

def format_insurance_type(insurance_code):
    """保険自費区分を文字列に変換"""
    insurance_map = {
        0: "保険",
        1: "自費", 
        2: "混合",
        3: "その他"
    }
    return insurance_map.get(insurance_code, f"不明({insurance_code})")

def format_inout_type(inout_code):
    """入外区分を文字列に変換"""
    inout_map = {
        0: "外来",
        1: "入院"
    }
    return inout_map.get(inout_code, f"不明({inout_code})")

@app.route('/api/search-patients', methods=['GET'])
def search_patients():
    try:
        query = request.args.get('query', '')
        
        if not query or len(query) < 2:
            return jsonify({"error": "検索クエリは2文字以上必要です", "patients": []})
        
        logger.info(f"患者検索: クエリ = {query}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql_query = """
            SELECT TOP 20
                ゲスト番号, 漢字氏名, 生年月日, 性別, uId
            FROM 
                view_cresc_data.ゲスト基本情報
            WHERE 
                (ゲスト番号 LIKE ? OR 漢字氏名 LIKE ?)
                AND isActive = 1 
                AND isDelete = 0
            ORDER BY 
                ゲスト番号 DESC
        """
        
        search_pattern = f"%{query}%"
        cursor.execute(sql_query, (search_pattern, search_pattern))
        
        patients = []
        columns = [column[0] for column in cursor.description]
        
        for row in cursor.fetchall():
            patient = dict(zip(columns, row))
            
            patient_id = patient.get('ゲスト番号', '')
            if isinstance(patient_id, (int, float)):
                patient_id = f"{int(patient_id):08d}"
            elif isinstance(patient_id, str):
                patient_id = patient_id.zfill(8)
                
            birth_date = patient.get('生年月日', '')
            if birth_date and len(str(birth_date)) == 8:
                birth_date_str = str(birth_date)
                birth_date = f"{birth_date_str[:4]}年{birth_date_str[4:6]}月{birth_date_str[6:8]}日"
                
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


@app.route('/api/patient-records/<patient_id>', methods=['GET'])
def get_patient_records(patient_id):
    try:
        logger.info(f"患者記録取得: 患者ID = {patient_id}")
        
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
        
        # 生年月日の整形
        birth_date = patient.get('生年月日', '')
        if birth_date and len(str(birth_date)) == 8:
            birth_date_str = str(birth_date)
            birth_date = f"{birth_date_str[:4]}年{birth_date_str[4:6]}月{birth_date_str[6:8]}日"
        
        patient_info = {
            'patientId': patient_id,
            'patientName': patient.get('漢字氏名', ''),
            'birthDate': birth_date,
            'gender': patient.get('性別', '')
        }
        
        # 診療記録の取得（正確なフィールド名を使用）
        records_query = """
            SELECT 
                記載.uId,
                記載.患者uId,
                記載.updateStamp,
                記載.診療科uId,
                記載.記載者uId,
                記載.指示者uId,
                記載.updateUserId,
                記載.記載種別uId,
                記載.記載内容リスト,
                記載.保険自費区分,
                記載.入外区分
            FROM 
                cresc_data.カルテ記載 as 記載
            WHERE
                記載.患者uId = ?
                AND 記載.isActive = 1
                AND 記載.isDelete = 0
            ORDER BY
                記載.updateStamp DESC
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
            record_date = record.get('updateStamp', '')
            if record_date:
                date_str = str(int(record_date)) if isinstance(record_date, (int, float)) else str(record_date)
            else:
                date_str = ""
            
            # 各種情報の取得
            診療科 = get_department_name(record.get('診療科uId'), cursor)
            記載者 = get_user_name(record.get('記載者uId'), cursor)
            指示者 = get_user_name(record.get('指示者uId'), cursor)
            更新者 = get_user_name(record.get('updateUserId'), cursor)
            記載種別 = get_record_type_name(record.get('記載種別uId'), cursor)
            
            # 記載タグの取得
            記載タグ = get_record_tags(record.get('uId'), cursor)
            
            # 記載内容リストの取得
            content_list = record.get('記載内容リスト', '')
            if not content_list:
                continue
            
            content_ids = [cid.strip() for cid in str(content_list).split(',') if cid.strip()]
            
            # SOAPセクション用の辞書
            soap_content = {
                'Subject': [],
                'Object': [],
                'Assessment': [],
                'Plan': []
            }
            
            # その他のセクション用の辞書
            other_content = {}
            
            # 記載方法の判定用
            record_method = ""
            
            # 全ての記載内容を取得
            for content_id in content_ids:
                try:
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
                        
                        # セクション名の正規化
                        section = str(section).strip() if section else "記録"
                        
                        # 記載方法の判定
                        if section in ['自由記載', '自由']:
                            record_method = "自由記載"
                        elif section in ['超音波']:
                            record_method = "超音波"
                        elif section in soap_content:
                            record_method = "SOAP"
                        
                        # SOAPセクションか他のセクションかを判別
                        if section in soap_content:
                            soap_content[section].append(formatted_content)
                        else:
                            if section not in other_content:
                                other_content[section] = []
                            other_content[section].append(formatted_content)
                
                except Exception as e:
                    logger.error(f"記載内容ID {content_id} の取得中にエラー: {e}")
            
            # 記載方法が判定できない場合のデフォルト
            if not record_method:
                if any(soap_content.values()):
                    record_method = "SOAP"
                elif 記載種別 and ('自由' in 記載種別):
                    record_method = "自由記載"
                elif 記載種別 and ('超音波' in 記載種別):
                    record_method = "超音波"
                else:
                    record_method = "記録"
            
            # 空のセクションを削除し、テキストを結合
            soap_content = {k: '\n\n'.join(v) for k, v in soap_content.items() if v}
            other_content = {k: '\n\n'.join(v) for k, v in other_content.items() if v}
            
            # 何らかのコンテンツが存在する場合のみ記録を追加
            if soap_content or other_content:
                record_text = f"日付：{date_str}\n"
                record_text += f"診療科：{診療科}\n"
                record_text += f"担当医：{記載者 or 更新者}\n"
                if 記載者 and 記載者 != "不明":
                    record_text += f"記載者：{記載者}\n"
                if 指示者 and 指示者 != "不明":
                    record_text += f"指示者：{指示者}\n"
                if 更新者 and 更新者 != "不明":
                    record_text += f"更新者：{更新者}\n"
                record_text += f"記載方法：{record_method}\n"
                if 記載種別 and 記載種別 != "不明":
                    record_text += f"記載区分：{記載種別}\n"
                
                # 保険自費区分と入外区分の処理
                保険区分 = record.get('保険自費区分')
                入外区分 = record.get('入外区分')
                
                if 保険区分 == 3:
                    record_text += f"保険区分：保険\n"
                elif 保険区分 == 1:
                    record_text += f"保険区分：自費\n"
                elif 保険区分 == 0:
                    record_text += f"保険区分：未登録\n"
                
                if 入外区分 == 0:
                    record_text += f"入外区分：外来\n"
                elif 入外区分 == 1:
                    record_text += f"入外区分：入院\n"
                
                if 記載タグ:
                    record_text += f"記載タグ：{記載タグ}\n"
                
                # SOAPセクションを定義順に追加
                soap_order = ['Subject', 'Object', 'Assessment', 'Plan']
                for section in soap_order:
                    if section in soap_content:
                        record_text += f"{section}：{soap_content[section]}\n"
                
                # その他のセクションを追加
                for section, content in other_content.items():
                    record_text += f"{section}：{content}\n"
                
                formatted_records.append(record_text.rstrip())
        
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

# 他の関数は前回と同じ
def get_record_tags(record_uid, cursor):
    """記載記録に関連するタグを取得"""
    if not record_uid:
        return ""
    
    try:
        tag_query = """
            SELECT items 
            FROM cresc_data.カルテ記載タグ 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """
        
        cursor.execute(tag_query, (record_uid,))
        tag_rows = cursor.fetchall()
        
        tag_names = []
        for tag_row in tag_rows:
            if tag_row[0]:
                tag_uids = [uid.strip() for uid in str(tag_row[0]).split(',') if uid.strip()]
                for tag_uid in tag_uids:
                    tag_name = get_tag_name(tag_uid, cursor)
                    if tag_name and tag_name != "不明":
                        tag_names.append(tag_name)
        
        return ", ".join(tag_names)
    except Exception as e:
        logger.debug(f"記載タグ取得エラー: {e}")
    
    return ""

def get_tag_name(tag_uid, cursor):
    """記載タグ名を取得"""
    if not tag_uid:
        return "不明"
    
    try:
        cursor.execute("""
            SELECT name 
            FROM cresc_data.カルテ記載タグマスター 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (tag_uid,))
        
        result = cursor.fetchone()
        if result:
            return result[0]
    except Exception as e:
        logger.debug(f"記載タグマスター検索エラー: {e}")
    
    return "不明"

def get_department_name(dept_uid, cursor):
    """診療科名を取得"""
    if not dept_uid:
        return "不明"
    
    try:
        cursor.execute("""
            SELECT name 
            FROM cresc_data.診療科マスター 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (dept_uid,))
        
        result = cursor.fetchone()
        if result:
            return result[0]
    except Exception as e:
        logger.debug(f"診療科マスター検索エラー: {e}")
    
    return "不明"

def get_user_name(user_uid, cursor):
    """ユーザー名を取得"""
    if not user_uid:
        return "不明"
    
    try:
        cursor.execute("""
            SELECT name 
            FROM cresc_data.ユーザー 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (user_uid,))
        
        result = cursor.fetchone()
        if result and result[0]:
            return result[0]
        
        cursor.execute("""
            SELECT 漢字氏名 
            FROM view_cresc_data.ユーザー 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (user_uid,))
        
        result = cursor.fetchone()
        if result and result[0]:
            return result[0]
    except Exception as e:
        logger.debug(f"ユーザー名取得エラー: {e}")
    
    return "不明"

def get_record_type_name(type_uid, cursor):
    """記載種別名を取得"""
    if not type_uid:
        return "不明"
    
    try:
        cursor.execute("""
            SELECT name 
            FROM cresc_data.カルテ記載種別マスター 
            WHERE uId = ? AND isActive = 1 AND isDelete = 0
        """, (type_uid,))
        
        result = cursor.fetchone()
        if result:
            return result[0]
    except Exception as e:
        logger.debug(f"記載種別取得エラー: {e}")
    
    return "不明"

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) FROM view_cresc_data.ゲスト基本情報 WHERE isActive = 1 AND isDelete = 0")
        patient_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM cresc_data.カルテ記載 WHERE isActive = 1 AND isDelete = 0")
        record_count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "ok", 
            "message": "Python サーバーは正常に動作しています",
            "db_connection": "成功",
            "patient_count": patient_count,
            "record_count": record_count,
            "test_result": result[0] if result else None
        })
    except Exception as e:
        logger.error(f"ヘルスチェックエラー: {e}")
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