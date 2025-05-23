from flask import Blueprint, request, jsonify
import logging
from config.database import get_db_connection

logger = logging.getLogger(__name__)
patient_search_bp = Blueprint('patient_search', __name__)

@patient_search_bp.route('/search-patients', methods=['GET'])
def search_patients():
    try:
        query = request.args.get('query', '')
        
        if not query or len(query) < 2:
            return jsonify({"error": "検索クエリは2文字以上必要です", "patients": []})
        
        logger.info(f"患者検索: クエリ = {query}")
        
        conn = get_db_connection('cresc-sora')
        cursor = conn.cursor()
        
        sql_query = """
            SELECT TOP 20
                ゲスト番号, 漢字氏名, 生年月日, 性別
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