// pages/api/proxy/search-patients.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // クエリがない場合はデフォルト値を設定
  let { query } = req.query;
  
  // クエリがない場合または短すぎる場合はデフォルト値を使用
  if (!query || query.length < 2) {
    query = "患者"; // デフォルトの検索クエリ
  }
  
  try {
    // Python サーバーの URL
    const pythonServerUrl = process.env.PYTHON_SERVER_URL || 'http://localhost:8000';
    
    // 正しいURL形成
    const apiUrl = `${pythonServerUrl}/api/search-patients?query=${encodeURIComponent(query)}`;
    console.log('リクエストURL:', apiUrl);
    
    // リクエストにタイムアウトを設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒でタイムアウト
    
    try {
      // Python API にリクエストを転送
      const response = await fetch(apiUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // タイムアウトをクリア
      
      // レスポンスをそのまま返す
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (fetchError) {
      console.error('Python サーバーフェッチエラー:', fetchError);
      
      // エラーメッセージをより具体的に
      let errorMessage = 'Python サーバーへの接続に失敗しました';
      if (fetchError.name === 'AbortError') {
        errorMessage = 'Python サーバーからの応答がタイムアウトしました。サーバーが実行中か確認してください。';
      } else if (fetchError.code === 'ECONNREFUSED') {
        errorMessage = 'Python サーバーへの接続が拒否されました。サーバーが起動しているか確認してください。';
      } else {
        errorMessage = `Python サーバーとの通信エラー: ${fetchError.message}`;
      }
      
      return res.status(503).json({ 
        error: errorMessage,
        details: fetchError.message
      });
    }
  } catch (error) {
    console.error('Python サーバー接続エラー:', error);
    return res.status(500).json({ 
      error: 'Python サーバーへの接続に失敗しました',
      details: error.message
    });
  }
}