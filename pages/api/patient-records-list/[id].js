// pages/api/patient-records/[id].js
// Modify the existing API to return records in a more structured format
// Most of the existing code can remain the same, with a few changes to how data is returned

// Near the end of the function, replace the existing formatted records code with:

// This part stays the same - filtering for patient records
const patientRecords = allRecords.filter(record => record['患者ID'] === id);

console.log(`Filtered records for patient ${id}:`, patientRecords.length);

if (patientRecords.length === 0) {
  return res.status(200).json({ 
    error: '該当する診療記録が見つかりません',
    records: '',
    patientName: patientInfo['患者名']
  });
}

// 診療記録を時系列順に整形
const formattedRecords = patientRecords.map(record => {
  // レコードの各フィールドを取得（列名が不確かな場合に対応）
  const date = record['日付'] || '';
  const department = record['診療科'] || '';
  const doctor = record['担当医'] || '';
  const complaint = record['主訴'] || '';
  const history = record['現病歴'] || '';
  const findings = record['診察所見'] || '';
  const diagnosis = record['診断'] || '記録なし';
  const treatment = record['処置・指導・処方'] || '記録なし';
  
  return `日付：${date}
診療科：${department}
担当医：${doctor}
主訴：${complaint}
現病歴：${history}
診察所見：${findings}
診断：${diagnosis}
処置・指導・処方：${treatment}`;
}).join('\n\n---\n\n');

console.log("Successfully formatted patient records");

return res.status(200).json({ 
  records: formattedRecords,
  patientName: patientInfo['患者名']
});