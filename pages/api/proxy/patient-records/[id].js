// pages/api/proxy/patient-records/[id].js
export default async function handler(req, res) {
  const { id } = req.query;

  try {
    console.log(`患者記録を取得します: ID = ${id}`);
    
    // Pythonバックエンドからフェッチ
    const apiUrl = process.env.PATIENT_RECORDS_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/patient-records/${id}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`バックエンドAPIエラー: ${response.status}`, errorText);
      return res.status(response.status).json({ 
        error: `データ取得に失敗しました: ${response.status}`,
        details: errorText
      });
    }
    
    // JSONデータをクライアントに転送
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('患者記録取得処理エラー:', error);
    return res.status(500).json({ 
      error: '患者記録の取得に失敗しました',
      details: error.message
    });
  }
}