// components/RecordItem.js
import React from 'react';

export default function RecordItem({ 
  record, 
  isExpanded, 
  isSelected, 
  onToggleExpand, 
  onToggleSelect 
}) {
  // 日付フォーマット
  const formatDate = (dateStr) => {
    if (!dateStr) return '不明';
    
    // すでにフォーマット済みの場合（YYYY年MM月DD日 形式）
    if (dateStr.includes('年') && dateStr.includes('月') && dateStr.includes('日')) {
      return dateStr;
    }
    
    // YYYY/MM/DD または YYYY-MM-DD 形式
    const normalDateMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (normalDateMatch) {
      const year = normalDateMatch[1];
      const month = normalDateMatch[2];
      const day = normalDateMatch[3];
      return `${year}年${month}月${day}日`;
    }
    
    // YYYYMMDDHHMMSS 形式
    const fullDateMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
    if (fullDateMatch) {
      const year = fullDateMatch[1];
      const month = fullDateMatch[2];
      const day = fullDateMatch[3];
      return `${year}年${month}月${day}日`;
    }
    
    return dateStr;
  };

  // SOAPセクションの順序を定義
  const soapOrder = ['Subject', 'Object', 'Assessment', 'Plan'];
  
  // JSONテキストからテキスト部分のみを抽出する関数
  const extractTextFromJSON = (jsonText) => {
    if (!jsonText || typeof jsonText !== 'string') {
      return '';
    }
    
    try {
      // JSONテキストでない場合はそのまま返す
      if (!jsonText.includes('"Text"') && !jsonText.includes('\\"Text\\"')) {
        return jsonText;
      }
      
      // エスケープされたクォートを処理
      let cleanedText = jsonText
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/""/g, '"');
      
      // 最もシンプルなアプローチ: すべての "Text":"..." パターンをマッチ
      const allMatches = [];
      const regex = /"Text"\s*:\s*"([^"]*)"/g;
      let match;
      
      while ((match = regex.exec(cleanedText)) !== null) {
        allMatches.push(match[1]);
      }
      
      if (allMatches.length > 0) {
        // ここが重要: 空のテキストは改行に置き換え、それ以外は内容をそのまま使用
        return allMatches.map(text => text.trim() === '' ? '\n' : text).join('');
      }
      
      // 何も見つからなかった場合は元のテキストを返す
      return jsonText;
    } catch (e) {
      console.error('JSON処理エラー:', e);
      return jsonText; // エラーが発生した場合は元のテキストを返す
    }
  };
  
  // テキストコンテンツを処理して表示
  const renderText = (text) => {
    if (!text) return null;
    
    // テキスト抽出
    let displayText = text;
    if (typeof text === 'string' && 
       (text.includes('"Text"') || text.includes('\\"Text\\"'))) {
      displayText = extractTextFromJSON(text);
    }
    
    return (
      <div className="whitespace-pre-line">{displayText}</div>
    );
  };
  
  // 記載区分の表示名を取得
  const getRecordType = () => {
    // 明示的に記載区分が指定されている場合はそれを使用
    if (record['記載区分']) return record['記載区分'];
    
    // 記載方法が指定されている場合はそれを使用
    if (record['記載方法']) return record['記載方法'];
    
    // SOAPセクションが存在するか確認
    for (const section of soapOrder) {
      if (record[section]) {
        return 'SOAP'; // SOAPセクションが存在する場合
      }
    }
    
    // その他の特殊な記載区分
    if (record['自由記載']) return '自由記載';
    if (record['超音波']) return '超音波検査';
    
    // デフォルト
    return '記録';
  };

  return (
    <div className={`mb-4 border rounded-lg overflow-hidden ${isSelected ? 'border-blue-400' : 'border-gray-200'} bg-white`}>
      {/* ヘッダー部分 */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 cursor-pointer"
        onClick={onToggleSelect}
      >
        <div className="flex items-center">
          {/* 選択チェックボックス */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="h-4 w-4 text-blue-600 rounded mr-3"
          />
          
          {/* 日付と担当医 */}
          <div>
            <div className="font-semibold text-gray-800">
              {formatDate(record['日付'])}
            </div>
            <div className="text-sm text-gray-600">
              {record['診療科'] ? `${record['診療科']} | ` : ''}
              担当: {record['担当医'] || '不明'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          {/* 記載区分（ヘッダーとして扱う部分） */}
          <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full mr-3">
            {getRecordType()}
          </div>
          
          {/* 展開ボタン */}
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg 
              className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 展開時の内容 */}
      {isExpanded && (
        <div className="p-4">
          {/* SOAPセクションを順番に表示 */}
          {soapOrder.map(section => {
            if (!record[section]) return null;
            
            return (
              <div key={section} className="mb-6">
                <h3 className="text-base font-semibold text-gray-800 mb-2">{section}</h3>
                <div className="pl-0">
                  {renderText(record[section])}
                </div>
                <div className="border-t border-gray-200 mt-4"></div>
              </div>
            );
          })}
          
          {/* その他のセクション情報 */}
          {Object.keys(record).filter(key => 
            !soapOrder.includes(key) && 
            key !== 'id' && 
            key !== 'recordId' && 
            key !== 'category' &&
            key !== '日付' && 
            key !== '診療科' && 
            key !== '担当医' && 
            key !== '記載方法' &&
            key !== '記載区分' &&
            record[key] // 値が存在する場合のみ表示
          ).map(key => (
            <div key={key} className="mb-6">
              <h3 className="text-base font-semibold text-gray-800 mb-2">{key}</h3>
              <div className="pl-0">
                {renderText(record[key])}
              </div>
              <div className="border-t border-gray-200 mt-4"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}