// pages/next-record/create/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';

export default function CreateNextRecordPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [guestInfo, setGuestInfo] = useState(null);
  const [lastRecord, setLastRecord] = useState(null);
  const [newRecord, setNewRecord] = useState({
    Subject: '',
    Object: '',
    Assessment: '',
    Plan: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkboxes, setCheckboxes] = useState({
    Subject: false,
    Object: false,
    Assessment: false,
    Plan: false
  });

  useEffect(() => {
    if (id) {
      fetchGuestRecordData();
    }
  }, [id]);

  const fetchGuestRecordData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/next-record/guest-record/${id}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setGuestInfo(data.guestInfo);
        setLastRecord(data.lastRecord);
        
        // 前回のSOAPを新しいカルテにコピー（編集可能）
        if (data.lastRecord) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0].replace(/-/g, '') + '090000';
          
          setNewRecord({
            date: tomorrowStr,
            Subject: data.lastRecord.Subject || '',
            Object: data.lastRecord.Object || '',
            Assessment: data.lastRecord.Assessment || '',
            Plan: data.lastRecord.Plan || ''
          });
        }
      }
    } catch (error) {
      console.error('ゲスト記録データ取得エラー:', error);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (section) => {
    setCheckboxes(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleInputChange = (section, value) => {
    setNewRecord(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const handleCopyFromLeft = (section) => {
    if (lastRecord && lastRecord[section]) {
      setNewRecord(prev => ({
        ...prev,
        [section]: lastRecord[section]
      }));
    }
  };

  const handleClearSection = (section) => {
    setNewRecord(prev => ({
      ...prev,
      [section]: ''
    }));
  };

  const handleExecute = async () => {
    // チェックされていない項目があるかチェック
    const uncheckedItems = Object.keys(checkboxes).filter(key => !checkboxes[key]);
    
    if (uncheckedItems.length > 0) {
      alert(`以下の項目がチェックされていません: ${uncheckedItems.join(', ')}`);
      return;
    }

    // 空の項目があるかチェック
    const emptyItems = Object.keys(newRecord).filter(key => 
      key !== 'date' && (!newRecord[key] || newRecord[key].trim() === '')
    );
    
    if (emptyItems.length > 0) {
      if (!confirm(`以下の項目が空です。続行しますか？: ${emptyItems.join(', ')}`)) {
        return;
      }
    }

    try {
      const response = await fetch('/api/next-record/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestId: id,
          record: newRecord
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert('エラー: ' + data.error);
      } else {
        // JSON出力をダウンロード
        const blob = new Blob([JSON.stringify(data.jsonOutput, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `next-record-${id}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('カルテが正常に作成されました');
        router.push('/next-record');
      }
    } catch (error) {
      console.error('カルテ作成エラー:', error);
      alert('カルテの作成に失敗しました');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.length >= 14) {
      const year = dateStr.substr(0, 4);
      const month = dateStr.substr(4, 2);
      const day = dateStr.substr(6, 2);
      const hour = dateStr.substr(8, 2);
      const minute = dateStr.substr(10, 2);
      return `${year}年${month}月${day}日 ${hour}:${minute}`;
    }
    return dateStr;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">カルテデータを読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold">エラーが発生しました</h2>
          </div>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => router.push('/next-record')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none"
          >
            一覧に戻る
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">次回カルテ作成</h1>
            {guestInfo && (
              <p className="text-gray-600 mt-2">
                ゲスト番号: {guestInfo.guestId} | 氏名: {guestInfo.guestName}
              </p>
            )}
          </div>
          <button
            onClick={() => router.push('/next-record')}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            一覧に戻る
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
        {/* 左カラム: 前回のSOAPカルテ（読み取り専用） */}
        <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">前回のSOAPカルテ（参照用）</h2>
            {lastRecord && (
              <p className="text-sm text-gray-600 mt-1">
                記録日: {formatDate(lastRecord.date)}
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {lastRecord ? (
              <div className="space-y-4">
                {['Subject', 'Object', 'Assessment', 'Plan'].map(section => (
                  <div key={section} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-800">{section}</h3>
                      <button
                        onClick={() => handleCopyFromLeft(section)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        右にコピー →
                      </button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md min-h-[80px]">
                      <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                        {lastRecord[section] || '記録なし'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>前回のSOAPカルテが見つかりません</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右カラム: 新しいカルテ（編集可能） */}
        <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">次回カルテ（編集可能）</h2>
            <p className="text-sm text-gray-600 mt-1">
              記録日: {formatDate(newRecord.date)}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {['Subject', 'Object', 'Assessment', 'Plan'].map(section => (
                <div key={section} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`check-${section}`}
                        checked={checkboxes[section]}
                        onChange={() => handleCheckboxChange(section)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                      />
                      <label htmlFor={`check-${section}`} className="font-medium text-gray-800">
                        {section}
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClearSection(section)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        クリア
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={newRecord[section]}
                    onChange={(e) => handleInputChange(section, e.target.value)}
                    className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`${section}の内容を入力してください...`}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {newRecord[section] ? newRecord[section].length : 0} 文字
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                チェック済み: {Object.values(checkboxes).filter(Boolean).length}/4
              </div>
              <button
                onClick={handleExecute}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                実行 (JSON出力)
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}