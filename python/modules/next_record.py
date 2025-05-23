from flask import Blueprint, request, jsonify
import logging
from config.database import get_db_connection

logger = logging.getLogger(__name__)
next_record_bp = Blueprint('next_record', __name__)

@next_record_bp.route('/next-record/guest-list', methods=['POST'])
def get_guest_list():
    try:
        data = request.get_json()
        guest_ids = data.get('guestIds', [])
        
        if not guest_ids:
            return jsonify({"error": "ゲストIDリストが必要です", "guests": []})
        
        logger.info(f"ゲストリスト取得: {len(guest_ids)}件のゲストID")
        
        conn = get_db_connection('cresc-sora')
        cursor = conn.cursor()
        
        guests = []
        
        for guest_id in guest_ids[:5]:  # 最初の5件のみテスト
            try:
                guest_query = """
                    SELECT 
                        ゲスト番号, 漢字氏名, 生年月日, 性別
                    FROM 
                        view_cresc_data.ゲスト基本情報
                    WHERE 
                        ゲスト番号 = ?
                        AND isActive = 1
                        AND isDelete = 0
                """
                
                cursor.execute(guest_query, (guest_id,))
                guest_row = cursor.fetchone()
                
                if guest_row:
                    guest_columns = [column[0] for column in cursor.description]
                    guest = dict(zip(guest_columns, guest_row))
                    
                    # 生年月日の整形
                    birth_date = guest.get('生年月日', '')
                    if birth_date and len(str(birth_date)) == 8:
                        birth_date_str = str(birth_date)
                        birth_date = f"{birth_date_str[:4]}年{birth_date_str[4:6]}月{birth_date_str[6:8]}日"
                    
                    guest_info = {
                        'guestId': guest_id,
                        'guestName': guest.get('漢字氏名', ''),
                        'birthDate': birth_date,
                        'gender': guest.get('性別', ''),
                        'lastRecordDate': '2025年05月01日'  # 仮の値
                    }
                    guests.append(guest_info)
                    
            except Exception as e:
                logger.error(f"ゲストID {guest_id} の処理中にエラー: {e}")
                continue
        
        cursor.close()
        conn.close()
        
        logger.info(f"ゲストリスト: {len(guests)}件")
        return jsonify({"guests": guests})
        
    except Exception as e:
        logger.error(f"ゲストリスト取得エラー: {e}")
        return jsonify({"error": str(e), "guests": []})

@next_record_bp.route('/next-record/guest-record/<guest_id>', methods=['GET'])
def get_guest_record(guest_id):
    try:
        logger.info(f"ゲスト記録取得: ゲストID = {guest_id}")
        
        conn = get_db_connection('cresc-sora')
        cursor = conn.cursor()
        
        guest_query = """
            SELECT 
                ゲスト番号, 漢字氏名, 生年月日, 性別
            FROM 
                view_cresc_data.ゲスト基本情報
            WHERE 
                ゲスト番号 = ?
                AND isActive = 1
                AND isDelete = 0
        """
        
        cursor.execute(guest_query, (guest_id,))
        guest_row = cursor.fetchone()
        
        if not guest_row:
            cursor.close()
            conn.close()
            return jsonify({"error": "ゲストが見つかりません"})
        
        guest_columns = [column[0] for column in cursor.description]
        guest = dict(zip(guest_columns, guest_row))
        
        # 生年月日の整形
        birth_date = guest.get('生年月日', '')
        if birth_date and len(str(birth_date)) == 8:
            birth_date_str = str(birth_date)
            birth_date = f"{birth_date_str[:4]}年{birth_date_str[4:6]}月{birth_date_str[6:8]}日"
        
        guest_info = {
            'guestId': guest_id,
            'guestName': guest.get('漢字氏名', ''),
            'birthDate': birth_date,
            'gender': guest.get('性別', '')
        }
        
        # 仮のSOAPレコード
        last_record = {
            'date': '20250501090000',
            'Subject': 'テスト主訴',
            'Object': 'テスト客観的所見',
            'Assessment': 'テストアセスメント',
            'Plan': 'テストプラン'
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "guestInfo": guest_info,
            "lastRecord": last_record
        })
        
    except Exception as e:
        logger.error(f"ゲスト記録取得エラー: {e}")
        return jsonify({"error": str(e)})

@next_record_bp.route('/next-record/create', methods=['POST'])
def create_next_record():
    try:
        data = request.get_json()
        guest_id = data.get('guestId')
        record = data.get('record')
        
        if not guest_id or not record:
            return jsonify({"error": "ゲストIDと記録データが必要です"})
        
        logger.info(f"次回カルテ作成: ゲストID = {guest_id}")
        
        # JSONコンバーター形式で出力
        json_output = {
            "guestId": guest_id,
            "record": record,
            "created": "2025-05-23 13:50:00"
        }
        
        result = {
            "success": True,
            "message": "カルテが正常に作成されました",
            "jsonOutput": json_output
        }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"カルテ作成エラー: {e}")
        return jsonify({"error": str(e)})