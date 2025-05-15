// components/PatientHeader.js
export default function PatientHeader({ patientInfo, handleGoBack }) {
  return (
    <div className="sticky top-0 z-10 bg-gray-100 pt-2 pb-4 px-6 -mx-6 shadow-sm">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">患者診療録</h1>
          {patientInfo && (
            <div className="text-gray-600 mt-2">
              <p>患者ID: <span className="font-medium">{patientInfo.id}</span> | 
                 氏名: <span className="font-medium">{patientInfo.name}</span></p>
              <p>性別: {patientInfo.gender} | 生年月日: {patientInfo.birthDate}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleGoBack}
          className="mt-4 md:mt-0 px-4 py-2 text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          検索に戻る
        </button>
      </div>
    </div>
  );
}