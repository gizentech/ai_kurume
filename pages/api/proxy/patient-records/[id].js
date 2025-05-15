// pages/api/proxy/patient-records/[id].js
export default async function handler(req, res) {
  const { id } = req.query;

  try {
    console.log(`患者記録を取得します: ID = ${id}`);
    
    // 実際のデータ取得ロジック（例: Pythonバックエンドからフェッチ）
    let response;
    try {
      // データ取得 URL を環境変数から取得（または固定値）
      const apiUrl = process.env.PATIENT_RECORDS_API_URL || 'http://localhost:8000';
      response = await fetch(`${apiUrl}/api/patient-records/${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`バックエンドAPIエラー: ${response.status}`, errorText);
        return res.status(response.status).json({ 
          error: `データ取得に失敗しました: ${response.status}`,
          details: errorText
        });
      }
    } catch (fetchError) {
      console.error('バックエンドAPI接続エラー:', fetchError);
      return res.status(500).json({ 
        error: 'バックエンドサービスに接続できませんでした',
        details: fetchError.message
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