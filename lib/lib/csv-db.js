// Create a new file: lib/csv-db.js

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Read and parse CSV files
function readCsvFile(filename) {
  const filePath = path.join(process.cwd(), 'public', 'data', filename);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });
}

// Patient search function
export async function searchPatients(query = '') {
  try {
    const patients = readCsvFile('patient_info.csv');
    
    if (!query) return patients;
    
    // Filter patients based on query
    return patients.filter(patient => 
      patient['患者ID'].includes(query) || 
      patient['患者名'].includes(query)
    );
  } catch (error) {
    console.error('Error reading patient data:', error);
    return [];
  }
}

// Get patient records function
export async function getPatientRecords(patientId) {
  try {
    const allRecords = readCsvFile('patient_record.csv');
    const patients = readCsvFile('patient_info.csv');
    
    // Find patient info
    const patientInfo = patients.find(p => p['患者ID'] === patientId);
    
    if (!patientInfo) {
      return {
        error: '患者情報が見つかりません',
        records: '',
        patientName: ''
      };
    }
    
    // Filter records for this patient
    const patientRecords = allRecords.filter(r => r['患者ID'] === patientId);
    
    if (patientRecords.length === 0) {
      return {
        error: '該当する診療記録が見つかりません',
        records: '',
        patientName: patientInfo['患者名']
      };
    }
    
    // Format records as text
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
    
    return {
      records: formattedRecords,
      patientName: patientInfo['患者名'],
      birthDate: patientInfo['生年月日'],
      gender: patientInfo['性別']
    };
  } catch (error) {
    console.error('Error reading patient records:', error);
    return {
      error: '患者記録の取得に失敗しました: ' + error.message,
      records: '',
      patientName: ''
    };
  }
}