// pages/api/patient-search.js
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export default async function handler(req, res) {
 if (req.method !== 'GET') {
   return res.status(405).json({ error: 'Method not allowed' });
 }

 try {
   console.log("Attempting to read patient info CSV");
   
   // パスを確認
   const patientInfoPath = path.join(process.cwd(), 'public', 'data', 'patient_info_9999.csv');
   console.log("CSV path:", patientInfoPath);
   
   // ファイルが存在するか確認
   if (!fs.existsSync(patientInfoPath)) {
     console.error("CSV file does not exist at path:", patientInfoPath);
     return res.status(200).json({ patients: [] });
   }
   
   // CSVファイルを読み込む
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
   
   console.log("CSV parsed records count:", patientInfoRecords.length);
   
   // すべての患者記録をオートコンプリート用に返す
   return res.status(200).json({ patients: patientInfoRecords });
 } catch (error) {
   console.error('Error searching patients:', error);
   return res.status(200).json({ 
     patients: [],
     error: '患者検索に失敗しました: ' + error.message
   });
 }
}