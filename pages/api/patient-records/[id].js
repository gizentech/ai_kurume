// pages/api/patient-records/[id].js
import { getDbConnection } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: '患者IDが必要です' });
    }
    
    // Ensure patient ID is 8 digits (padding with zeros)
    const patientId = id.toString().padStart(8, '0');
    
    console.log(`Attempting to fetch patient records for ID: ${patientId}`);
    
    // Get database connection
    connection = await getDbConnection();
    
    // Query patient information
    const patientQuery = `
      SELECT 
        ゲスト番号 AS '患者ID',
        漢字氏名 AS '患者名',
        生年月日 AS '生年月日',
        性別 AS '性別'
      FROM 
        View_cresc_data.ゲスト基本情報
      WHERE
        ゲスト番号 = '${patientId}'
    `;
    
    // Execute the query
    const patientResult = await connection.query(patientQuery);
    
    if (patientResult.length === 0) {
      return res.status(200).json({
        error: '患者情報が見つかりません',
        records: '',
        patientName: ''
      });
    }
    
    const patientInfo = patientResult[0];
    
    // Query for patient records
    // Note: You'll need to adjust this based on your actual database structure
    const recordsQuery = `
      SELECT 
        カルテ.ゲスト番号 AS '患者ID',
        カルテ.日付 AS '日付',
        カルテ.診療科 AS '診療科',
        カルテ.担当医 AS '担当医',
        カルテ.主訴 AS '主訴',
        カルテ.現病歴 AS '現病歴',
        カルテ.診察所見 AS '診察所見',
        カルテ.診断 AS '診断',
        カルテ.処置 AS '処置・指導・処方'
      FROM 
        View_cresc_data.カルテ
      WHERE
        ゲスト番号 = '${patientId}'
      ORDER BY
        日付 DESC
    `;
    
    // Execute the records query
    const patientRecords = await connection.query(recordsQuery);
    
    console.log(`Found ${patientRecords.length} records for patient ${patientId}`);
    
    if (patientRecords.length === 0) {
      return res.status(200).json({
        error: '該当する診療記録が見つかりません',
        records: '',
        patientName: patientInfo['患者名']
      });
    }
    
    // Format the records similar to the CSV approach
    const formattedRecords = patientRecords.map(record => {
      return `日付：${record['日付'] || ''}
診療科：${record['診療科'] || ''}
担当医：${record['担当医'] || ''}
主訴：${record['主訴'] || ''}
現病歴：${record['現病歴'] || ''}
診察所見：${record['診察所見'] || ''}
診断：${record['診断'] || '記録なし'}
処置・指導・処方：${record['処置・指導・処方'] || '記録なし'}`;
    }).join('\n\n---\n\n');
    
    console.log("Successfully formatted patient records");
    
    return res.status(200).json({
      records: formattedRecords,
      patientName: patientInfo['患者名']
    });
  } catch (error) {
    console.error('Error reading patient records:', error);
    return res.status(500).json({
      error: '患者記録の取得に失敗しました: ' + error.message,
      records: '',
      patientName: ''
    });
  } finally {
    // Close the connection
    if (connection) {
      try {
        await connection.close();
        console.log("Database connection closed");
      } catch (err) {
        console.error("Error closing database connection:", err);
      }
    }
  }
}