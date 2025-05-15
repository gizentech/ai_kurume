// utils/recordParser.js

// 文字列形式の記録を構造化されたオブジェクトに変換
export function parseRecords(recordsString) {
  const records = [];
  
  // '---' で区切られた記録をパース
  const recordStrings = recordsString.split('\n\n---\n\n');
  
  recordStrings.forEach((recordStr, index) => {
    const record = { id: index };
    const lines = recordStr.split('\n');
    
    // 現在のセクション名を追跡
    let currentSection = '';
    let sectionContent = '';
    
    lines.forEach(line => {
      // 'セクション：内容' の形式を検出
      const match = line.match(/^([^：]+)：(.*)$/);
      if (match) {
        // 前のセクションがあれば保存
        if (currentSection && sectionContent) {
          record[currentSection] = sectionContent.trim();
          sectionContent = '';
        }
        
        currentSection = match[1].trim();
        sectionContent = match[2].trim();
      } else if (currentSection) {
        // セクション内の追加テキスト
        sectionContent += '\n' + line;
      }
    });
    
    // 最後のセクションを保存
    if (currentSection && sectionContent) {
      record[currentSection] = sectionContent.trim();
    }
    
    // 診療科を取得（カテゴリとして使用）
    record.category = record['診療科'] || record['記載方法'] || 'その他';
    record.recordId = index;
    
    records.push(record);
  });
  
  return records;
}

// SOAPセクションの優先順位
export const soapOrder = ['Subject', 'Object', 'Assessment', 'Plan'];

// 主要なセクションかどうかを判定
export function isMainSection(section) {
  return soapOrder.includes(section) || 
         ['主訴', '現病歴', '診察所見', '診断', '処置・指導・処方'].includes(section);
}