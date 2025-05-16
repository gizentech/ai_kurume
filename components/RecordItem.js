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
    
    // YYYY/MM/DD または YYYY-MM-DD または YYYY年MM月DD日 形式
    const normalDateMatch = dateStr.match(/^(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
    if (normalDateMatch) {
      const year = normalDateMatch[1];
      const month = normalDateMatch[2];
      const day = normalDateMatch[3];
      return `${year}年${month}月${day}日`;
    }
    
    // YYYYMMDDHHMMSS 形式
    const fullDateMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
    if (fullDateMatch) {
      const year = fullDateMatch[1];
      const month = fullDateMatch[2];
      const day = fullDateMatch[3];
      return `${year}年${month}月${day}日`;
    }
    
    return dateStr;
  };

  // 1. SOAPセクションの順序を定義
  const soapOrder = ['Subject', 'Object', 'Assessment', 'Plan'];
  
  // 画像に表示されている形式と同じようにする
  const renderSoapSection = () => {
    return soapOrder.map(section => {
      if (!record[section]) return null;
      
      return (
        <div key={section} className="mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-2">{section}</h3>
          <div className="pl-0">
            {record[section].split('\n').map((line, idx) => (
              <div key={idx} className="mb-1 text-gray-800">
                {line}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-4"></div>
        </div>
      );
    });
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
            {record['記載区分'] || 'SOAP'}
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
          {renderSoapSection()}
        </div>
      )}
    </div>
  );
}