// pages/records/index.js の修正
import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';

export default function PatientSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  // 検索実行時の処理
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // 患者IDとして直接検索
    setIsLoading(true);
    router.push(`/records/patient/${searchQuery.trim()}`);
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">診療録検索</h1>
          <p className="text-xl text-gray-600">患者IDを入力して検索してください</p>
        </div>
        
        <div className="w-full max-w-2xl mx-auto relative">
          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text" 
              className="w-full px-5 py-4 text-lg border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder="患者IDを入力..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <button
              type="submit"
              className="absolute right-0 top-0 h-full px-6 bg-blue-500 text-white rounded-r-full hover:bg-blue-600 focus:outline-none"
              disabled={isLoading || !searchQuery.trim()}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </form>
        </div>
        
        {error && (
          <div className="w-full max-w-2xl mx-auto mt-4 text-center text-red-500">
            {error}
          </div>
        )}

        <div className="w-full max-w-2xl mx-auto mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">使い方</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>患者IDを入力してください。</li>
              <li>検索ボタンをクリックするか、Enterキーを押して検索します。</li>
              <li>患者の診療録が表示されます。</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md">
              <p className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                正確な検索のためには、8桁の患者IDを入力してください（例: 00000001）。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}