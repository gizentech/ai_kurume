// pages/api/proxy/appointments/[...params].js
export default async function handler(req, res) {
  try {
    const { params } = req.query;
    const path = Array.isArray(params) ? params.join('/') : params;
    
    // PythonサーバーのURL
    const pythonServerUrl = process.env.PYTHON_SERVER_URL || 'http://localhost:8000';
    const apiUrl = `${pythonServerUrl}/api/appointments/${path}`;
    
    console.log('プロキシリクエスト:', apiUrl);
    
    // クエリパラメータがあれば追加
    const queryString = new URLSearchParams(req.query).toString();
    const fullUrl = queryString ? `${apiUrl}?${queryString}` : apiUrl;
    
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('予約プロキシエラー:', error);
    return res.status(500).json({ 
      error: 'プロキシサーバーエラー',
      details: error.message
    });
  }
}