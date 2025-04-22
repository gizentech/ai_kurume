// pages/generation/patient/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';

export default function PatientRecord() {
  const router = useRouter();
  const { id } = router.query;
  
  const [patientName, setPatientName] = useState('');
  const [patientRecords, setPatientRecords] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);

  // 診療科選択を削除 - この変数と関連する状態を削除

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
    setPatientRecords('');
    
    try {
      // Call your API endpoint
      console.log(`Fetching patient records for ID: ${id}`);
      const response = await fetch(`/api/patient-records/${id}`);
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        // エラーレスポンスの内容を確認
        const errorText = await response.text();
        console.error("Error response text:", errorText);
        throw new Error(`Failed to fetch patient records: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Patient records data:", data);
      
      if (data.error) {
        // Display error message from API
        alert(data.error);
        setPatientRecords('');
        setPatientName('');
      } else {
        // Process successful response
        setPatientRecords(data.records);
        setPatientName(data.patientName);
      }
    } catch (error) {
      console.error('Error fetching patient records:', error);
      alert('患者記録の取得中にエラーが発生しました: ' + (error.message || 'Unknown error'));
      setPatientRecords('');
      setPatientName('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!patientRecords.trim()) return;
    
    setIsLoading(true);
    setDisplayedText(''); // Reset displayed text
    
    try {
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: patientRecords,
          patientId: id
          // specialty パラメータを削除
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
        // specialty 情報を削除
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
          <h2 className="text-lg font-semibold text-gray-800 mb-3">診療記録</h2>
          
          {/* 診療科選択部分を削除 */}

          {/* Patient records display */}
          <div className="mb-6">
            <label htmlFor="records" className="block text-sm font-medium text-gray-700 mb-2">
              診療経過
            </label>
            <textarea
              id="records"
              rows="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={patientRecords}
              onChange={(e) => setPatientRecords(e.target.value)}
              readOnly={false}
            ></textarea>
          </div>

          <div className="flex justify-between items-center">
            <button
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isLoading || !patientRecords ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={handleGenerate}
              disabled={isLoading || !patientRecords}
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

            <div className="flex space-x-2">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => setPatientRecords('')}
              >
                クリア
              </button>
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => fetchPatientRecords()}
              >
                元に戻す
              </button>
            </div>
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
                onClick={() => {
                  navigator.clipboard.writeText(generatedText)
                    .then(() => alert('テキストがコピーされました'))
                    .catch(err => alert('コピーに失敗しました: ' + err));
                }}
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