// pages/api/patient-records/[id].js
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: '患者IDが必要です' });
    }
    
    console.log(`Attempting to fetch patient records for ID: ${id}`);
    
    // 患者情報CSVファイルの読み込み - ファイル名を更新
    const patientInfoPath = path.join(process.cwd(), 'public', 'data', 'patient_info.csv');
    console.log("Patient info CSV path:", patientInfoPath);
    
    // ファイルが存在するか確認
    if (!fs.existsSync(patientInfoPath)) {
      console.error("Patient info CSV file does not exist at path:", patientInfoPath);
      return res.status(200).json({ 
        error: '患者情報ファイルが見つかりません',
        records: '',
        patientName: '' 
      });
    }
    
    const patientInfoContent = fs.readFileSync(patientInfoPath, 'utf8');
    
    // CSVフォーマットを確認
    let patientInfoRecords;
    
    try {
      // ヘッダー行があると仮定してパース
      patientInfoRecords = parse(patientInfoContent, { 
        columns: true, 
        skip_empty_lines: true
      });
    } catch (parseError) {
      console.error("Error parsing CSV with headers, trying without headers:", parseError);
      
      // ヘッダーがない場合は手動でカラム名を指定
      patientInfoRecords = parse(patientInfoContent, { 
        columns: ['患者ID', '患者名', '生年月日', '性別'],
        skip_empty_lines: true,
        from_line: 1
      });
    }
    
    console.log("Patient info parsed records count:", patientInfoRecords.length);
    
    // 患者記録を検索
    const patientInfo = patientInfoRecords.find(record => record['患者ID'] === id);
    console.log("Found patient info:", patientInfo);
    
    if (!patientInfo) {
      return res.status(200).json({ 
        error: '患者情報が見つかりません',
        records: '',
        patientName: ''
      });
    }
    
    // 診療記録CSVファイルの読み込み - ファイル名を更新
    const recordsPath = path.join(process.cwd(), 'public', 'data', 'patient_record.csv');
    console.log("Patient records CSV path:", recordsPath);
    
    // ファイルが存在するか確認
    if (!fs.existsSync(recordsPath)) {
      console.error("Patient records CSV file does not exist at path:", recordsPath);
      return res.status(200).json({ 
        error: '診療記録ファイルが見つかりません',
        records: '',
        patientName: patientInfo['患者名'] 
      });
    }
    
    const recordsContent = fs.readFileSync(recordsPath, 'utf8');
    
    // CSVフォーマットを確認
    let allRecords;
    
    try {
      // ヘッダー行があると仮定してパース
      allRecords = parse(recordsContent, { 
        columns: true, 
        skip_empty_lines: true
      });
    } catch (parseError) {
      console.error("Error parsing CSV with headers, trying without headers:", parseError);
      
      // ヘッダーがない場合は手動でカラム名を指定 - 患者ID列を追加
      allRecords = parse(recordsContent, { 
        columns: ['患者ID', '日付', '診療科', '担当医', '主訴', '現病歴', '診察所見', '診断', '処置・指導・処方'],
        skip_empty_lines: true,
        from_line: 1
      });
    }
    
    console.log("Patient records parsed records count:", allRecords.length);
    
    // 患者IDでフィルタリング - 重要な修正
    const patientRecords = allRecords.filter(record => record['患者ID'] === id);
    
    console.log(`Filtered records for patient ${id}:`, patientRecords.length);
    
    if (patientRecords.length === 0) {
      return res.status(200).json({ 
        error: '該当する診療記録が見つかりません',
        records: '',
        patientName: patientInfo['患者名']
      });
    }
    
    // 診療記録を時系列順に整形
    const formattedRecords = patientRecords.map(record => {
      // レコードの各フィールドを取得（列名が不確かな場合に対応）
      const date = record['日付'] || '';
      const department = record['診療科'] || '';
      const doctor = record['担当医'] || '';
      const complaint = record['主訴'] || '';
      const history = record['現病歴'] || '';
      const findings = record['診察所見'] || '';
      const diagnosis = record['診断'] || '記録なし';
      const treatment = record['処置・指導・処方'] || '記録なし';
      
      return `日付：${date}
診療科：${department}
担当医：${doctor}
主訴：${complaint}
現病歴：${history}
診察所見：${findings}
診断：${diagnosis}
処置・指導・処方：${treatment}`;
    }).join('\n\n---\n\n');
    
    console.log("Successfully formatted patient records");
    
    return res.status(200).json({ 
      records: formattedRecords,
      patientName: patientInfo['患者名']
    });
  } catch (error) {
    console.error('Error reading patient records:', error);
    return res.status(200).json({ 
      error: '患者記録の取得に失敗しました: ' + error.message,
      records: '',
      patientName: ''
    });
  }
}