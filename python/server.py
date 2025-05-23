# python/server.py
from flask import Flask
from flask_cors import CORS
import logging
import sys

# 各機能モジュールをインポート
from modules.patient_search import patient_search_bp
from modules.patient_records import patient_records_bp
from modules.next_record import next_record_bp
from modules.appointment import appointment_bp
from modules.health import health_bp

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_app():
    """Flaskアプリケーションファクトリ"""
    app = Flask(__name__)
    CORS(app)
    
    # 各機能のブループリントを登録
    app.register_blueprint(patient_search_bp, url_prefix='/api')
    app.register_blueprint(patient_records_bp, url_prefix='/api')
    app.register_blueprint(next_record_bp, url_prefix='/api')
    app.register_blueprint(appointment_bp, url_prefix='/api')
    app.register_blueprint(health_bp, url_prefix='/api')
    
    return app

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    logger.info(f"Python Flask サーバーを起動しています (ポート: {port})...")
    
    app = create_app()
    app.run(host='0.0.0.0', port=port, debug=True)