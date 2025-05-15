// pages/api/proxy/search-patients.js の修正
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: '検索クエリが必要です' });
  }

  try {
    // Python サーバーの URL - npmを含まないように修正
    const pythonServerUrl = process.env.PYTHON_SERVER_URL || 'http://localhost:8000';
    
    // 正しいURL形成（末尾のスラッシュに注意）
    const apiUrl = `${pythonServerUrl}/api/search-patients?query=${encodeURIComponent(query)}`;
    console.log('リクエストURL:', apiUrl);
    
    // Python API にリクエストを転送
    const response = await fetch(apiUrl);
    
    // レスポンスをそのまま返す
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Python サーバー接続エラー:', error);
    return res.status(500).json({ 
      error: 'Python サーバーへの接続に失敗しました',
      details: error.message
    });
  }
}