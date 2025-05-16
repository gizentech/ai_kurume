// pages/api/patient-records/[id].js
import { getPatientRecords } from '../../../lib/csv-db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: '患者IDが必要です' });
    }
    
    // 患者IDが数値の場合は8桁にゼロ埋め
    const patientId = id.toString().padStart(8, '0');
    
    console.log(`患者ID ${patientId} の記録を取得しています`);
    
    // 患者記録を取得
    const result = await getPatientRecords(patientId);
    
    if (result.error) {
      console.log(`エラー: ${result.error}`);
      return res.status(200).json(result); // エラーでも200を返す既存の動作を維持
    }
    
    console.log(`患者 ${patientId} の記録を正常に取得しました`);
    return res.status(200).json(result);
  } catch (error) {
    console.error('患者記録取得エラー:', error);
    return res.status(500).json({
      error: '患者記録の取得に失敗しました: ' + error.message,
      records: '',
      patientName: ''
    });
  }
}