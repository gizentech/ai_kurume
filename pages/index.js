// pages/index.js
import Layout from '../components/Layout';

export default function Dashboard() {
  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-gray-600 mt-2">医療看護記録システムへようこそ</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-full p-3">
              <i className="fas fa-file-medical text-white text-xl"></i>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold">医療記録</h2>
              <p className="text-3xl font-bold text-gray-800">124</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-full p-3">
              <i className="fas fa-robot text-white text-xl"></i>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold">AI生成文章</h2>
              <p className="text-3xl font-bold text-gray-800">42</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-full p-3">
              <i className="fas fa-user-md text-white text-xl"></i>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold">利用者数</h2>
              <p className="text-3xl font-bold text-gray-800">18</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">最近の活動</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left">日時</th>
                <th className="py-3 px-4 text-left">操作</th>
                <th className="py-3 px-4 text-left">ユーザー</th>
                <th className="py-3 px-4 text-left">詳細</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4">2025/04/{16 - index}</td>
                  <td className="py-3 px-4">{index % 2 === 0 ? '記録追加' : 'AI生成'}</td>
                  <td className="py-3 px-4">医師 {index + 1}</td>
                  <td className="py-3 px-4 text-blue-600 hover:underline cursor-pointer">詳細を見る</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}