// pages/appointments/index.js
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 予約データを取得
  const fetchAppointments = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/proxy/appointments/${selectedDate}`);
      const data = await response.json();
      
      if (response.ok) {
        setAppointments(data.appointments || []);
      } else {
        setError(data.error || 'データ取得に失敗しました');
      }
    } catch (err) {
      setError('サーバーに接続できませんでした');
    } finally {
      setIsLoading(false);
    }
  };

  // 日付変更時に自動取得
  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  // 日付フォーマット
  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    
    return `${year}年${month}月${day}日 (${dayOfWeek})`;
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">予約管理</h1>
        <p className="text-gray-600 mt-2">日別の予約一覧を確認できます</p>
      </div>

      {/* 日付選択 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              予約日を選択
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="pt-6">
            <button
              onClick={fetchAppointments}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {isLoading ? '読み込み中...' : '更新'}
            </button>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* 予約一覧 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              {formatDisplayDate(selectedDate)}の予約一覧
            </h2>
            <span className="text-sm text-gray-600">
              {appointments.length}件の予約
            </span>
          </div>
        </div>

        <div className="overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">この日の予約はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {appointments.map((appointment, index) => (
                <AppointmentItem 
                  key={appointment.id || index} 
                  appointment={appointment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function AppointmentItem({ appointment }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="p-4 hover:bg-gray-50 transition-colors relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-medium text-blue-600 min-w-[60px]">
            {appointment.appointmentTime || 'N/A'}
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {appointment.displayContent || '予約'}
            </span>
            <div className="text-gray-800 font-medium">
              {appointment.patientInfo?.name || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">
              ({appointment.patientInfo?.gender || 'N/A'}, {appointment.patientInfo?.birthDate || 'N/A'})
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          ID: {appointment.patientCd || 'N/A'}
        </div>
      </div>
      
      {/* コメント表示 */}
      {appointment.comment && (
        <div className="mt-2 text-sm text-gray-600 bg-yellow-50 p-2 rounded">
          <strong>コメント:</strong> {appointment.comment}
        </div>
      )}

      {/* ホバー時のツールチップ */}
      {showTooltip && (appointment.initialUser || appointment.currentUser) && (
        <div className="absolute z-10 bg-gray-800 text-white text-xs rounded p-2 shadow-lg whitespace-nowrap"
             style={{ top: '-70px', left: '50%', transform: 'translateX(-50%)' }}>
          <div>初回登録: {appointment.initialRegDate} ({appointment.initialUser?.name})</div>
          <div>最終更新: {appointment.currentRegDate} ({appointment.currentUser?.name})</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}