// pages/records/patient/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import PatientHeader from '../../../components/PatientHeader';
import RecordsList from '../../../components/RecordsList';
import SummarySidebar from '../../../components/SummarySidebar';

export default function PatientRecordPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [patientInfo, setPatientInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('すべて');
  const [selectedRecords, setSelectedRecords] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  
  // 患者IDが変更されたときにデータをフェッチ
  useEffect(() => {
    if (id) {
      fetchPatientRecords();
    }
  }, [id]);
  
  // タブが変更されたときに表示する記録をフィルタリング
  useEffect(() => {
    if (activeTab === 'すべて') {
      setRecords(allRecords);
    } else {
      setRecords(allRecords.filter(record => record.category === activeTab));
    }
  }, [activeTab, allRecords]);

  // 患者記録を取得する関数
  const fetchPatientRecords = async () => {
    setIsLoading(true);
    setError('');
    setRecords([]);
    setAllRecords([]);
    setSelectedRecords({});

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
        
        // 日付の新しい順（降順）にソート
        parsedRecords.sort((a, b) => {
          // 日付文字列を比較用の形式に変換
          const dateA = convertToComparableDate(a['日付']);
          const dateB = convertToComparableDate(b['日付']);
          return dateB - dateA; // 降順
        });
        
        // 直近6ヶ月分のみをフィルタリング
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const filteredRecords = parsedRecords.filter(record => {
          const recordDate = convertToComparableDate(record['日付']);
          return recordDate >= sixMonthsAgo;
        });
        
        setAllRecords(filteredRecords);
        setRecords(filteredRecords);
        
        // 初期状態ですべての記録を開く
        const initialExpanded = {};
        filteredRecords.forEach(record => {
          initialExpanded[record.recordId] = true; // デフォルトで開く
        });
        
        // 記録を非選択に初期化
        const initialSelection = {};
        filteredRecords.forEach(record => {
          initialSelection[record.recordId] = false;
        });
        setSelectedRecords(initialSelection);
      }
    } catch (err) {
      console.error('患者記録取得エラー:', err);
      setError('診療記録の取得中にエラーが発生しました: ' + err.message);
      setPatientInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 日付文字列を比較可能な日付オブジェクトに変換
  const convertToComparableDate = (dateStr) => {
    if (!dateStr) return new Date(0); // 日付がなければ最も古い日付を返す
    
    // YYYYMMDDHHMMSS 形式
    const fullDateMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
    if (fullDateMatch) {
      const year = parseInt(fullDateMatch[1]);
      const month = parseInt(fullDateMatch[2]) - 1; // 月は0から始まる
      const day = parseInt(fullDateMatch[3]);
      const hour = fullDateMatch[4] ? parseInt(fullDateMatch[4]) : 0;
      const minute = fullDateMatch[5] ? parseInt(fullDateMatch[5]) : 0;
      const second = fullDateMatch[6] ? parseInt(fullDateMatch[6]) : 0;
      return new Date(year, month, day, hour, minute, second);
    }
    
    // YYYY/MM/DD または YYYY-MM-DD または YYYY年MM月DD日 形式
    const normalDateMatch = dateStr.match(/^(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
    if (normalDateMatch) {
      const year = parseInt(normalDateMatch[1]);
      const month = parseInt(normalDateMatch[2]) - 1;
      const day = parseInt(normalDateMatch[3]);
      return new Date(year, month, day);
    }
    
    // どの形式にも一致しない場合
    return new Date(dateStr);
  };

// 記録文字列を構造化オブジェクトに変換
const parseRecords = (recordsString) => {
  const records = [];
  const recordStrings = recordsString.split('\n\n---\n\n');
  
  recordStrings.forEach((recordStr, index) => {
    const record = { id: index, recordId: index };
    const lines = recordStr.split('\n');
    
    let currentSection = '';
    let sectionContent = '';
    
    lines.forEach(line => {
      // メインセクション（Subject, Objectなど）を検出
      const sectionMatch = line.match(/^([^：]+)：(.*)$/);
      
      if (sectionMatch) {
        // 前のセクションがあれば保存
        if (currentSection && sectionContent) {
          record[currentSection] = sectionContent.trim();
        }
        
        currentSection = sectionMatch[1].trim();
        sectionContent = sectionMatch[2].trim();
        
        // JSONデータを処理
        if (sectionContent.startsWith('[{') && sectionContent.includes('Text')) {
          try {
            // JSONパース試行
            const jsonData = JSON.parse(sectionContent);
            // テキスト部分を抽出
            if (Array.isArray(jsonData)) {
              sectionContent = jsonData.map(item => item.Text || '').join(' ').trim();
            }
          } catch (e) {
            // JSONパースエラー時は元のテキストを使用
            console.warn('JSONパースエラー:', e);
          }
        }
      } else if (currentSection) {
        // JSONデータ行を処理
        if (line.startsWith('[{') && line.includes('Text')) {
          try {
            const jsonData = JSON.parse(line);
            if (Array.isArray(jsonData)) {
              const extractedText = jsonData.map(item => item.Text || '').join(' ').trim();
              sectionContent += '\n' + extractedText;
            }
          } catch (e) {
            // 解析エラー時は元のテキストを追加
            sectionContent += '\n' + line;
          }
        } else {
          // 通常のテキスト行を追加
          sectionContent += '\n' + line;
        }
      }
    });
    
    // 最後のセクションを保存
    if (currentSection && sectionContent) {
      record[currentSection] = sectionContent.trim();
    }
    
    // 記載区分を設定（SOAPまたはFree形式など）
    if (record['Subject'] || record['Object'] || record['Assessment'] || record['Plan']) {
      record['記載区分'] = 'SOAP';
    } else if (record['記載方法']) {
      record['記載区分'] = record['記載方法'];
    } else {
      record['記載区分'] = '記録';
    }
    
    // カテゴリは診療科
    record.category = record['診療科'] || '不明';
    
    records.push(record);
  });
  
  return records;
};

  // カテゴリ（診療科）リストを取得
  const categories = Array.from(new Set(allRecords.map(record => record.category))).filter(Boolean);
  
  // 検索ページに戻る
  const handleGoBack = () => {
    router.push('/records');
  };

  return (
    <Layout>
      {/* 患者情報ヘッダー */}
      <PatientHeader 
        patientInfo={patientInfo}
        handleGoBack={handleGoBack}
      />

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
      ) : (
        <div className="flex flex-col md:flex-row gap-6 mt-4">
          {/* 左側: 記録リスト */}
          <RecordsList 
            records={records}
            allRecords={allRecords}
            categories={categories}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedRecords={selectedRecords}
            setSelectedRecords={setSelectedRecords}
            onRefresh={fetchPatientRecords}
            defaultExpanded={true} // デフォルトですべて展開
          />
          
          {/* 右側: AI生成サマリー */}
          <SummarySidebar 
            selectedRecords={selectedRecords}
            records={allRecords}
            patientId={id}
            patientName={patientInfo?.name}
            setIsGenerating={setIsGenerating}
            isGenerating={isGenerating}
            generatedText={generatedText}
            setGeneratedText={setGeneratedText}
          />
        </div>
      )}
    </Layout>
  );
}