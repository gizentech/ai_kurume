# python/modules/health.py
from flask import Blueprint, jsonify
import logging
from config.database import get_db_connection

logger = logging.getLogger(__name__)
health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
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
        try:
            wrb_conn = get_db_connection('wrb-sora')
            wrb_cursor = wrb_conn.cursor()
            
            wrb_cursor.execute("SELECT 1 as test")
            wrb_result = wrb_cursor.fetchone()
            
            wrb_cursor.execute("SELECT COUNT(*) FROM view_wrb_table_予約.reki WHERE delete = 0")
            appointment_count = wrb_cursor.fetchone()[0]
            
            wrb_cursor.close() 
            wrb_conn.close()
            
            warabee_status = "成功"
        except Exception as wrb_error:
            logger.warning(f"Warabee接続エラー: {wrb_error}")
            appointment_count = 0
            warabee_status = f"失敗: {str(wrb_error)}"
        
        return jsonify({
            "status": "ok", 
            "message": "Python サーバーは正常に動作しています",
            "cresc_db_connection": "成功",
            "warabee_db_connection": warabee_status,
            "patient_count": patient_count,
            "appointment_count": appointment_count,
            "cresc_test_result": cresc_result[0] if cresc_result else None
        })
    except Exception as e:
        logger.error(f"ヘルスチェックエラー: {e}")
        return jsonify({
            "status": "error", 
            "message": f"データベース接続エラー: {str(e)}",
            "db_connection": "失敗"
        })