// lib/db.js
import odbc from 'odbc';

export async function getDbConnection() {
  // 接続文字列の設定
  const connectionString = 'DSN=Cresc-Sora;UID=soranomori;PWD=sora;SERVER=172.21.2.3;PORT=1972;DATABASE=cresc-sora';
  
  try {
    // 接続を作成して返す
    return await odbc.connect(connectionString);
  } catch (error) {
    console.error('データベース接続エラー:', error);
    throw new Error(`データベースへの接続に失敗しました: ${error.message}`);
  }
}