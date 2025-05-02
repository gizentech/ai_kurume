// pages/generation/patient/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';

export default function PatientRecord() {
  const router = useRouter();
  const { id } = router.query;
  
  const [patientName, setPatientName] = useState('');
  const [patientRecords, setPatientRecords] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState({});
  const [formattedText, setFormattedText] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);

  // Load history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('patientHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('patientHistory', JSON.stringify(history));
  }, [history]);

  // Fetch patient records when ID changes
  useEffect(() => {
    if (id) {
      fetchPatientRecords();
    }
  }, [id]);

  // Update formatted text when selected records change
  useEffect(() => {
    updateFormattedText();
  }, [selectedRecords]);

  // Real-time display effect
  useEffect(() => {
    if (isGenerating && generatedText) {
      let index = 0;
      const timer = setInterval(() => {
        if (index < generatedText.length) {
          setDisplayedText(prev => prev + generatedText.charAt(index));
          index++;
        } else {
          clearInterval(timer);
          setIsGenerating(false);
        }
      }, 5); // Adjust character display speed

      return () => clearInterval(timer);
    }
  }, [isGenerating, generatedText]);

  // Fetch patient records based on ID
  const fetchPatientRecords = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setPatientRecords([]);
    
    try {
      // Call your API endpoint
      console.log(`Fetching patient records for ID: ${id}`);
      const response = await fetch(`/api/patient-records/${id}`);
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response text:", errorText);
        throw new Error(`Failed to fetch patient records: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Patient records data:", data);
      
      if (data.error) {
        // Display error message from API
        alert(data.error);
        setPatientRecords([]);
        setPatientName('');
      } else {
        // Process successful response - parse the records into separate entries
        setPatientName(data.patientName);
        
        const recordsArray = data.records.split('\n\n---\n\n').map((record, index) => {
          const dateMatch = record.match(/日付：(.+)/);
          const date = dateMatch ? dateMatch[1].trim() : `記録 ${index + 1}`;
          return { id: index, date, content: record };
        });
        
        setPatientRecords(recordsArray);
        
        // Set all records as selected by default
        const initialSelection = {};
        recordsArray.forEach(record => {
          initialSelection[record.id] = true;
        });
        setSelectedRecords(initialSelection);
      }
    } catch (error) {
      console.error('Error fetching patient records:', error);
      alert('患者記録の取得中にエラーが発生しました: ' + (error.message || 'Unknown error'));
      setPatientRecords([]);
      setPatientName('');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle record selection
  const toggleRecordSelection = (recordId) => {
    setSelectedRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Select/deselect all records
  const toggleAllRecords = (select) => {
    const newSelection = {};
    patientRecords.forEach(record => {
      newSelection[record.id] = select;
    });
    setSelectedRecords(newSelection);
  };

  // Update the formatted text based on selected records
  const updateFormattedText = () => {
    const selectedTexts = patientRecords
      .filter(record => selectedRecords[record.id])
      .map(record => record.content);
    
    setFormattedText(selectedTexts.join('\n\n---\n\n'));
  };

  const handleGenerate = async () => {
    if (!formattedText.trim()) return;
    
    setIsLoading(true);
    setDisplayedText(''); // Reset displayed text
    
    try {
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: formattedText,
          patientId: id
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setGeneratedText(data.generatedText);
      setIsGenerating(true); // Start real-time display
      
      // Add to history if not already present
      const historyEntry = {
        patientId: id,
        patientName,
        timestamp: new Date().toISOString(),
        summary: data.generatedText.substring(0, 100) + '...'
      };
      
      setHistory(prev => {
        const existingEntryIndex = prev.findIndex(item => item.patientId === id);
        if (existingEntryIndex >= 0) {
          const updated = [...prev];
          updated[existingEntryIndex] = historyEntry;
          return updated;
        }
        return [historyEntry, ...prev].slice(0, 10); // Keep last 10 entries
      });
    } catch (error) {
      console.error('Error generating text:', error);
      alert('テキスト生成中にエラーが発生しました: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearGeneration = () => {
    setGeneratedText('');
    setDisplayedText('');
  };
  
  // コピー機能を修正
  const copyToClipboard = (text) => {
    // まずクリップボードAPIが利用可能かチェック
    if (navigator.clipboard && window.isSecureContext) {
      // セキュアコンテキストでクリップボードAPIが使える場合
      navigator.clipboard.writeText(text)
        .then(() => alert('テキストがコピーされました'))
        .catch(err => alert('コピーに失敗しました: ' + err));
    } else {
      // フォールバック手法: テキストエリアを使用
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';  // スクロールを防止
        textArea.style.opacity = '0';       // ユーザーに見えないように
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

  // Count selected records
  const selectedCount = Object.values(selectedRecords).filter(selected => selected).length;
  const totalRecords = patientRecords.length;

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">診療サマリー生成</h1>
          <p className="text-gray-600 mt-2">
            患者ID: {id}{patientName ? ` | 患者名: ${patientName}` : ''}
          </p>
        </div>
        <button
          onClick={() => router.push('/generation')}
          className="px-4 py-2 text-blue-600 hover:text-blue-800"
        >
          ← 検索に戻る
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column: Input form */}
        <div className="w-full md:w-1/2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">診療記録</h2>
            <div className="text-sm text-gray-600">
              {selectedCount}/{totalRecords} 件選択中
            </div>
          </div>
          
          {/* Selection buttons */}
          <div className="flex space-x-2 mb-4">
            <button 
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
              onClick={() => toggleAllRecords(true)}
            >
              すべて選択
            </button>
            <button 
              className="px-3 py-1 text-sm bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
              onClick={() => toggleAllRecords(false)}
            >
              選択解除
            </button>
          </div>
          
          {/* Patient records display with checkboxes */}
          <div className="mb-6 max-h-[500px] overflow-y-auto border border-gray-200 rounded-md">
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : patientRecords.length === 0 ? (
              <div className="text-center text-gray-500 py-12">診療記録が見つかりません</div>
            ) : (
              patientRecords.map((record) => (
                <div 
                  key={record.id} 
                  className={`border-b border-gray-200 last:border-b-0 ${selectedRecords[record.id] ? 'bg-blue-50' : ''}`}
                >
                  <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleRecordSelection(record.id)}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 pt-1">
                        <div className={`w-5 h-5 border ${selectedRecords[record.id] ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'} rounded flex items-center justify-center`}>
                          {selectedRecords[record.id] && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium text-blue-600 mb-1">{record.date}</div>
                        <div className="text-sm text-gray-700 whitespace-pre-line">
                          {record.content.split('\n').slice(1, 4).join('\n')}
                          {record.content.split('\n').length > 4 && '...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isLoading || patientRecords.length === 0 || selectedCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={handleGenerate}
              disabled={isLoading || patientRecords.length === 0 || selectedCount === 0}
            >
              {isLoading ? (
                <span className="flex items-center">
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

            <button 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              onClick={() => fetchPatientRecords()}
            >
              記録を更新
            </button>
          </div>
        </div>

        {/* Right column: Generated result */}
        <div className="w-full md:w-1/2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-between">
            <span>診療サマリー</span>
            {isGenerating && (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            )}
            <button 
              onClick={handleClearGeneration}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              クリア
            </button>
          </h2>
          <div className="border border-gray-200 rounded-md p-4 bg-gray-50 whitespace-pre-line h-[500px] overflow-y-auto">
            {displayedText || <span className="text-gray-400">AIからの回答がここに表示されます</span>}
          </div>
          
          {generatedText && !isGenerating && (
            <div className="mt-4 flex justify-end space-x-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => copyToClipboard(generatedText)}
              >
                <i className="far fa-copy mr-2"></i>コピー
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                <i className="far fa-save mr-2"></i>保存
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                <i className="fas fa-edit mr-2"></i>編集
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}