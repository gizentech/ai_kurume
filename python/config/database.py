# python/config/database.py
import pyodbc
import logging

logger = logging.getLogger(__name__)

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