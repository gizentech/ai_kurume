// components/RecordItem.js
import React from 'react';

export default function RecordItem({ 
  record, 
  isExpanded, 
  isSelected, 
  onToggleExpand, 
  onToggleSelect 
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '不明';
    
    // すでにフォーマット済みの場合
    if (dateStr.includes('年') && dateStr.includes('月') && dateStr.includes('日')) {
      return dateStr;
    }
    
    return dateStr;
  };

  // SOAPセクションの順序を定義
  const soapOrder = ['Subject', 'Object', 'Assessment', 'Plan'];
  
  // テキストコンテンツを処理して表示
  const renderText = (text) => {
    if (!text) return null;
    
    return (
      <div className="whitespace-pre-line break-words leading-relaxed text-gray-700">
        {text}
      </div>
    );
  };
  
  // 記載区分の表示名を取得
  const getRecordType = () => {
    if (record['記載区分']) return record['記載区分'];
    if (record['記載方法']) return record['記載方法'];
    
    // SOAPセクションが存在するか確認
    for (const section of soapOrder) {
      if (record[section]) {
        return 'SOAP';
      }
    }
    
    return '記録';
  };

  // 保険区分に応じたスタイル
  const getInsuranceStyle = (insurance) => {
    if (insurance && insurance.includes('自費')) {
      return 'bg-red-100 text-red-800';
    } else if (insurance && insurance.includes('保険')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`mb-4 border rounded-lg overflow-hidden ${
      isSelected ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
    } transition-shadow duration-200`}>
      
      {/* ヘッダー部分 */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
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
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
          />
          
          {/* 日付と基本情報 */}
          <div>
            <div className="font-semibold text-gray-800 text-lg">
              {formatDate(record['日付'])}
            </div>
            <div className="text-sm text-gray-600 mt-1 space-y-1">
              <div className="flex items-center flex-wrap gap-2">
                {record['診療科'] && record['診療科'] !== '不明' && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {record['診療科']}
                  </span>
                )}
                {record['入外区分'] && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                    {record['入外区分']}
                  </span>
                )}
                {record['保険区分'] && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInsuranceStyle(record['保険区分'])}`}>
                    {record['保険区分']}
                  </span>
                )}
              </div>
              <div>
                <span>担当: {record['担当医'] || '不明'}</span>
                {record['指示者'] && record['指示者'] !== '不明' && record['指示者'] !== record['担当医'] && (
                  <span className="ml-2">| 指示: {record['指示者']}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          {/* 記載区分 */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium mr-3 ${
            getRecordType() === 'SOAP' 
              ? 'bg-green-100 text-green-800' 
              : getRecordType().includes('自由')
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {getRecordType()}
          </div>
          
          {/* 展開ボタン */}
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg 
              className={`h-5 w-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
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
        <div className="p-4 bg-gray-50">
          {/* SOAPセクションを順番に表示 */}
          {soapOrder.map(section => {
            if (!record[section]) return null;
            
            const sectionColors = {
              'Subject': 'bg-blue-500',
              'Object': 'bg-green-500',
              'Assessment': 'bg-yellow-500',
              'Plan': 'bg-red-500'
            };
            
return (
             <div key={section} className="mb-6 last:mb-0">
               <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                 <span className={`inline-block w-3 h-3 rounded-full mr-3 ${sectionColors[section]}`}></span>
                 {section}
               </h3>
               <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                 {renderText(record[section])}
               </div>
             </div>
           );
         })}
         
         {/* その他のセクション情報 */}
         {Object.keys(record).filter(key => 
           !soapOrder.includes(key) && 
           !['id', 'recordId', 'category', '日付', '診療科', '担当医', '指示者', '記載方法', '記載区分', '保険区分', '入外区分'].includes(key) &&
           record[key] && record[key].toString().trim()
         ).map(key => (
           <div key={key} className="mb-6 last:mb-0">
             <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
               <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-3"></span>
               {key}
             </h3>
             <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
               {renderText(record[key])}
             </div>
           </div>
         ))}
         
         {/* メタ情報セクション */}
         <div className="mt-6 pt-4 border-t border-gray-300">
           <h4 className="text-sm font-medium text-gray-600 mb-2">記録情報</h4>
           <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
             <div>
               <span className="font-medium">記載区分:</span> {record['記載区分'] || '不明'}
             </div>
             <div>
               <span className="font-medium">保険区分:</span> {record['保険区分'] || '不明'}
             </div>
             <div>
               <span className="font-medium">入外区分:</span> {record['入外区分'] || '不明'}
             </div>
             {record['指示者'] && record['指示者'] !== '不明' && (
               <div>
                 <span className="font-medium">指示者:</span> {record['指示者']}
               </div>
             )}
           </div>
         </div>
         
         {/* コンテンツが空の場合のメッセージ */}
         {!soapOrder.some(section => record[section]) && 
          !Object.keys(record).some(key => 
            !soapOrder.includes(key) && 
            !['id', 'recordId', 'category', '日付', '診療科', '担当医', '指示者', '記載方法', '記載区分', '保険区分', '入外区分'].includes(key) && 
            record[key] && record[key].toString().trim()
          ) && (
           <div className="text-center text-gray-500 py-8">
             <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
             <p>記録内容が表示されていません</p>
             <p className="text-xs mt-1">記載内容が空であるか、表示形式に問題がある可能性があります</p>
           </div>
         )}
       </div>
     )}
   </div>
 );
}