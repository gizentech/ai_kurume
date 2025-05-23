# python/server_temp.py
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

# データベース設定
DATABASE_CONFIGS = {
    'cresc-sora': {
        'driver_name': "InterSystems IRIS ODBC35",
        'host': '172.21.2.3',
        'port': '1972',
        'cache_name': 'cresc-sora',
        'username': 'soranomori',
        'password': 'sora'
    },
    'wrb-sora': {
        'driver_name': "InterSystems IRIS ODBC35",
        'host': '172.21.2.3',
        'port': '1972',
        'namespace': 'wrb-sora',
        'username': 'soranomori',
        'password': 'sora'
    }
}

def get_db_connection(db_name='cresc-sora'):
    """データベース接続を取得"""
    try:
        config = DATABASE_CONFIGS[db_name]
        
        if db_name == 'cresc-sora':
            connection_string = (
                f"DRIVER={{{config['driver_name']}}};"
                f"SERVER={config['host']};"
                f"PORT={config['port']};"
                f"DATABASE={config['cache_name']};"
                f"UID={config['username']};"
                f"PWD={config['password']}"
            )
        else:  # wrb-sora
            connection_string = (
                f"DRIVER={{{config['driver_name']}}};"
                f"SERVER={config['host']};"
                f"PORT={config['port']};"
                f"DATABASE={config['namespace']};"
                f"UID={config['username']};"
                f"PWD={config['password']}"
            )
        
        return pyodbc.connect(connection_string)
    except Exception as e:
        logger.error(f"データベース接続エラー ({db_name}): {e}")
        raise

# 既存の機能をここに統合（extract_text_from_json等の関数）
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

# 予約管理機能を追加
@app.route('/api/appointments/<date>', methods=['GET'])
def get_appointments_by_date(date):
    """指定日の予約一覧を取得"""
    try:
        logger.info(f"予約一覧取得: 日付 = {date}")
        
        # 日付形式の検証
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "日付形式が無効です (YYYY-MM-DD形式で入力してください)"}), 400
        
        # まずは接続テストから開始
        try:
            # Warabeeデータベース接続テスト
            logger.info("Warabeeデータベース接続テスト中...")
            wrb_conn = get_db_connection('wrb-sora')
            wrb_cursor = wrb_conn.cursor()
            
            # テーブル存在確認
            test_query = "SELECT TOP 1 * FROM wrb_data.診療予約 WHERE delete = 0"
            wrb_cursor.execute(test_query)
            test_result = wrb_cursor.fetchone()
            logger.info(f"Warabeeテストクエリ成功: {test_result is not None}")
            
        except Exception as db_error:
            logger.error(f"Warabeeデータベース接続エラー: {db_error}")
            return jsonify({"error": f"Warabeeデータベース接続エラー: {str(db_error)}"}), 500
        
        # CRESC-soraデータベースから患者・ユーザー情報を取得
        try:
            logger.info("CRESC-soraデータベース接続テスト中...")
            cresc_conn = get_db_connection('cresc-sora')
            cresc_cursor = cresc_conn.cursor()
            
            # テスト接続
            cresc_cursor.execute("SELECT TOP 1 * FROM view_cresc_data.ゲスト基本情報 WHERE isActive = 1")
            cresc_test = cresc_cursor.fetchone()
            logger.info(f"CRESC-soraテストクエリ成功: {cresc_test is not None}")
            
        except Exception as db_error:
            logger.error(f"CRESC-soraデータベース接続エラー: {db_error}")
            return jsonify({"error": f"患者データベース接続エラー: {str(db_error)}"}), 500
        
        # 予約データを取得（Delete=0のもののみ）
        appointment_query = """
            SELECT 
                ID, patientCd, 予約Kbn, 診療x予約日, 診療x予約時刻, 診療x終了時刻,
                診療x予約項目, 予約枠, 予約枠x詳細項目, コメント, コメント詳細,
                z初回登録者Cd, z初回登録日時, z登録者Cd, z登録日時,
                診療x表示順
            FROM wrb_data.診療予約
            WHERE 診療x予約日 = ? AND delete = 0
            ORDER BY 診療x予約時刻 ASC, 診療x表示順 ASC
        """
        
        wrb_cursor.execute(appointment_query, (date,))
        appointments = []
        
        columns = [column[0] for column in wrb_cursor.description]
        
        for row in wrb_cursor.fetchall():
            appointment = dict(zip(columns, row))
            
            # 患者情報を取得
            patient_info = get_patient_info(appointment['patientCd'], cresc_cursor)
            
            # 登録者情報を取得
            initial_user = get_user_info(appointment['z初回登録者Cd'], cresc_cursor)
            current_user = get_user_info(appointment['z登録者Cd'], cresc_cursor)
            
            # 予約表示内容を決定
            display_content = determine_appointment_display(
                appointment, wrb_cursor, date, appointment['診療x予約時刻']
            )
            
            # 結果をフォーマット
            formatted_appointment = {
                'id': appointment['ID'],
                'patientCd': appointment['patientCd'],
                'patientInfo': patient_info,
                'appointmentDate': appointment['診療x予約日'],
                'appointmentTime': format_time(appointment['診療x予約時刻']),
                'endTime': format_time(appointment['診療x終了時刻']),
                'displayContent': display_content,
                'comment': appointment['コメント'] or '',
                'commentDetail': appointment['コメント詳細'] or '',
                'initialUser': initial_user,
                'currentUser': current_user,
                'initialRegDate': format_datetime(appointment['z初回登録日時']),
                'currentRegDate': format_datetime(appointment['z登録日時']),
                'displayOrder': appointment['診療x表示順'] or 0
            }
            
            appointments.append(formatted_appointment)
        
        wrb_cursor.close()
        wrb_conn.close()
        cresc_cursor.close()
        cresc_conn.close()
        
        logger.info(f"予約一覧取得完了: {len(appointments)}件")
        return jsonify({
            "appointments": appointments,
            "date": date,
            "total": len(appointments)
        })
        
    except Exception as e:
        logger.error(f"予約一覧取得エラー: {e}")
        return jsonify({"error": str(e)}), 500

