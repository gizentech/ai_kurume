// components/SummarySidebar.js
import { useState, useEffect } from 'react';

export default function SummarySidebar({ 
  selectedRecords, 
  records, 
  patientId, 
  patientName,
  setIsGenerating,
  isGenerating,
  generatedText,
  setGeneratedText
}) {
  const [displayedText, setDisplayedText] = useState('');
  
  // 選択された記録をカウント
  const selectedCount = Object.values(selectedRecords).filter(Boolean).length;
  
  // 生成テキストが更新されたときのリアルタイム表示
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
  }, [isGenerating, generatedText, setIsGenerating]);
  
  // SOAPセクションの優先順位
  const soapOrder = ['Subject', 'Object', 'Assessment', 'Plan'];

  // 主要なセクションかどうかを判定
  const isMainSection = (section) => {
    return soapOrder.includes(section) || 
           ['主訴', '現病歴', '診察所見', '診断', '処置・指導・処方'].includes(section);
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
    if (selectedCount === 0) {
      alert('少なくとも1つの記録を選択してください');
      return;
    }
    
    setIsGenerating(true);
    setDisplayedText(''); // 表示テキストをリセット
    
    try {
      const formattedRecords = formatSelectedRecordsForGeneration();
      
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: formattedRecords,
          patientId: patientId,
          patientName: patientName
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setGeneratedText(data.generatedText);
    } catch (error) {
      console.error('Error generating summary:', error);
      setDisplayedText('サマリー生成中にエラーが発生しました: ' + error.message);
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
      // フォールバック
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

  return (
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
  );
}