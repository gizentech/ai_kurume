# python/patient_search.py
import argparse
import json
import pyodbc
import sys

def format_patient(patient):
    """患者データを整形する"""
    try:
        patient_id = patient['ゲスト番号']
        # 患者IDが数値の場合、8桁のゼロ埋め文字列に変換
        if isinstance(patient_id, int):
            patient_id = f"{patient_id:08d}"
        elif isinstance(patient_id, str):
            patient_id = patient_id.zfill(8)
            
        # 生年月日の整形
        birth_date = patient.get('生年月日', '')
        if birth_date and len(str(birth_date)) == 8:
            birth_date = f"{birth_date[:4]}年{birth_date[4:6]}月{birth_date[6:8]}日"
            
        return {
            '患者ID': patient_id,
            '患者名': patient.get('漢字氏名', '不明'),
            '生年月日': birth_date,
            '性別': patient.get('性別', '不明')
        }
    except Exception as e:
        print(f"患者データの整形中にエラー: {e}", file=sys.stderr)
        return {
            '患者ID': '不明',
            '患者名': '不明',
            '生年月日': '不明',
            '性別': '不明'
        }

def search_patients(query):
    """患者を検索する"""
    try:
        # 接続情報
        driver_name = "InterSystems IRIS ODBC35"
        host = '172.16.2.3'
        port = '1972'
        cache_name = 'cresc-sora'
        username = 'soranomori'
        password = 'sora'
        
        # 接続文字列
        connection_string = (
            f"DRIVER={{{driver_name}}};"
            f"SERVER={host};"
            f"PORT={port};"
            f"DATABASE={cache_name};"
            f"UID={username};"
            f"PWD={password}"
        )
        
        # データベースに接続
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        
        # 検索クエリの作成 - IDや名前で検索可能に
        sql_query = """
            SELECT 
                ゲスト番号, 漢字氏名, 生年月日, 性別
            FROM 
                View_cresc_data.ゲスト基本情報
            WHERE 
                (ゲスト番号 LIKE ? OR 漢字氏名 LIKE ?)
            ORDER BY 
                ゲスト番号
            LIMIT 20
        """
        
        # ワイルドカード検索用にクエリを整形
        search_pattern = f"%{query}%"
        
        # クエリを実行
        cursor.execute(sql_query, (search_pattern, search_pattern))
        
        # 結果を取得
        patients = []
        columns = [column[0] for column in cursor.description]
        
        for row in cursor.fetchall():
            patient = dict(zip(columns, row))
            patients.append(format_patient(patient))
        
        # 接続を閉じる
        cursor.close()
        conn.close()
        
        return {"patients": patients}
    
    except Exception as e:
        print(f"患者検索中にエラー: {e}", file=sys.stderr)
        return {"error": str(e), "patients": []}

def main():
    parser = argparse.ArgumentParser(description='患者検索スクリプト')
    parser.add_argument('--query', required=True, help='検索クエリ')
    parser.add_argument('--output', required=True, help='出力ファイルパス')
    
    args = parser.parse_args()
    
    # 患者検索の実行
    result = search_patients(args.query)
    
    # 結果をJSONファイルに出力
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"結果を {args.output} に出力しました")

if __name__ == "__main__":
    main()