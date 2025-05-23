# python/modules/appointment.py
from flask import Blueprint, request, jsonify
import logging
from datetime import datetime
from config.database import get_db_connection

logger = logging.getLogger(__name__)
appointment_bp = Blueprint('appointment', __name__)

@appointment_bp.route('/appointments/<date>', methods=['GET'])
def get_appointments_by_date(date):
    """指定日の予約一覧を取得"""
    try:
        logger.info(f"予約一覧取得: 日付 = {date}")
        
        # 日付形式の検証
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "日付形式が無効です"}), 400
        
        # Warabeeデータベースから予約情報を取得
        wrb_conn = get_db_connection('wrb-sora')
        wrb_cursor = wrb_conn.cursor()
        
        # CRESC-soraデータベースから患者・ユーザー情報を取得
        cresc_conn = get_db_connection('cresc-sora')
        cresc_cursor = cresc_conn.cursor()
        
        # 予約データを取得
        appointment_query = """
            SELECT 
                ID, patientCd, 予約Kbn, 診療x予約日, 診療x予約時刻, 診療x終了時刻,
                診療x予約項目, 予約枠, コメント, コメント詳細,
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
    """患者情報を取得（patientCd=ゲスト番号）"""
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
    """ユーザー情報を取得（Code=z初回登録者Cd, z登録者Cd）"""
    if not user_cd:
        return {"name": "不明", "code": ""}
    
    try:
        user_query = """
            SELECT name
            FROM cresc_data.ユーザー
            WHERE Code = ? AND isActive = 1
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
            return time_obj[:5]  # "HH:MM" のみ返す
        else:
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