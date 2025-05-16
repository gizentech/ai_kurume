// pages/api/patient-search.js
import { searchPatients } from '../../lib/csv-db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("CSVデータから患者情報を取得しています");
    const query = req.query.query || '';
    
    // 患者データ取得を試みる
    const patients = await searchPatients(query);
    
    console.log(`${patients.length}人の患者が見つかりました`);
    
    // 患者データを整形
    const formattedPatients = patients.map(patient => {
      // 患者IDを8桁にゼロ埋め
      const patientId = patient['患者ID'].toString().padStart(8, '0');
      
      return {
        '患者ID': patientId,
        '患者名': patient['患者名'],
        '生年月日': patient['生年月日'],
        '性別': patient['性別']
      };
    });
    
    return res.status(200).json({ patients: formattedPatients });
  } catch (error) {
    console.error('患者検索エラー:', error);
    
    // エラーが発生した場合は空の配列を返し、エラー情報を含める
    return res.status(500).json({ 
      patients: [],
      error: 'データベース接続に失敗しました。システム管理者にお問い合わせください。',
      details: error.message
    });
  }
}