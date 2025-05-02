// pages/api/patient-search.js
import { getDbConnection } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;
  try {
    console.log("Connecting to ODBC database for patient search");
    
    // Get database connection
    connection = await getDbConnection();
    
    // Query patient information
    const query = `
      SELECT 
        ゲスト番号 AS '患者ID',
        漢字氏名 AS '患者名',
        生年月日 AS '生年月日',
        性別 AS '性別'
      FROM 
        View_cresc_data.ゲスト基本情報
    `;
    
    // Execute the query
    const result = await connection.query(query);
    
    // Format the patient data
    const patients = result.map(patient => {
      // Ensure patient ID is 8 digits (padding with zeros)
      const patientId = patient['患者ID'].toString().padStart(8, '0');
      
      // Format date if needed (assuming YYYYMMDD format in the database)
      let birthDate = patient['生年月日'];
      if (birthDate && typeof birthDate === 'string' && birthDate.length === 8) {
        birthDate = `${birthDate.substring(0, 4)}年${birthDate.substring(4, 6)}月${birthDate.substring(6, 8)}日`;
      }
      
      return {
        '患者ID': patientId,
        '患者名': patient['患者名'],
        '生年月日': birthDate,
        '性別': patient['性別']
      };
    });
    
    console.log(`Found ${patients.length} patients in database`);
    
    return res.status(200).json({ patients });
  } catch (error) {
    console.error('Error searching patients:', error);
    return res.status(500).json({ 
      patients: [],
      error: '患者検索に失敗しました: ' + error.message
    });
  } finally {
    // Close the connection in the finally block to ensure it happens even if there's an error
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