def get_patient_info(patient_cd, cursor):
    """患者情報を取得"""
    if not patient_cd:
        return {"name": "不明", "gender": "不明", "birthDate": "不明"}
    
    try:
        patient_query = """
            SELECT 漢字氏名, 性別, 生年月日
            FROM view_cresc_data.ゲスト基本情報
            WHERE ゲスト番号 = ? AND isActive = 1 AND isDelete = 0
        """
        
        cursor.execute(patient_query, (patient_cd,))
        result = cursor.fetchone()
        
        if result:
            name, gender, birth_date = result
            formatted_birth_date = format_birth_date(birth_date)
            return {
                "name": name or "不明",
                "gender": gender or "不明", 
                "birthDate": formatted_birth_date
            }
    except Exception as e:
        logger.debug(f"患者情報取得エラー: {e}")
    
    return {"name": "不明", "gender": "不明", "birthDate": "不明"}

def get_user_info(user_cd, cursor):
    """ユーザー情報を取得"""
    if not user_cd:
        return {"name": "不明", "code": ""}
    
    try:
        user_query = """
            SELECT name
            FROM cresc_data.ユーザー
            WHERE Code = ? AND isActive = 1 AND isDelete = 0
        """
        
        cursor.execute(user_query, (user_cd,))
        result = cursor.fetchone()
        
        if result and result[0]:
            return {"name": result[0], "code": str(user_cd)}
    except Exception as e:
        logger.debug(f"ユーザー情報取得エラー: {e}")
    
    return {"name": "不明", "code": str(user_cd) if user_cd else ""}

def determine_appointment_display(appointment, cursor, date, time):
    """予約表示内容を決定"""
    kbn = appointment['予約Kbn']
    
    if kbn == 1:
        return "診：診察"
    elif kbn == 2:
        return f"診：{appointment['予約枠'] or '予約'}"
    elif kbn == 3:
        # 同じ日時にKbn=1の予約があるかチェック
        check_query = """
            SELECT COUNT(*)
            FROM wrb_data.診療予約
            WHERE 診療x予約日 = ? AND 診療x予約時刻 = ? AND 予約Kbn = 1 AND delete = 0
        """
        
        try:
            cursor.execute(check_query, (date, time))
            count = cursor.fetchone()[0]
            
            if count > 0:
                # Kbn=1があるので、Kbn=3の予約枠を表示
                return f"診：{appointment['予約枠'] or '予約'}"
            else:
                # Kbn=1がないので診察として表示
                return "診：診察"
        except Exception as e:
            logger.debug(f"予約Kbn判定エラー: {e}")
            return f"診：{appointment['予約枠'] or '予約'}"
    
    return "診：予約"

