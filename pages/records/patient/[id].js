import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import PatientHeader from '../../../components/PatientHeader';

export default function PatientRecordPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [patientInfo, setPatientInfo] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [activeDate, setActiveDate] = useState(null);
  
  const recordsRef = useRef(null);
  const dateRefs = useRef({});

  // 患者IDが変更されたときにデータをフェッチ
  useEffect(() => {
    if (id) {
      fetchPatientRecords();
    }
  }, [id]);

  // 患者記録を取得する関数
  const fetchPatientRecords = async () => {
    setIsLoading(true);
    setError('');
    setAllRecords([]);

    try {
      console.log(`患者ID ${id} の記録を取得中...`);
      
      const response = await fetch(`/api/proxy/patient-records/${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`APIエラー: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setPatientInfo(null);
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
        const parsedRecords = parseRecordsWithContent(data.records);
        
        // 日付の新しい順（降順）にソート
        parsedRecords.sort((a, b) => {
          const dateA = convertToComparableDate(a.sortableDate);
          const dateB = convertToComparableDate(b.sortableDate);
          return dateB - dateA;
        });
        
        setAllRecords(parsedRecords);
        
        // 最初の日付をアクティブに設定
        if (parsedRecords.length > 0) {
          const firstDate = formatDateForGrouping(parsedRecords[0].sortableDate);
          setActiveDate(firstDate);
        }
      }
    } catch (err) {
      console.error('患者記録取得エラー:', err);
      setError('診療記録の取得中にエラーが発生しました: ' + err.message);
      setPatientInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // recordsStringを解析して構造化する
  const parseRecordsWithContent = (recordsString) => {
    if (!recordsString || typeof recordsString !== 'string') {
      return [];
    }
    
    const records = [];
    const recordStrings = recordsString.split('\n\n---\n\n');
    
    recordStrings.forEach((recordStr, index) => {
      const record = { 
        id: index, 
        recordId: `record_${index}`,
        originalText: recordStr
      };
      
      const lines = recordStr.split('\n');
      
      lines.forEach(line => {
        const sectionMatch = line.match(/^([^：]+)：(.*)$/);
        if (sectionMatch) {
          const key = sectionMatch[1].trim();
          const value = sectionMatch[2] || '';
          record[key] = value.trim();
        }
      });
      
      // 日付のフォーマット
      const dateStr = record['日付'] || '';
      record.date = formatDisplayDate(dateStr);
      record.sortableDate = dateStr;
      record.groupDate = formatDateForGrouping(dateStr);
      
      // 記載種別の判定
      record.recordType = determineRecordType(record);
      
      // 内容の解析と整理
      record.parsedContent = parseRecordContent(record);
      
      if (Object.keys(record.parsedContent).length > 0) {
        records.push(record);
      }
    });
    
    return records;
  };

  // 記載種別を判定
  const determineRecordType = (record) => {
    const recordMethod = record['記載方法'] || '';
    if (recordMethod === 'SOAP') {
      return 'SOAP';
    } else if (recordMethod.includes('自由記載')) {
      return '自由記載';
    } else if (recordMethod.includes('超音波')) {
      return '超音波';
    }
    
    // SOAPセクションが存在するかチェック
    const soapSections = ['Subject', 'Object', 'Assessment', 'Plan'];
    const hasSoapSections = soapSections.some(section => record[section]);
    
    if (hasSoapSections) {
      return 'SOAP';
    }
    
    return '記録';
  };

  // レコードの内容を解析
  const parseRecordContent = (record) => {
    const content = {};
    
    // メタ情報
    content.meta = {
      date: record.date,
      department: record['診療科'] || '不明',
      doctor: record['担当医'] || record['記載者'] || '不明',
      instructor: record['指示者'] || '',
      recordType: record['記載区分'] || record['記載方法'] || '',
      insuranceType: formatInsuranceType(record['保険区分']),
      tags: record['記載タグ'] || '',
      updater: record['更新者'] || ''
    };
    
    // 記載種別に応じた内容解析
    if (record.recordType === 'SOAP') {
      content.soap = {
        Subject: extractTextFromJson(record['Subject'] || ''),
        Object: extractTextFromJson(record['Object'] || ''),
        Assessment: extractTextFromJson(record['Assessment'] || ''),
        Plan: extractTextFromJson(record['Plan'] || '')
      };
    } else {
      // 自由記載や超音波の場合、すべてのフィールドを結合
      const textFields = [];
      Object.keys(record).forEach(key => {
        if (!['id', 'recordId', 'originalText', 'date', 'sortableDate', 'groupDate', 'recordType', 'parsedContent', 
              '日付', '診療科', '担当医', '指示者', '記載区分', '記載方法', '保険区分', '入外区分', '記載タグ', '更新者', '記載者'].includes(key)) {
          const text = extractTextFromJson(record[key]);
          if (text && text.trim()) {
            textFields.push(text.trim());
          }
        }
      });
      content.freeText = textFields.join('\n\n');
    }
    
    return content;
  };

  // JSONからテキストを抽出
  const extractTextFromJson = (jsonText) => {
    if (!jsonText) return '';
    
    try {
      // JSONフォーマットでない場合はそのまま返す
      if (!jsonText.includes('"Text"')) {
        return jsonText;
      }
      
      // JSON配列をパース
      let cleanText = jsonText;
      
      // 外側の引用符を除去
      if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
        cleanText = cleanText.slice(1, -1);
      }
      
      // エスケープされた引用符を処理
      cleanText = cleanText.replace(/""/g, '"');
      
      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) {
          const texts = [];
          let currentParagraph = [];
          
          parsed.forEach(item => {
            if (item.Text === '') {
              // 空行の場合：現在の段落を終了し、改行を追加
              if (currentParagraph.length > 0) {
                texts.push(currentParagraph.join(''));
                currentParagraph = [];
              }
              texts.push(''); // 空行として追加
            } else if (item.Text) {
              // テキストがある場合：現在の段落に追加
              currentParagraph.push(item.Text);
            }
          });
          
          // 最後の段落を追加
          if (currentParagraph.length > 0) {
            texts.push(currentParagraph.join(''));
          }
          
          return texts.join('\n');
        }
      } catch (e) {
        // JSON解析に失敗した場合は正規表現で抽出
        const matches = cleanText.match(/"Text"\s*:\s*"([^"]*)"/g);
        if (matches) {
          return matches.map(match => {
            const text = match.replace(/"Text"\s*:\s*"/, '').replace(/"$/, '');
            return text;
          }).join('');
        }
      }
      
      return jsonText;
    } catch (e) {
      return jsonText;
    }
  };

  // 保険区分のフォーマット
  const formatInsuranceType = (code) => {
    const insuranceMap = {
      3: "保険",
      1: "自費",
      0: "未登録"
    };
    return insuranceMap[code] || "不明";
  };

  // 表示用日付フォーマット
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '日付不明';
    
    if (typeof dateStr === 'string' && dateStr.length >= 14) {
      // YYYYMMDDHHmmss形式
      const year = dateStr.substr(0, 4);
      const month = dateStr.substr(4, 2);
      const day = dateStr.substr(6, 2);
      const hour = dateStr.substr(8, 2);
      const minute = dateStr.substr(10, 2);
      return `${year}年${month}月${day}日 ${hour}:${minute}`;
    } else if (typeof dateStr === 'string' && dateStr.length >= 8) {
      // YYYYMMDD形式
      const year = dateStr.substr(0, 4);
      const month = dateStr.substr(4, 2);
      const day = dateStr.substr(6, 2);
      return `${year}年${month}月${day}日`;
    }
    
    return dateStr;
  };

  // グループ化用日付フォーマット（YYYY/MM/DD）
  const formatDateForGrouping = (dateStr) => {
    if (!dateStr) return '日付不明';
    
    if (typeof dateStr === 'string' && dateStr.length >= 8) {
      const year = dateStr.substr(0, 4);
      const month = dateStr.substr(4, 2);
      const day = dateStr.substr(6, 2);
      return `${year}/${month}/${day}`;
    }
    
    return dateStr;
  };

  // 日付文字列を比較可能な日付オブジェクトに変換
  const convertToComparableDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    
    if (typeof dateStr === 'string' && dateStr.length >= 14) {
      // YYYYMMDDHHmmss形式
      const year = parseInt(dateStr.substr(0, 4));
      const month = parseInt(dateStr.substr(4, 2)) - 1;
      const day = parseInt(dateStr.substr(6, 2));
      const hour = parseInt(dateStr.substr(8, 2));
      const minute = parseInt(dateStr.substr(10, 2));
      const second = parseInt(dateStr.substr(12, 2)) || 0;
      return new Date(year, month, day, hour, minute, second);
    } else if (typeof dateStr === 'string' && dateStr.length >= 8) {
      // YYYYMMDD形式
      const year = parseInt(dateStr.substr(0, 4));
      const month = parseInt(dateStr.substr(4, 2)) - 1;
      const day = parseInt(dateStr.substr(6, 2));
      return new Date(year, month, day);
    }
    
    return new Date(dateStr);
  };

  // 日付別にグループ化
  const groupedRecords = allRecords.reduce((acc, record) => {
    const date = record.groupDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {});

  // スクロール監視
  useEffect(() => {
    const handleScroll = () => {
      if (!recordsRef.current) return;
      
      const scrollTop = recordsRef.current.scrollTop;
      const dates = Object.keys(groupedRecords);
      
      for (const date of dates) {
        const element = dateRefs.current[date];
        if (element) {
          const rect = element.getBoundingClientRect();
          const containerRect = recordsRef.current.getBoundingClientRect();
          
          if (rect.top <= containerRect.top + 100 && rect.bottom >= containerRect.top + 100) {
            setActiveDate(date);
            break;
          }
        }
      }
    };

    const scrollContainer = recordsRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [groupedRecords]);

  // 日付選択時の処理
  const handleDateSelect = (date) => {
    setActiveDate(date);
    const element = dateRefs.current[date];
    if (element && recordsRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // レコード選択の切り替え
  const toggleRecordSelection = (recordId) => {
    setSelectedRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // 全選択/全解除
  const toggleAllRecords = (select) => {
    const newSelection = {};
    allRecords.forEach(record => {
      newSelection[record.recordId] = select;
    });
    setSelectedRecords(newSelection);
  };

  // サマリー生成
  const handleGenerateSummary = async () => {
    const selectedRecordIds = Object.keys(selectedRecords).filter(id => selectedRecords[id]);
    if (selectedRecordIds.length === 0) {
      alert('少なくとも1つの記録を選択してください');
      return;
    }
    
    setIsSummaryGenerating(true);
    setShowSummary(true);
    setSummaryContent('');
    
    try {
      const selectedRecordObjects = allRecords.filter(record => selectedRecords[record.recordId]);
      const content = formatRecordsForSummary(selectedRecordObjects);
      
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: content,
          patientId: id,
          patientName: patientInfo?.name
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSummaryContent(data.generatedText);
    } catch (error) {
      console.error('サマリー生成エラー:', error);
      setSummaryContent('サマリー生成中にエラーが発生しました: ' + error.message);
    } finally {
      setIsSummaryGenerating(false);
    }
  };

  // 記録をサマリー用にフォーマット
  const formatRecordsForSummary = (records) => {
    let content = '';
    
    records.forEach((record, index) => {
      content += `【記録 ${index + 1}】\n`;
      content += `日付：${record.parsedContent.meta.date}\n`;
      content += `診療科：${record.parsedContent.meta.department}\n`;
      content += `担当医：${record.parsedContent.meta.doctor}\n`;
      
      if (record.recordType === 'SOAP') {
        if (record.parsedContent.soap.Subject) {
          content += `Subject：${record.parsedContent.soap.Subject}\n`;
        }
        if (record.parsedContent.soap.Object) {
          content += `Object：${record.parsedContent.soap.Object}\n`;
        }
        if (record.parsedContent.soap.Assessment) {
          content += `Assessment：${record.parsedContent.soap.Assessment}\n`;
        }
        if (record.parsedContent.soap.Plan) {
          content += `Plan：${record.parsedContent.soap.Plan}\n`;
        }
      } else {
        content += `記録内容：${record.parsedContent.freeText}\n`;
      }
      
      content += '\n---\n\n';
    });
    
    return content;
  };

  // 検索ページに戻る
  const handleGoBack = () => {
    router.push('/records');
  };

  // コピー機能
  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert('テキストがコピーされました'))
        .catch(() => alert('コピーに失敗しました'));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('テキストがコピーされました');
      } catch (err) {
        alert('コピーに失敗しました');
      }
      document.body.removeChild(textArea);
    }
  };

  // 選択されたレコード数を計算
  const selectedCount = Object.values(selectedRecords).filter(Boolean).length;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">診療記録を読み込み中...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <PatientHeader 
          patientInfo={patientInfo}
          handleGoBack={handleGoBack}
        />
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
              onClick={fetchPatientRecords}
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
      </Layout>
    );
  }

  return (
    <Layout>
      {/* 患者情報ヘッダー */}
      <PatientHeader 
        patientInfo={patientInfo}
        handleGoBack={handleGoBack}
      />

      {/* メインコンテンツ */}
      <div className="flex h-[calc(100vh-200px)] relative">
        {/* 左カラム: 診療記録日付 */}
        <div className="w-48 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">診療記録日付</h2>
            <button 
              onClick={fetchPatientRecords}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="更新"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {Object.keys(groupedRecords).map((date) => (
              <button
                key={date}
                onClick={() => handleDateSelect(date)}
                className={`w-full text-center py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm ${
                  activeDate === date 
                    ? 'bg-blue-100 border-l-4 border-l-blue-500 font-medium' 
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                {date}
              </button>
            ))}
          </div>
          
          {Object.keys(groupedRecords).length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="h-8 w-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs">記録なし</p>
              </div>
            </div>
          )}
        </div>

        {/* 中央カラム: 記録内容 */}
        <div className="flex-1 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200 bg-gray-50 h-16 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-800">記録内容</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={() => toggleAllRecords(true)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  全選択
                </button>
                <button 
                  onClick={() => toggleAllRecords(false)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  全解除
                </button>
              </div>
              <span className="text-sm text-gray-600">
                {selectedCount}件選択中
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto" ref={recordsRef}>
            {Object.keys(groupedRecords).map((date) => (
              <div key={date} ref={el => dateRefs.current[date] = el}>
                {/* 日付セパレーター */}
                <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-4 py-2 z-10">
                  <h3 className="text-sm font-medium text-gray-700">{date}</h3>
                </div>
                
                {/* その日の記録 */}
                <div className="p-4 space-y-4">
                  {groupedRecords[date].map((record, index) => (
                    <div key={record.recordId} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* レコードヘッダー */}
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedRecords[record.recordId] || false}
                              onChange={() => toggleRecordSelection(record.recordId)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-800">
                                  {record.parsedContent.meta.date}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  record.recordType === 'SOAP' 
                                    ? 'bg-green-100 text-green-800'
                                    : record.recordType === '自由記載'
                                    ? 'bg-blue-100 text-blue-800'
                                    : record.recordType === '超音波'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {record.recordType}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {record.parsedContent.meta.department} | {record.parsedContent.meta.doctor}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            #{index + 1}
                          </div>
                        </div>
                        
                        {/* 追加メタ情報 */}
                        <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                          {record.parsedContent.meta.instructor && (
                            <div>指示者: {record.parsedContent.meta.instructor}</div>
                          )}
                          {record.parsedContent.meta.insuranceType && record.parsedContent.meta.insuranceType !== '不明' && (
                            <div>保険区分: {record.parsedContent.meta.insuranceType}</div>
                          )}
                          {record.parsedContent.meta.tags && (
                            <div>タグ: {record.parsedContent.meta.tags}</div>
                          )}
                        </div>
                      </div>
{/* レコード内容 */}
                      <div className="p-4">
                        {record.recordType === 'SOAP' ? (
                          // SOAPフォーマット
                          <div className="space-y-3">
                            {['Subject', 'Object', 'Assessment', 'Plan'].map(section => {
                              const content = record.parsedContent.soap[section];
                              if (!content) return null;
                              
                              return (
                                <div key={section} className="border-l-3 border-gray-300 pl-3">
                                  <h4 className="font-medium text-gray-800 text-sm mb-1">{section}</h4>
                                  <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                                    {content}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // 自由記載・超音波フォーマット
                          <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                            {record.parsedContent.freeText || '記録内容なし'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
           
           {allRecords.length === 0 && (
             <div className="flex items-center justify-center h-full text-gray-500">
               <div className="text-center">
                 <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <p>診療記録がありません</p>
               </div>
             </div>
           )}
         </div>
       </div>

       {/* 右カラム: AIサマリー */}
       <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
         <div className="p-3 border-b border-gray-200 bg-gray-50 h-16 flex items-center justify-between">
           <h2 className="text-lg font-semibold text-gray-800">AIサマリー</h2>
           <button
             onClick={handleGenerateSummary}
             disabled={selectedCount === 0 || isSummaryGenerating}
             className={`px-4 py-2 rounded-md font-medium text-sm ${
               selectedCount > 0 && !isSummaryGenerating
                 ? 'bg-blue-600 text-white hover:bg-blue-700'
                 : 'bg-gray-300 text-gray-500 cursor-not-allowed'
             }`}
           >
             {isSummaryGenerating ? (
               <span className="flex items-center">
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 生成中...
               </span>
             ) : (
               'サマリー生成'
             )}
           </button>
         </div>
         
         <div className="p-3 bg-blue-50 border-b border-gray-200">
           <p className="text-sm text-blue-800">
             選択した {selectedCount} 件の記録からAIサマリーを生成
           </p>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4">
           <div className="border border-gray-200 rounded-md p-4 bg-gray-50 min-h-[200px]">
             {isSummaryGenerating ? (
               <div className="flex items-center justify-center h-full">
                 <div className="text-center">
                   <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   <p className="text-gray-600">AIサマリーを生成中...</p>
                 </div>
               </div>
             ) : summaryContent ? (
               <div className="whitespace-pre-line text-gray-700 leading-relaxed text-sm">
                 {summaryContent}
               </div>
             ) : (
               <div className="text-center text-gray-500 py-8">
                 <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                 </svg>
                 <p className="text-sm">記録を選択してサマリーを生成</p>
                 <p className="text-xs text-gray-400 mt-1">チェックボックスで記録を選択後、「サマリー生成」ボタンを押してください</p>
               </div>
             )}
           </div>
         </div>
         
         {/* サマリーアクション */}
         {summaryContent && !isSummaryGenerating && (
           <div className="p-4 border-t border-gray-200 bg-gray-50">
             <div className="flex space-x-2">
               <button 
                 className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                 onClick={() => copyToClipboard(summaryContent)}
               >
                 <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                 </svg>
                 コピー
               </button>
               <button className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                 <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 保存
               </button>
             </div>
             <button 
               className="w-full mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
               onClick={() => {
                 setSummaryContent('');
                 setSelectedRecords({});
               }}
             >
               クリア
             </button>
           </div>
         )}
       </div>
     </div>
   </Layout>
 );
}