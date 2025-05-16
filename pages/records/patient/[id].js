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
      
      // Pythonバックエンドからデータを取得（プロキシ経由）
      const response = await fetch(`/api/proxy/patient-records/${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`患者記録取得エラー: ステータス=${response.status}, レスポンス=`, errorText);
        throw new Error(`APIエラー: ${response.status} - ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API レスポンス:', data);
      console.log('記録文字列の長さ:', data.records ? data.records.length : 0);
      
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
        console.log('解析された記録数:', parsedRecords.length);
        
        // 日付の新しい順（降順）にソート
        parsedRecords.sort((a, b) => {
          // 日付文字列を比較用の形式に変換
          const dateA = convertToComparableDate(a['日付']);
          const dateB = convertToComparableDate(b['日付']);
          return dateB - dateA; // 降順
        });
        
        setAllRecords(parsedRecords);
        setRecords(parsedRecords);
        
        // 初期状態ですべての記録を選択解除
        const initialSelection = {};
        parsedRecords.forEach(record => {
          initialSelection[record.recordId || record.id] = false;
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
    
    // 日付がすでに「YYYY年MM月DD日」形式の場合
    const japaneseFormatMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (japaneseFormatMatch) {
      const year = parseInt(japaneseFormatMatch[1]);
      const month = parseInt(japaneseFormatMatch[2]) - 1; // 月は0から始まる
      const day = parseInt(japaneseFormatMatch[3]);
      return new Date(year, month, day);
    }
    
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
    
    // YYYY/MM/DD または YYYY-MM-DD 形式
    const normalDateMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
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
    if (!recordsString || typeof recordsString !== 'string') {
      return [];
    }
    
    const records = [];
    // '---' で区切られた記録をパース
    const recordStrings = recordsString.split('\n\n---\n\n');
    
    recordStrings.forEach((recordStr, index) => {
      const record = { id: index, recordId: index };
      const lines = recordStr.split('\n');
      
      let currentSection = '';
      let sectionContent = '';
      
      lines.forEach(line => {
        // 'セクション：内容' の形式を検出
        const sectionMatch = line.match(/^([^：]+)：(.*)$/);
        
        if (sectionMatch) {
          // 前のセクションがあれば保存
          if (currentSection && sectionContent) {
            record[currentSection] = sectionContent.trim();
          }
          
          currentSection = sectionMatch[1].trim();
          sectionContent = sectionMatch[2];
        } else if (currentSection) {
          // 継続行を追加
          sectionContent += '\n' + line;
        }
      });
      
      // 最後のセクションを保存
      if (currentSection && sectionContent) {
        record[currentSection] = sectionContent.trim();
      }
      
      // 記載区分の設定
      if (record['Subject'] || record['Object'] || record['Assessment'] || record['Plan']) {
        record['記載区分'] = 'SOAP';
      } else if (record['記載方法']) {
        record['記載区分'] = record['記載方法'];
      } else {
        record['記載区分'] = '記録';
      }
      
      // カテゴリは診療科
      record.category = record['診療科'] || '不明';
      
      // JSONテキストを適切に処理
      Object.keys(record).forEach(key => {
        const value = record[key];
        if (typeof value === 'string' && 
           (value.includes('{"Text"') || value.includes('"Text":'))) {
          try {
            // テキスト抽出を試みる
            record[key] = extractTextFromJSON(value);
          } catch (e) {
            // 抽出に失敗した場合は元の値を保持
            console.warn(`JSONパース失敗 (${key}):`, e);
          }
        }
      });
      
      records.push(record);
    });
    
    return records;
  };

  // JSONテキストからTextフィールドを抽出
  const extractTextFromJSON = (jsonText) => {
    if (!jsonText) return '';
    
    try {
      // 正規表現でTextフィールドの値を抽出
      const textMatches = jsonText.match(/"Text":"([^"]*)"/g);
      if (textMatches) {
        // 抽出したテキストを整形
        return textMatches.map(match => {
          const extracted = match.replace(/"Text":"/, '').slice(0, -1);
          return extracted;
        }).join('');
      }
      
      return jsonText; // 抽出に失敗した場合は元のテキスト
    } catch (e) {
      console.warn('JSONテキスト抽出エラー:', e);
      return jsonText; // エラー時は元のテキスト
    }
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