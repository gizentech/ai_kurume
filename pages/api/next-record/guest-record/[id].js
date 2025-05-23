
javascript// pages/api/next-record/guest-record/[id].js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ゲストIDが必要です' });
    }

    // Pythonバックエンドからデータを取得
    const apiUrl = process.env.PATIENT_RECORDS_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/next-record/guest-record/${id}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`バックエンドAPIエラー: ${response.status}`, errorText);
      return res.status(response.status).json({ 
        error: `データ取得に失敗しました: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('ゲスト記録取得処理エラー:', error);
    return res.status(500).json({ 
      error: 'ゲスト記録の取得に失敗しました', details: error.message
   });
 }
}