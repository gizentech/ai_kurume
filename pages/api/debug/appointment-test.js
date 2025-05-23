// pages/api/debug/appointment-test.js
export default async function handler(req, res) {
  const { date } = req.query;
  const testDate = date || '2025-05-26';
  
  try {
    console.log('デバッグ: 予約APIテスト開始');
    
    // 1. Pythonサーバーの接続テスト
    const healthUrl = 'http://localhost:8000/api/health';
    console.log('ヘルスチェック:', healthUrl);
    
    const healthResponse = await fetch(healthUrl);
    if (!healthResponse.ok) {
      return res.status(500).json({
        error: 'Pythonサーバーに接続できません',
        status: healthResponse.status,
        url: healthUrl
      });
    }
    
    const healthData = await healthResponse.json();
    
    // 2. 予約APIテスト
    const appointmentUrl = `http://localhost:8000/api/appointments/${testDate}`;
    console.log('予約API:', appointmentUrl);
    
    const appointmentResponse = await fetch(appointmentUrl);
    
    if (!appointmentResponse.ok) {
      const errorText = await appointmentResponse.text();
      return res.status(500).json({
        error: '予約APIにアクセスできません',
        status: appointmentResponse.status,
        url: appointmentUrl,
        response: errorText.substring(0, 500)
      });
    }
    
    const appointmentData = await appointmentResponse.json();
    
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
    console.error('デバッグテストエラー:', error);
    return res.status(500).json({
      error: 'デバッグテスト中にエラーが発生',
      details: error.message,
      stack: error.stack
    });
  }
}