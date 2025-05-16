// lib/csv-db.js
// このファイルはPythonバックエンドへの橋渡し役のみを担当します

// サーバーサイドのfetchのために絶対URLが必要
const getApiBaseUrl = () => {
  // サーバーサイドの場合は環境変数から、なければデフォルト値
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  }
  // クライアントサイドの場合は現在のホストを使用
  return '';
};

// 患者検索関数
export const searchPatients = async (query = '') => {
  console.log("Python APIを使用した患者検索を実行");
  
  // クエリが2文字未満の場合はデフォルト値を使用
  if (!query || query.length < 2) {
    query = "患者"; // デフォルトの検索クエリ
  }
  
  try {
    // 絶対URLでAPIエンドポイントを構築
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/proxy/search-patients?query=${encodeURIComponent(query)}`;
    console.log("リクエストURL:", apiUrl);

    const response = await fetch(apiUrl);
    
    // エラーチェック
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || `APIエラー: ${response.status}`;
      } catch (e) {
        errorMessage = `APIエラー: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // エラーメッセージが含まれている場合
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.patients || [];
  } catch (error) {
    console.error("患者検索APIエラー:", error);
    // エラーをそのまま返して上位層で処理できるようにする
    throw error;
  }
};

// 患者記録取得関数
export const getPatientRecords = async (patientId) => {
  console.log(`Python APIを使用して患者ID ${patientId} の記録を取得`);
  
  try {
    // 絶対URLでAPIエンドポイントを構築
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/api/proxy/patient-records/${patientId}`;
    console.log("リクエストURL:", apiUrl);

    const response = await fetch(apiUrl);
    
    // JSONレスポンスの取得
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("JSONパースエラー:", jsonError);
      throw new Error("サーバーからの応答を解析できませんでした");
    }
    
    // エラーチェック
    if (!response.ok || data.error) {
      throw new Error(data.error || `APIエラー: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error("患者記録取得APIエラー:", error);
    return {
      error: "データベースに接続できませんでした。Pythonサーバーが起動しているか確認してください。" + error.message,
      records: '',
      patientName: ''
    };
  }
};