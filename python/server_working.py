# python/server_working.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import logging
from datetime import datetime

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# データベース接続設定
def get_cresc_connection():
    driver_name = "InterSystems IRIS ODBC35"
    host = '172.21.2.3'
    port = '1972'
    cache_name = 'cresc-sora'
    username = 'soranomori'
    password = 'sora'
    
    connection_string = f"DRIVER={{{driver_name}}};SERVER={host};PORT={port};DATABASE={cache_name};UID={username};PWD={password}"
    return pyodbc.connect(connection_string)

def get_warabee_connection():
    driver_name = "InterSystems IRIS ODBC35"
    host = '172.21.2.3'
    port = '1972'
    namespace = 'wrb-sora'
    username = 'soranomori'
    password = 'sora'
    
    connection_string = f"DRIVER={{{driver_name}}};SERVER={host};PORT={port};DATABASE={namespace};UID={username};PWD={password}"
    return pyodbc.connect(connection_string)

@app.route('/api/appointments/<date>', methods=['GET'])
def get_appointments(date):
    try:
        logger.info(f"予約取得: {date}")
        
        # 日付検証
        datetime.strptime(date, '%Y-%m-%d')
        
        # Warabeeデータベース接続
        wrb_conn = get_warabee_connection()
        wrb_cursor = wrb_conn.cursor()
        
        # CRESC-soraデータベース接続
        cresc_conn = get_cresc_connection()
        cresc_cursor = cresc_conn.cursor()
        
        # 正しいテーブル名で予約データ取得
        query = """
            SELECT 
                ID, patientCd, 予約Kbn, 診療x予約日, 診療x予約時刻, 診療x終了時刻,
                診療x予約項目, 予約枠, コメント, コメント詳細,
                z初回登録者Cd, z初回登録日時, z登録者Cd, z登録日時,
                診療x表示順
            FROM view_wrb_table_予約.reki
            WHERE 診療x予約日 = ? AND delete = 0
            ORDER BY 診療x予約時刻 ASC, 診療x表示順 ASC
        """
        
        logger.info(f"実行するクエリ: {query}")
        logger.info(f"パラメータ: {date}")
        
        wrb_cursor.execute(query, (date,))
        appointments = []
        
        for row in wrb_cursor.fetchall():
            appointment_id, patient_cd, yoyaku_kbn, yoyaku_date, yoyaku_time, end_time, yoyaku_item, yoyaku_waku, comment, comment_detail, initial_user_cd, initial_date, current_user_cd, current_date, display_order = row
            
            # 患者情報取得
            patient_name = "不明"
            patient_gender = "不明"
            patient_birth = "不明"
            
            if patient_cd:
                try:
                    cresc_cursor.execute(
                        "SELECT 漢字氏名, 性別, 生年月日 FROM view_cresc_data.ゲスト基本情報 WHERE ゲスト番号 = ? AND isActive = 1 AND isDelete = 0",
                        (patient_cd,)
                    )
                    patient_result = cresc_cursor.fetchone()
                    if patient_result:
                        patient_name = patient_result[0] or "不明"
                        patient_gender = patient_result[1] or "不明"
                        birth_date = patient_result[2]
                        if birth_date and len(str(birth_date)) == 8:
                            birth_str = str(birth_date)
                            patient_birth = f"{birth_str[:4]}年{birth_str[4:6]}月{birth_str[6:8]}日"
                except Exception as e:
                    logger.debug(f"患者情報取得エラー: {e}")
            
            # ユーザー情報取得
            initial_user_name = "不明"
            current_user_name = "不明"
            
            if initial_user_cd:
                try:
                    cresc_cursor.execute(
                        "SELECT name FROM cresc_data.ユーザー WHERE Code = ? AND isActive = 1",
                        (initial_user_cd,)
                    )
                    user_result = cresc_cursor.fetchone()
                    if user_result and user_result[0]:
                        initial_user_name = user_result[0]
                except Exception as e:
                    logger.debug(f"初回登録者情報取得エラー: {e}")
            
            if current_user_cd:
                try:
                    cresc_cursor.execute(
                        "SELECT name FROM cresc_data.ユーザー WHERE Code = ? AND isActive = 1",
                        (current_user_cd,)
                    )
                    user_result = cresc_cursor.fetchone()
                    if user_result and user_result[0]:
                        current_user_name = user_result[0]
                except Exception as e:
                    logger.debug(f"登録者情報取得エラー: {e}")
            
            # 表示内容決定
            display_content = "診：予約"
            if yoyaku_kbn == 1:
                display_content = "診：診察"
            elif yoyaku_kbn == 2:
                display_content = f"診：{yoyaku_waku or '予約'}"
            elif yoyaku_kbn == 3:
                # 同じ時間にKbn=1があるかチェック
                try:
                    wrb_cursor.execute(
                        "SELECT COUNT(*) FROM view_wrb_table_予約.reki WHERE 診療x予約日 = ? AND 診療x予約時刻 = ? AND 予約Kbn = 1 AND delete = 0",
                        (date, yoyaku_time)
                    )
                    count = wrb_cursor.fetchone()[0]
                    if count > 0:
                        display_content = f"診：{yoyaku_waku or '予約'}"
                    else:
                        display_content = "診：診察"
                except Exception as e:
                    display_content = f"診：{yoyaku_waku or '予約'}"
            
            # 時刻フォーマット
            time_str = ""
            if yoyaku_time:
                if isinstance(yoyaku_time, str):
                    time_str = yoyaku_time[:5]
                else:
                    time_str = yoyaku_time.strftime("%H:%M")
            
            end_time_str = ""
            if end_time:
                if isinstance(end_time, str):
                    end_time_str = end_time[:5]
                else:
                    end_time_str = end_time.strftime("%H:%M")
            
            # 日時フォーマット
            initial_date_str = ""
            if initial_date:
                if isinstance(initial_date, datetime):
                    initial_date_str = initial_date.strftime("%Y-%m-%d %H:%M")
                else:
                    initial_date_str = str(initial_date)
            
            current_date_str = ""
            if current_date:
                if isinstance(current_date, datetime):
                    current_date_str = current_date.strftime("%Y-%m-%d %H:%M")
                else:
                    current_date_str = str(current_date)
            
            appointment = {
                'id': appointment_id,
                'patientCd': patient_cd,
                'patientInfo': {
                    'name': patient_name,
                    'gender': patient_gender,
                    'birthDate': patient_birth
                },
                'appointmentDate': str(yoyaku_date) if yoyaku_date else date,
                'appointmentTime': time_str,
                'endTime': end_time_str,
                'displayContent': display_content,
                'comment': comment or '',
                'commentDetail': comment_detail or '',
                'initialUser': {
                    'name': initial_user_name,
                    'code': str(initial_user_cd) if initial_user_cd else ''
                },
                'currentUser': {
                    'name': current_user_name,
                    'code': str(current_user_cd) if current_user_cd else ''
                },
                'initialRegDate': initial_date_str,
                'currentRegDate': current_date_str,
                'displayOrder': display_order or 0
            }
            
            appointments.append(appointment)
        
        wrb_cursor.close()
        wrb_conn.close()
        cresc_cursor.close()
        cresc_conn.close()
        
        logger.info(f"予約取得完了: {len(appointments)}件")
        
        return jsonify({
            "appointments": appointments,
            "date": date,
            "total": len(appointments)
        })
        
    except Exception as e:
        logger.error(f"予約取得エラー: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    logger.info(f"予約サーバー起動 (ポート: {port})")
    app.run(host='0.0.0.0', port=port, debug=True)