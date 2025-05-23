# python/server.py
from flask import Flask
from flask_cors import CORS
import logging
import sys

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_app():
    """Flaskアプリケーションファクトリ"""
    app = Flask(__name__)
    CORS(app)
    
    # 各機能のブループリントを登録
    try:
        from modules.health import health_bp
        from modules.appointment import appointment_bp
        from modules.patient_search import patient_search_bp
        from modules.patient_records import patient_records_bp
        from modules.next_record import next_record_bp
        
        app.register_blueprint(health_bp, url_prefix='/api')
        app.register_blueprint(appointment_bp, url_prefix='/api')
        app.register_blueprint(patient_search_bp, url_prefix='/api')
        app.register_blueprint(patient_records_bp, url_prefix='/api')
        app.register_blueprint(next_record_bp, url_prefix='/api')
        
        logger.info("全モジュールが正常に読み込まれました")
        
        # 登録されたルートを表示
        for rule in app.url_map.iter_rules():
            logger.info(f"登録されたルート: {rule.rule} -> {rule.endpoint}")
        
    except ImportError as e:
        logger.error(f"モジュールのインポートエラー: {e}")
        # エラー時は基本的なエラーエンドポイントのみ作成
        create_error_endpoints(app, str(e))
    
    return app

def create_error_endpoints(app, error_message):
    """エラー用のエンドポイント"""
    from flask import jsonify
    
    @app.route('/api/health', methods=['GET'])
    def health_check_error():
        return jsonify({
            "status": "error", 
            "message": f"サーバー設定エラー: {error_message}",
            "mode": "error"
        }), 500
    
    @app.route('/api/appointments/<date>', methods=['GET'])
    def get_appointments_error(date):
        return jsonify({
            "error": f"予約システムが利用できません: {error_message}",
            "appointments": [],
            "date": date,
            "total": 0
        }), 500

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    logger.info(f"Python Flask サーバーを起動しています (ポート: {port})...")
    
    app = create_app()
    app.run(host='0.0.0.0', port=port, debug=True)