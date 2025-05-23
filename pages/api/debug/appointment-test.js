// pages/api/debug/appointment-test.js
export default async function handler(req, res) {
  const { date } = req.query;
  const testDate = date || '2025-05-26';
  
  try {
    console.log('デバッグ: 予約APIテスト開始');
    
    // 1. Pythonサーバーの接続テスト
    const healthUrl = process.env.PYTHON_SERVER_URL ? 
      `${process.env.PYTHON_SERVER_URL}/api/health` : 
      'http://localhost:8000/api/health';
    
    console.log('ヘルスチェックURL:', healthUrl);
    
    let healthData;
    try {
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeout: 5000
      });
      
      console.log('ヘルスチェックレスポンス:', healthResponse.status);
      
      if (!healthResponse.ok) {
        const errorText = await healthResponse.text();
        return res.status(500).json({
          error: 'Pythonサーバーに接続できません',
          status: healthResponse.status,
          url: healthUrl,
          response: errorText.substring(0, 500)
        });
      }
      
      healthData = await healthResponse.json();
      console.log('ヘルスチェック成功:', healthData);
      
    } catch (healthError) {
      console.error('ヘルスチェックエラー:', healthError);
      return res.status(500).json({
        error: 'Pythonサーバーへの接続に失敗',
        details: healthError.message,
        url: healthUrl
      });
    }
    
    // 2. 予約APIテスト
    const appointmentUrl = process.env.PYTHON_SERVER_URL ? 
      `${process.env.PYTHON_SERVER_URL}/api/appointments/${testDate}` :
      `http://localhost:8000/api/appointments/${testDate}`;
    
    console.log('予約API URL:', appointmentUrl);
    
    let appointmentData;
    try {
      const appointmentResponse = await fetch(appointmentUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log('予約APIレスポンス:', appointmentResponse.status);
      
      if (!appointmentResponse.ok) {
        const errorText = await appointmentResponse.text();
        return res.status(500).json({
          error: '予約APIにアクセスできません',
          status: appointmentResponse.status,
          url: appointmentUrl,
          response: errorText.substring(0, 500)
        });
      }
      
      appointmentData = await appointmentResponse.json();
      console.log('予約API成功:', appointmentData);
      
    } catch (appointmentError) {
      console.error('予約APIエラー:', appointmentError);
      return res.status(500).json({
        error: '予約APIへの接続に失敗',
        details: appointmentError.message,
        url: appointmentUrl
      });
    }
    
    return res.status(200).json({
      success: true,
      health: healthData,
      appointments: appointmentData,
      testDate: testDate,
      urls: {
        health: healthUrl,
        appointments: appointmentUrl
      }
    });
    
  } catch (error) {
    console.error('デバッグテスト全体エラー:', error);
    return res.status(500).json({
      error: 'デバッグテスト中にエラーが発生',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}