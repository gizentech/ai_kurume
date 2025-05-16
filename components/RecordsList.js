// components/RecordsList.js
import { useState, useEffect } from 'react';
import RecordItem from './RecordItem';

export default function RecordsList({ 
  records, 
  allRecords, 
  categories, 
  activeTab, 
  setActiveTab, 
  selectedRecords, 
  setSelectedRecords, 
  onRefresh,
  defaultExpanded = true // デフォルトで展開
}) {
  const [expandedRecords, setExpandedRecords] = useState({});

  // 初期状態でデフォルトの展開状態を設定
  useEffect(() => {
    if (records.length > 0) {
      const initialState = {};
      records.forEach(record => {
        initialState[record.recordId] = defaultExpanded;
      });
      setExpandedRecords(initialState);
    }
  }, [records, defaultExpanded]);

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
    records.forEach(record => {
      newExpandState[record.recordId] = expand;
    });
    setExpandedRecords(newExpandState);
  };
  
  // すべての記録を選択/選択解除
  const toggleAllSelection = (select) => {
    const newSelectState = {};
    records.forEach(record => {
      newSelectState[record.recordId] = select;
    });
    setSelectedRecords(newSelectState);
  };
  
  // 選択された記録の数をカウント
  const selectedCount = Object.values(selectedRecords).filter(Boolean).length;

  return (
    <div className="w-full md:w-3/5">
      {/* ボタンバー */}
      <div className="bg-gray-100 p-3 mb-4 rounded flex flex-wrap gap-2 items-center">
        <button 
          className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => toggleAllRecords(true)}
        >
          すべて展開
        </button>
        <button 
          className="px-4 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          onClick={() => toggleAllRecords(false)}
        >
          すべて折りたたみ
        </button>
        <button 
          className="px-4 py-1.5 bg-green-600 text-white flex items-center rounded hover:bg-green-700"
          onClick={onRefresh}
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </button>
        
        <div className="ml-auto text-sm text-gray-700">
          {records.length} 件の記録 (全 {allRecords.length} 件中)
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="flex flex-wrap gap-2">
          <button
            className={`py-1.5 px-4 text-sm font-medium rounded ${
              activeTab === 'すべて' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('すべて')}
          >
            すべて
          </button>
          
          {categories.map(category => (
            <button
              key={category}
              className={`py-1.5 px-4 text-sm font-medium rounded ${
                activeTab === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 選択操作 */}
      <div className="bg-white p-3 mb-4 border border-gray-200 rounded flex justify-between items-center shadow-sm">
        <div className="flex gap-2">
          <button 
            className="px-3 py-1 text-sm bg-white text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
            onClick={() => toggleAllSelection(true)}
          >
            全選択
          </button>
          <button 
            className="px-3 py-1 text-sm bg-white text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            onClick={() => toggleAllSelection(false)}
          >
            選択解除
          </button>
        </div>
        <div className="text-sm text-gray-700">
          {selectedCount} 件選択中
        </div>
      </div>

      {/* 診療記録リスト */}
      {records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
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
      )}
    </div>
  );
}