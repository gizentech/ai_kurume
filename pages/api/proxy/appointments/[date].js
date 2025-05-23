// pages/api/proxy/appointments/[date].js
export default async function handler(req, res) {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: '日付が指定されていません' });
  }
  
  try {
    const pythonServerUrl = process.env.PYTHON_SERVER_URL || 'http://localhost:8000';
    const apiUrl = `${pythonServerUrl}/api/appointments/${date}`;
    
    console.log('プロキシリクエスト:', apiUrl);
    
    // タイムアウト設定付きでfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('レスポンスステータス:', response.status);
    
    // レスポンステキストを取得
    const responseText = await response.text();
    console.log('レスポンステキスト:', responseText.substring(0, 500));
    
    // JSONかどうか確認
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      return res.status(500).json({
        error: 'Pythonサーバーから無効なレスポンス',
        details: responseText.substring(0, 200)
      });
    }
    
    if (!response.ok) {
      console.error('Pythonサーバーエラー:', response.status, data);
      return res.status(response.status).json({
        error: 'Pythonサーバーからエラーが返されました',
        status: response.status,
        details: data.error || data.message || 'Unknown error'
      });
    }
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('プロキシエラー:', error);
    
    if (error.name === 'AbortError') {
      return res.status(408).json({
        error: 'Pythonサーバーへのリクエストがタイムアウトしました'
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Pythonサーバーに接続できません。サーバーが起動しているか確認してください。'
      });
    }
    
    return res.status(500).json({
      error: 'プロキシサーバーエラー',
      details: error.message
    });
  }
}