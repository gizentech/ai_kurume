// pages/appointments/index.js (修正版)
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [step, setStep] = useState(1); // デバッグステップ

  // pages/appointments/index.js の testConnections 関数を修正
const testConnections = async () => {
  setIsLoading(true);
  setError('');
  setStep(1);
  
  try {
    console.log('Step 1: デバッグAPIテスト中...');
    setStep(2);
    
    const debugResponse = await fetch(`/api/debug/appointment-test?date=${selectedDate}`);
    
    console.log('デバッグAPI応答ステータス:', debugResponse.status);
    
    if (!debugResponse.ok) {
      // エラーの詳細を取得
      let errorDetails;
      try {
        errorDetails = await debugResponse.json();
      } catch (e) {
        errorDetails = await debugResponse.text();
      }
      
      console.error('デバッグAPIエラー詳細:', errorDetails);
      throw new Error(`デバッグAPI error: ${debugResponse.status} - ${JSON.stringify(errorDetails)}`);
    }
    
    const debugData = await debugResponse.json();
    setDebugInfo(debugData);
    setStep(3);
    
    if (debugData.success) {
      console.log('Step 2: 接続成功、データ取得中...');
      setStep(4);
      
      if (debugData.appointments && debugData.appointments.appointments) {
        setAppointments(debugData.appointments.appointments);
        setStep(5);
        console.log(`Step 3: 完了 - ${debugData.appointments.appointments.length}件取得`);
      } else {
        setAppointments([]);
        console.log('Step 3: 完了 - データなし');
      }
    } else {
      throw new Error('デバッグテストが失敗しました: ' + JSON.stringify(debugData));
    }
    
  } catch (error) {
    console.error('接続テストエラー:', error);
    setError(`Step ${step}でエラー: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  const testProxyApi = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('プロキシAPIテスト中...');
      const response = await fetch(`/api/proxy/appointments/${selectedDate}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`プロキシAPI error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      setAppointments(data.appointments || []);
      console.log(`プロキシAPI成功: ${data.appointments?.length || 0}件取得`);
      
    } catch (error) {
      console.error('プロキシAPIエラー:', error);
      setError(`プロキシAPI: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* デバッグ情報表示 */}
      {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-6">
          <h3 className="font-medium text-blue-800 mb-2">接続状況 (Step {step})</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>Pythonサーバー: {debugInfo.health?.status === 'ok' ? '✅ 正常' : '❌ エラー'}</p>
            {debugInfo.health?.patient_count && (
              <p>患者数: {debugInfo.health.patient_count}</p>
            )}
            {debugInfo.health?.appointment_count && (
              <p>予約数: {debugInfo.health.appointment_count}</p>
            )}
            <div className="mt-2 text-xs">
              <p>Health URL: {debugInfo.urls?.health}</p>
              <p>Appointments URL: {debugInfo.urls?.appointments}</p>
            </div>
          </div>
        </div>
      )}

      {/* 日付選択とテストボタン */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-4 flex-wrap">
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
          
          <div className="pt-6 space-x-2">
            <button
              onClick={testConnections}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Step {step}...
                </span>
              ) : (
                '接続テスト'
              )}
            </button>
            
            <button
              onClick={testProxyApi}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              プロキシテスト
            </button>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
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
                <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Step {step}: 処理中...</p>
              </div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
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