def format_time(time_obj):
    """時刻をフォーマット"""
    if not time_obj:
        return ""
    
    try:
        if isinstance(time_obj, str):
            # "HH:MM:SS" 形式の場合
            return time_obj[:5]  # "HH:MM" のみ返す
        else:
            # datetime.time オブジェクトの場合
            return time_obj.strftime("%H:%M")
    except:
        return str(time_obj)

def format_datetime(datetime_obj):
    """日時をフォーマット"""
    if not datetime_obj:
        return ""
    
    try:
        if isinstance(datetime_obj, datetime):
            return datetime_obj.strftime("%Y-%m-%d %H:%M")
        else:
            return str(datetime_obj)
    except:
        return str(datetime_obj)

def format_birth_date(birth_date):
    """生年月日をフォーマット"""
    if not birth_date:
        return "不明"
    
    try:
        birth_str = str(birth_date)
        if len(birth_str) == 8:
            return f"{birth_str[:4]}年{birth_str[4:6]}月{birth_str[6:8]}日"
    except:
        pass
    
    return str(birth_date)

@app.route('/api/appointments/calendar-dates', methods=['GET'])
def get_calendar_dates():
    """カレンダー用の予約がある日付一覧を取得"""
    try:
        year = request.args.get('year', datetime.now().year)
        month = request.args.get('month', datetime.now().month)
        
        wrb_conn = get_db_connection('wrb-sora')
        cursor = wrb_conn.cursor()
        
        # 指定月の予約がある日付を取得
        dates_query = """
            SELECT DISTINCT 診療x予約日, COUNT(*) as count
            FROM wrb_data.診療予約
            WHERE YEAR(診療x予約日) = ? AND MONTH(診療x予約日) = ? AND delete = 0
            GROUP BY 診療x予約日
            ORDER BY 診療x予約日
        """
        
        cursor.execute(dates_query, (year, month))
        dates = []
        
        for row in cursor.fetchall():
            dates.append({
                'date': row[0].strftime('%Y-%m-%d') if row[0] else '',
                'count': row[1]
            })
        
        cursor.close()
        wrb_conn.close()
        
        return jsonify({
            "dates": dates,
            "year": int(year),
            "month": int(month)
        })
        
    except Exception as e:
        logger.error(f"カレンダー日付取得エラー: {e}")
        return jsonify({"error": str(e)}), 500

# 既存のエンドポイントも含める（患者検索、診療記録取得など）
# ... (既存のコードをここに追加)

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # CRESC-sora接続テスト
        cresc_conn = get_db_connection('cresc-sora')
        cresc_cursor = cresc_conn.cursor()
        
        cresc_cursor.execute("SELECT 1 as test")
        cresc_result = cresc_cursor.fetchone()
        
        cresc_cursor.execute("SELECT COUNT(*) FROM view_cresc_data.ゲスト基本情報 WHERE isActive = 1 AND isDelete = 0")
        patient_count = cresc_cursor.fetchone()[0]
        
        cresc_cursor.close()
        cresc_conn.close()
        
        # Warabee接続テスト
        wrb_conn = get_db_connection('wrb-sora')
        wrb_cursor = wrb_conn.cursor()
        
        wrb_cursor.execute("SELECT 1 as test")
        wrb_result = wrb_cursor.fetchone()
        
        wrb_cursor.execute("SELECT COUNT(*) FROM wrb_data.診療予約 WHERE delete = 0")
        appointment_count = wrb_cursor.fetchone()[0]
        
        wrb_cursor.close() 
        wrb_conn.close()
        
        return jsonify({
            "status": "ok", 
            "message": "Python サーバーは正常に動作しています",
            "cresc_db_connection": "成功",
            "warabee_db_connection": "成功",
            "patient_count": patient_count,
            "appointment_count": appointment_count,
            "cresc_test_result": cresc_result[0] if cresc_result else None,
            "warabee_test_result": wrb_result[0] if wrb_result else None
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