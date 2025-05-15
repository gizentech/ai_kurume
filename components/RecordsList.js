// components/RecordsList.js
import { useState } from 'react';
import RecordItem from './RecordItem';

export default function RecordsList({ 
  records, 
  allRecords, 
  categories, 
  activeTab, 
  setActiveTab, 
  selectedRecords, 
  setSelectedRecords, 
  onRefresh 
}) {
  const [expandedRecords, setExpandedRecords] = useState({});

  // 記録の展開/折りたたみを切り替え
  const toggleRecordExpand = (recordId) => {
    setExpandedRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // 記録の選択/選択解除を切り替え
  const toggleRecordSelection = (recordId) => {
    setSelectedRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // すべての記録を展開/折りたたみ
  const toggleAllRecords = (expand) => {
    const newExpandState = {};
    allRecords.forEach(record => {
      newExpandState[record.recordId] = expand;
    });
    setExpandedRecords(newExpandState);
  };
  
  // すべての記録を選択/選択解除
  const toggleAllSelection = (select) => {
    const newSelectState = {};
    allRecords.forEach(record => {
      newSelectState[record.recordId] = select;
    });
    setSelectedRecords(newSelectState);
  };
  
  // 選択された記録の数をカウント
  const selectedCount = Object.values(selectedRecords).filter(Boolean).length;

  return (
    <div className="w-full md:w-3/5">
      {/* 操作ボタン */}
      <div className="mb-4 flex flex-wrap justify-between items-center">
        <div className="flex space-x-2 mb-2 md:mb-0">
          <button 
            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
            onClick={() => toggleAllRecords(true)}
          >
            すべて展開
          </button>
          <button 
            className="px-3 py-1 text-sm bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
            onClick={() => toggleAllRecords(false)}
          >
            すべて折りたたみ
          </button>
          <button 
            className="px-3 py-1 text-sm bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100"
            onClick={onRefresh}
          >
            <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {records.length} 件の記録 (全 {allRecords.length} 件中)
        </div>
      </div>

      {/* カテゴリタブ */}
      {categories.length > 1 && (
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <div className="whitespace-nowrap">
            {categories.map(category => (
              <button
                key={category}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === category 
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 診療記録リスト */}
      {records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700">診療記録が見つかりません</h3>
          <p className="text-gray-500 mt-2">この患者の診療記録は登録されていないか、選択中のカテゴリには存在しません。</p>
          <button 
            onClick={onRefresh} 
            className="mt-4 px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none"
          >
            <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            再読み込み
          </button>
        </div>
      ) : (
        <>
          {/* 記録選択操作ボタン */}
          <div className="mb-4 flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
                onClick={() => toggleAllSelection(true)}
              >
                全選択
              </button>
              <button 
                className="px-3 py-1 text-sm bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
                onClick={() => toggleAllSelection(false)}
              >
                選択解除
              </button>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              {selectedCount} 件選択中
            </div>
          </div>
          
          <div className="space-y-4">
            {records.map((record) => (
              <RecordItem 
                key={record.recordId}
                record={record}
                isExpanded={expandedRecords[record.recordId] || false}
                isSelected={selectedRecords[record.recordId] || false}
                onToggleExpand={() => toggleRecordExpand(record.recordId)}
                onToggleSelect={() => toggleRecordSelection(record.recordId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}