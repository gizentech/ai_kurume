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
        from modules.patient_search import patient_search_bp
        from modules.patient_records import patient_records_bp
        from modules.next_record import next_record_bp
        from modules.appointment import appointment_bp
        from modules.health import health_bp
        
        app.register_blueprint(patient_search_bp, url_prefix='/api')
        app.register_blueprint(patient_records_bp, url_prefix='/api')
        app.register_blueprint(next_record_bp, url_prefix='/api')
        app.register_blueprint(appointment_bp, url_prefix='/api')
        app.register_blueprint(health_bp, url_prefix='/api')
        
        logger.info("全モジュールが正常に読み込まれました")
        
    except ImportError as e:
        logger.error(f"モジュールのインポートエラー: {e}")
        # フォールバック：基本的なエンドポイントのみ作成
        create_fallback_endpoints(app)
    
    return app

def create_fallback_endpoints(app):
    """フォールバック用の基本エンドポイント"""
    from flask import jsonify
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "ok", 
            "message": "フォールバックモードで動作中",
            "mode": "fallback"
        })
    
    @app.route('/api/appointments/<date>', methods=['GET'])
    def get_appointments_fallback(date):
        # デモデータを返す
        demo_appointments = [
            {
                'id': 1,
                'patientCd': '00000001',
                'patientInfo': {
                    "name": "テスト患者1",
                    "gender": "女",
                    "birthDate": "1990年01月01日"
                },
                'appointmentDate': date,
                'appointmentTime': "09:00",
                'endTime': "09:30",
                'displayContent': "診：診察",
                'comment': "デモデータ",
                'commentDetail': "",
                'initialUser': {"name": "システム", "code": "SYS"},
                'currentUser': {"name": "システム", "code": "SYS"},
                'initialRegDate': f"{date} 08:00",
                'currentRegDate': f"{date} 08:00",
                'displayOrder': 1
            }
        ]
        
        return jsonify({
            "appointments": demo_appointments,
            "date": date,
            "total": len(demo_appointments),
            "note": "フォールバックモードのデモデータです"
        })

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    logger.info(f"Python Flask サーバーを起動しています (ポート: {port})...")
    
    app = create_app()
    app.run(host='0.0.0.0', port=port, debug=True)