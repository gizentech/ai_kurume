// pages/api/patient-records-list/[id].js
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
    
    console.log(`Attempting to fetch patient record list for ID: ${patientId}`);
    
    // Get database connection
    connection = await getDbConnection();
    
    // Query for patient record list
    // Adjust this query based on your actual database schema
    const recordsListQuery = `
      SELECT 
        日付 AS 'date',
        診療科 AS 'department',
        担当医 AS 'doctor',
        診断 AS 'diagnosis'
      FROM 
        View_cresc_data.カルテ
      WHERE
        ゲスト番号 = '${patientId}'
      ORDER BY
        日付 DESC
    `;
    
    // Execute the query
    const recordsList = await connection.query(recordsListQuery);
    
    console.log(`Found ${recordsList.length} record entries for patient ${patientId}`);
    
    return res.status(200).json({ records: recordsList });
  } catch (error) {
    console.error('Error fetching patient record list:', error);
    return res.status(500).json({
      error: '診療記録リストの取得に失敗しました: ' + error.message,
      records: []
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