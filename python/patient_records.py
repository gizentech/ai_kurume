# python/patient_records.py
import argparse
import json
import pyodbc
import sys
from datetime import datetime

def format_record(record):
    """診療記録を整形する"""
    try:
        # 日付の整形
        date = record.get('日付', '')
        if date and isinstance(date, str) and len(date) >= 8:
            try:
                date_obj = datetime.strptime(date[:8], "%Y%m%d")
                date = date_obj.strftime("%Y年%m月%d日")
            except:
                pass  # 変換に失敗した場合は元の値を使用
        
        # フィールドが存在しない場合は空文字で初期化
        for field in ['診療科', '担当医', '主訴', '現病歴', '診察所見', '診断', '処置']:
            if field not in record:
                record[field] = ''
                
        return record
    except Exception as e:
        print(f"記録データの整形中にエラー: {e}", file=sys.stderr)
        return record

def get_patient_info(patient_id, cursor):
    """患者情報を取得する"""
    try:
        # 患者情報のクエリ
        patient_query = """
            SELECT 
                ゲスト番号, 漢字氏名, 生年月日, 性別
            FROM 
                View_cresc_data.ゲスト基本情報
            WHERE 
                ゲスト番号 = ?
        """
        
        cursor.execute(patient_query, (patient_id,))
        
        patient_row = cursor.fetchone()
        if not patient_row:
            return None
        
        columns = [column[0] for column in cursor.description]
        patient = dict(zip(columns, patient_row))
        
        # 生年月日の整形
        birth_date = patient.get('生年月日', '')
        if birth_date and len(str(birth_date)) == 8:
            birth_date = f"{birth_date[:4]}年{birth_date[4:6]}月{birth_date[6:8]}日"
        
        return {
            'patientId': patient_id,
            'patientName': patient.get('漢字氏名', ''),
            'birthDate': birth_date,
            'gender': patient.get('性別', '')
        }
    
    except Exception as e:
        print(f"患者情報取得中にエラー: {e}", file=sys.stderr)
        return None

def get_patient_records(patient_id):
    """患者の診療記録を取得する"""
    try:
        # 接続情報
        driver_name = "InterSystems IRIS ODBC35"
        host = '172.21.2.3'
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
        
        # 患者情報の取得
        patient_info = get_patient_info(patient_id, cursor)
        
        if not patient_info:
            return {
                "error": "患者情報が見つかりません",
                "records": "",
                "patientName": ""
            }
        
        # 診療記録のクエリ
        records_query = """
            SELECT 
                カルテ.ゲスト番号 AS '患者ID',
                カルテ.日付 AS '日付',
                カルテ.診療科 AS '診療科',
                カルテ.担当医 AS '担当医',
                カルテ.主訴 AS '主訴',
                カルテ.現病歴 AS '現病歴',
                カルテ.診察所見 AS '診察所見',
                カルテ.診断 AS '診断',
                カルテ.処置 AS '処置・指導・処方'
            FROM 
                View_cresc_data.カルテ
            WHERE
                ゲスト番号 = ?
            ORDER BY
                日付 DESC
        """
        
        cursor.execute(records_query, (patient_id,))
        
        records = []
        columns = [column[0] for column in cursor.description]
        
        for row in cursor.fetchall():
            record = dict(zip(columns, row))
            records.append(format_record(record))
        
        # 接続を閉じる
        cursor.close()
        conn.close()
        
        if not records:
            return {
                "error": "該当する診療記録が見つかりません",
                "records": "",
                "patientName": patient_info.get('patientName', '')
            }
        
        # 記録をテキスト形式にフォーマット
        formatted_records = []
        
        for record in records:
            record_text = f"日付：{record.get('日付', '')}\n"
            record_text += f"診療科：{record.get('診療科', '')}\n"
            record_text += f"担当医：{record.get('担当医', '')}\n"
            record_text += f"主訴：{record.get('主訴', '')}\n"
            record_text += f"現病歴：{record.get('現病歴', '')}\n"
            record_text += f"診察所見：{record.get('診察所見', '')}\n"
            record_text += f"診断：{record.get('診断', '記録なし')}\n"
            record_text += f"処置・指導・処方：{record.get('処置・指導・処方', '記録なし')}"
            
            formatted_records.append(record_text)
        
        # 結果の作成
        result = {
            "records": "\n\n---\n\n".join(formatted_records),
            "patientName": patient_info.get('patientName', ''),
            "birthDate": patient_info.get('birthDate', ''),
            "gender": patient_info.get('gender', '')
        }
        
        return result
    
    except Exception as e:
        print(f"診療記録取得中にエラー: {e}", file=sys.stderr)
        return {
            "error": f"診療記録の取得に失敗しました: {str(e)}",
            "records": "",
            "patientName": ""
        }

def main():
    parser = argparse.ArgumentParser(description='患者の診療記録取得スクリプト')
    parser.add_argument('--patient_id', required=True, help='患者ID')
    parser.add_argument('--output', required=True, help='出力ファイルパス')
    
    args = parser.parse_args()
    
    # 患者IDが数値のみの場合、ゼロ埋めを行う
    patient_id = args.patient_id
    if patient_id.isdigit():
        patient_id = patient_id.zfill(8)
    
    # 診療記録の取得
    result = get_patient_records(patient_id)
    
    # 結果をJSONファイルに出力
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"結果を {args.output} に出力しました")

if __name__ == "__main__":
    main()