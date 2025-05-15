// pages/records/patient/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';

export default function PatientRecordPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [patientInfo, setPatientInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('すべて');
  const [expandedRecords, setExpandedRecords] = useState({});
  
  // AI生成機能のための状態追加
  const [selectedRecords, setSelectedRecords] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [displayedText, setDisplayedText] = useState('');

  // 患者IDが変更されたときにデータをフェッチ
  useEffect(() => {
    if (id) {
      fetchPatientRecords();
    }
  }, [id]);
  
  // 生成テキストが更新されたときの表示効果
  useEffect(() => {
    if (isGenerating && generatedText) {
      let index = 0;
      setDisplayedText(''); // 表示テキストをリセット
      
      const timer = setInterval(() => {
        if (index < generatedText.length) {
          setDisplayedText(prev => prev + generatedText.charAt(index));
          index++;
        } else {
          clearInterval(timer);
          setIsGenerating(false);
        }
      }, 5); // 文字表示速度を調整

      return () => clearInterval(timer);
    }
  }, [isGenerating, generatedText]);

  // 患者記録を取得する関数
  const fetchPatientRecords = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log(`患者ID ${id} の記録を取得中...`);
      const response = await fetch(`/api/proxy/patient-records/${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`患者記録取得エラー: ステータス=${response.status}, レスポンス=`, errorText);
        throw new Error(`APIエラー: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('患者記録取得成功:', data ? '記録あり' : '記録なし');
      
      if (data.error) {
        setError(data.error);
        setPatientInfo(null);
        setRecords([]);
        return;
      }

      // 患者情報のセット
      setPatientInfo({
        id: id,
        name: data.patientName || '不明',
        birthDate: data.birthDate || '不明',
        gender: data.gender || '不明',
      });

      // 診療記録の処理
      if (data.records) {
        // 各記録をオブジェクトとして解析
        const parsedRecords = parseRecords(data.records);
        setRecords(parsedRecords);
        
        // 最初の5件を自動的に展開
        const initialExpanded = {};
        parsedRecords.slice(0, 5).forEach(record => {
          initialExpanded[record.recordId] = true;
        });
        setExpandedRecords(initialExpanded);
        
        // すべての記録を初期状態で選択しない
        const initialSelection = {};
        parsedRecords.forEach(record => {
          initialSelection[record.recordId] = false;
        });
        setSelectedRecords(initialSelection);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error('患者記録取得エラー:', err);
      setError('診療記録の取得中にエラーが発生しました: ' + err.message);
      setPatientInfo(null);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 文字列形式の記録を構造化されたオブジェクトに変換
  const parseRecords = (recordsString) => {
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
  };

  // SOAPセクションの優先順位
  const soapOrder = ['Subject', 'Object', 'Assessment', 'Plan'];

  // 主要なセクションかどうかを判定
  const isMainSection = (section) => {
    return soapOrder.includes(section) || 
           ['主訴', '現病歴', '診察所見', '診断', '処置・指導・処方'].includes(section);
  };

  // 表示する記録をフィルタリング
  const filteredRecords = activeTab === 'すべて' 
    ? records 
    : records.filter(record => record.category === activeTab);

  // 利用可能なカテゴリ（診療科）を抽出
  const categories = ['すべて', ...new Set(records.map(record => record.category).filter(Boolean))];

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

  // 選択した記録を整形してテキスト生成に使用する
  const formatSelectedRecordsForGeneration = () => {
    const selectedTexts = records
      .filter(record => selectedRecords[record.recordId])
      .map(record => {
        let formattedRecord = `日付：${record['日付'] || '日付不明'}\n`;
        formattedRecord += `診療科：${record['診療科'] || '不明'}\n`;
        formattedRecord += `担当医：${record['担当医'] || '不明'}\n`;
        
        // SOAPセクションを優先的に追加
        soapOrder.forEach(section => {
          if (record[section]) {
            formattedRecord += `${section}：${record[section]}\n`;
          }
        });
        
        // その他の主要セクションを追加
        Object.keys(record)
          .filter(key => !soapOrder.includes(key) && isMainSection(key) && 
                 key !== 'id' && key !== 'recordId' && key !== 'category' &&
                 key !== '日付' && key !== '診療科' && key !== '担当医' && key !== '記載方法')
          .forEach(key => {
            if (record[key]) {
              formattedRecord += `${key}：${record[key]}\n`;
            }
          });
        
        return formattedRecord;
      });
    
    return selectedTexts.join('\n\n---\n\n');
  };

  // 選択した記録からAIでサマリーを生成する
  const handleGenerateSummary = async () => {
    // 選択された記録があるかチェック
    const selectedCount = Object.values(selectedRecords).filter(Boolean).length;
    if (selectedCount === 0) {
      alert('少なくとも1つの記録を選択してください');
      return;
    }
    
    setIsGenerating(true);
    setDisplayedText(''); // 表示テキストをリセット
    
    try {
      const formattedRecords = formatSelectedRecordsForGeneration();
      
      console.log('AI サマリー生成リクエスト送信...', { 
        patientId: id, 
        selectedRecords: selectedCount 
      });
      
      try {
        const response = await fetch('/api/generate-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: formattedRecords,
            patientId: id,
            patientName: patientInfo?.name
          }),
        });
        
        console.log('レスポンス受信:', response.status);
        
        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          const errorText = await response.text();
          console.error('レスポンス解析エラー:', errorText);
          throw new Error(`レスポンスの解析に失敗しました: ${response.status}`);
        }
        
        if (!response.ok || responseData.error) {
          throw new Error(responseData.error || `APIエラー: ${response.status} ${response.statusText}`);
        }
        
        if (!responseData.generatedText) {
          throw new Error('生成されたテキストが含まれていません');
        }
        
        console.log('サマリー生成成功');
        setGeneratedText(responseData.generatedText);
      } catch (fetchError) {
        console.error('API リクエストエラー:', fetchError);
        throw new Error(`サーバーとの通信に失敗しました: ${fetchError.message}`);
      }
    } catch (error) {
      console.error('サマリー生成エラー:', error);
      setDisplayedText(`サマリー生成中にエラーが発生しました: ${error.message}\n\n問題が解決しない場合は管理者に連絡してください。`);
      setIsGenerating(false);
    }
  };

  // 結果をクリップボードにコピー
  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => alert('テキストがコピーされました'))
        .catch(err => alert('コピーに失敗しました: ' + err));
    } else {
      // フォールバック手法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('テキストがコピーされました');
        } else {
          alert('コピーできませんでした');
        }
      } catch (err) {
        alert('コピーに失敗しました: ' + err);
      }
    }
  };

  // 検索ページに戻る
  const handleGoBack = () => {
    router.push('/records');
  };

  // 記録を再取得する
  const handleRefresh = () => {
    fetchPatientRecords();
  };
  
  // 選択された記録の数をカウント
  const selectedCount = Object.values(selectedRecords).filter(Boolean).length;

  return (
    <Layout>
      {/* 固定ヘッダー部分 - 患者情報 */}
      <div className="sticky top-0 z-10 bg-gray-100 pt-2 pb-4 px-6 -mx-6 shadow-sm">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">患者診療録</h1>
            {patientInfo && (
              <div className="text-gray-600 mt-2">
                <p>患者ID: <span className="font-medium">{patientInfo.id}</span> | 
                   氏名: <span className="font-medium">{patientInfo.name}</span></p>
                <p>性別: {patientInfo.gender} | 生年月日: {patientInfo.birthDate}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleGoBack}
            className="mt-4 md:mt-0 px-4 py-2 text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            検索に戻る
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">診療記録を読み込み中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md">
          <div className="flex items-center mb-4">
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold">エラーが発生しました</h2>
          </div>
          <p className="mb-4">{error}</p>
          <div className="flex">
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none mr-2"
            >
              再試行
            </button>
            <button 
              onClick={handleGoBack}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 focus:outline-none"
            >
              検索に戻る
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 mt-4">
          {/* 左側: 記録リスト */}
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
                  onClick={handleRefresh}
                >
                  <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  更新
                </button>
              </div>
              <div className="text-sm text-gray-600">
                {filteredRecords.length} 件の記録 (全 {records.length} 件中)
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
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700">診療記録が見つかりません</h3>
                <p className="text-gray-500 mt-2">この患者の診療記録は登録されていないか、選択中のカテゴリには存在しません。</p>
                <button 
                  onClick={handleRefresh} 
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
                  {filteredRecords.map((record) => (
                    <div key={record.recordId} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="px-6 py-4 flex justify-between items-center">
                        {/* 選択チェックボックス */}
                        <div className="flex items-center">
                          <div 
                            className={`w-5 h-5 mr-3 border rounded flex items-center justify-center cursor-pointer ${
                              selectedRecords[record.recordId] ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
                            }`}
                            onClick={() => toggleRecordSelection(record.recordId)}
                          >
                            {selectedRecords[record.recordId] && (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          
                          {/* 記録情報 */}
                          <div>
                            <div className="font-semibold">{record['日付'] || '日付不明'}</div>
                            <div className="text-sm text-gray-600">
                              {record['診療科'] || record['記載方法'] || '診療科不明'} | 
                              担当医: {record['担当医'] || '不明'}
                            </div>
                          </div>
                        </div>
                        
                        {/* 展開アイコン */}
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleRecordExpand(record.recordId)}
                        >
                          <svg 
                            className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedRecords[record.recordId] ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {expandedRecords[record.recordId] && (
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                          {/* SOAP形式のセクションを優先的に表示 */}
                          {soapOrder.map(section => (
                            record[section] && (
                              <div key={section} className="mb-4 last:mb-0">
                                <div className="font-medium text-gray-700 mb-1">{section}</div>
                                <div className="text-gray-600 whitespace-pre-line bg-white p-3 border border-gray-200 rounded-md">{record[section]}</div>
                              </div>
                            )
                          ))}
                          
                          {/* その他の主要なセクションを表示 */}
                          {Object.keys(record).filter(key => !soapOrder.includes(key) && isMainSection(key)).map(key => (
                            record[key] && key !== 'id' && key !== 'recordId' && key !== 'category' && 
                            key !== '日付' && key !== '診療科' && key !== '担当医' && key !== '記載方法' && (
                              <div key={key} className="mb-4 last:mb-0">
                                <div className="font-medium text-gray-700 mb-1">{key}</div>
                                <div className="text-gray-600 whitespace-pre-line bg-white p-3 border border-gray-200 rounded-md">{record[key]}</div>
                              </div>
                            )
                          ))}
                          
                          {/* 残りのセクションを表示 */}
                          {Object.keys(record).filter(key => 
                            !soapOrder.includes(key) && 
                            !isMainSection(key) && 
                            key !== 'id' && 
                            key !== 'recordId' && 
                            key !== 'category' && 
                            key !== '日付' && 
                            key !== '診療科' && 
                            key !== '担当医' &&
                            key !== '記載方法'
                          ).map(key => (
                            record[key] && (
                              <div key={key} className="mb-4 last:mb-0">
                                <div className="font-medium text-gray-700 mb-1">{key}</div>
                                <div className="text-gray-600 whitespace-pre-line bg-white p-3 border border-gray-200 rounded-md">{record[key]}</div>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* 右側: AI生成サマリー */}
          <div className="w-full md:w-2/5">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-32">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">AI診療サマリー</h2>
                {isGenerating && (
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse ml-2"></span>
                )}
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                <p>選択した記録からAIが診療サマリーを生成します。少なくとも1つの記録を選択してください。</p>
              </div>
              
              <div className="mb-4">
                <button
                  className={`w-full px-4 py-2 rounded-md text-white font-medium ${
                    selectedCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  onClick={handleGenerateSummary}
                  disabled={selectedCount === 0 || isGenerating}
                >
                  {isGenerating ? (
<span className="flex items-center justify-center">
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     生成中...
                   </span>
                 ) : (
                   'サマリーを生成'
                 )}
               </button>
             </div>
             
             <div className="border border-gray-200 rounded-md p-4 bg-gray-50 whitespace-pre-line h-96 overflow-y-auto">
               {displayedText || <span className="text-gray-400">AIによるサマリーがここに表示されます</span>}
             </div>
             
             {generatedText && !isGenerating && (
               <div className="mt-4 flex justify-end space-x-2">
                 <button 
                   className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                   onClick={() => copyToClipboard(generatedText)}
                 >
                   <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                   </svg>
                   コピー
                 </button>
                 <button className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                   <svg className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                   </svg>
                   保存
                 </button>
               </div>
             )}
           </div>
         </div>
       </div>
     )}
   </Layout>
 );
}