
javascript// pages/api/next-record/create.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guestId, record } = req.body;

    if (!guestId || !record) {
      return res.status(400).json({ error: 'ゲストIDと記録データが必要です' });
    }

    // Pythonバックエンドでカルテ作成処理
    const apiUrl = process.env.PATIENT_RECORDS_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/next-record/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guestId, record }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`バックエンドAPIエラー: ${response.status}`, errorText);
      return res.status(response.status).json({ 
        error: `カルテ作成に失敗しました: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('カルテ作成処理エラー:', error);
    return res.status(500).json({ 
      error: 'カルテの作成に失敗しました',
      details: error.message
    });
  }
}