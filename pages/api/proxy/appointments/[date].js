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
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pythonサーバーエラー:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Pythonサーバーからエラーが返されました',
        status: response.status,
        details: errorText
      });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('プロキシエラー:', error);
    return res.status(500).json({
      error: 'プロキシサーバーエラー',
      details: error.message
    });
  }
}