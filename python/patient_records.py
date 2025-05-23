from flask import Blueprint, request, jsonify
import logging
from config.database import get_db_connection

logger = logging.getLogger(__name__)
patient_records_bp = Blueprint('patient_records', __name__)

@patient_records_bp.route('/patient-records/<patient_id>', methods=['GET'])
def get_patient_records(patient_id):
    try:
        logger.info(f"患者記録取得: 患者ID = {patient_id}")
        
        if patient_id.isdigit():
            patient_id = patient_id.zfill(8)
        
        conn = get_db_connection('cresc-sora')
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
            return jsonify({
                "error": "患者情報が見つかりません",
                "records": "",
                "patientName": ""
            })
        
        patient_columns = [column[0] for column in cursor.description]
        patient = dict(zip(patient_columns, patient_row))
        
        # 生年月日の整形
        birth_date = patient.get('生年月日', '')
        if birth_date and len(str(birth_date)) == 8:
            birth_date_str = str(birth_date)
            birth_date = f"{birth_date_str[:4]}年{birth_date_str[4:6]}月{birth_date_str[6:8]}日"
        
        cursor.close()
        conn.close()
        
        result = {
            "records": "診療記録を取得中です...\n\n---\n\n簡易実装版",
            "patientName": patient.get('漢字氏名', ''),
            "birthDate": birth_date,
            "gender": patient.get('性別', '')
        }
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"診療記録取得エラー: {e}")
        return jsonify({
            "error": f"診療記録の取得に失敗しました: {str(e)}",
            "records": "",
            "patientName": ""
        })