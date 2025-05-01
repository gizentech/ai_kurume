// pages/generation/index.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';

export default function PatientSearch() {
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  const suggestionsRef = useRef(null);
  const router = useRouter();

  // Load patient data for autocomplete on component mount
  useEffect(() => {
    fetchPatients();
    const savedHistory = localStorage.getItem('patientHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);
  
  // Handle clicking outside of suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [suggestionsRef]);
  
  // Filter patients based on patient ID input
  useEffect(() => {
    if (patientId) {
      const filtered = patients.filter(patient => 
        patient['患者ID'].includes(patientId) || 
        patient['患者名'].includes(patientId)
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients([]);
    }
  }, [patientId, patients]);
  
  // Load patient list for autocomplete
  const fetchPatients = async () => {
    try {
      console.log("Fetching patients list...");
      const response = await fetch('/api/patient-search');
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        // エラーレスポンスの内容を確認
        const errorText = await response.text();
        console.error("Error response text:", errorText);
        throw new Error(`Failed to fetch patients: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Patients data received:", data);
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Search for patient and navigate to patient detail page
  const handleSearch = () => {
    if (!patientId.trim()) return;
    
    setIsLoading(true);
    router.push(`/generation/patient/${patientId}`);
  };

  // Handle patient selection from autocomplete
  const handleSelectPatient = (patient) => {
    setPatientId(patient['患者ID']);
    setShowSuggestions(false);
    
    // Navigate to patient detail page
    setTimeout(() => {
      router.push(`/generation/patient/${patient['患者ID']}`);
    }, 100);
  };
  
  // Load history item
  const loadHistoryItem = (item) => {
    router.push(`/generation/patient/${item.patientId}`);
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">患者サマリーAI生成</h1>
          <p className="text-xl text-gray-600">患者IDまたは患者名を入力して検索</p>
        </div>
        
        <div className="w-full max-w-2xl mx-auto relative">
          <div className="relative">
            <input 
              type="text" 
              className="w-full px-5 py-4 text-lg border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              placeholder="患者IDまたは患者名を入力..."
              value={patientId}
              onChange={(e) => {
                setPatientId(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            
            {/* Search button */}
            <button
              className="absolute right-0 top-0 h-full px-6 bg-blue-500 text-white rounded-r-full hover:bg-blue-600 focus:outline-none"
              onClick={handleSearch}
              disabled={isLoading}
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
          </div>
          
          {/* Autocomplete suggestions */}
          {showSuggestions && filteredPatients.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-2 bg-white shadow-lg rounded-lg border border-gray-200 max-h-60 overflow-auto"
            >
              {filteredPatients.map((patient, index) => (
                <div 
                  key={index}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="font-medium">{patient['患者ID']}</div>
                  <div className="text-sm text-gray-600">{patient['患者名']} ({patient['性別']}, {patient['生年月日']})</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="w-full max-w-2xl mx-auto mt-6 text-center">
          <p className="text-sm text-gray-500">または <a href="#" onClick={(e) => {
            e.preventDefault();
            const historyModal = document.getElementById('historyModal');
            historyModal.classList.remove('hidden');
          }} className="text-blue-500 hover:underline">履歴から選択</a></p>
        </div>
      </div>
      
      {/* History Modal */}
      <div id="historyModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">最近の履歴</h3>
            <button 
              onClick={() => {
                const historyModal = document.getElementById('historyModal');
                historyModal.classList.add('hidden');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">履歴がありません</p>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">患者ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">患者名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">診療科</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日時</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.patientId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.patientName || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.specialty}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            loadHistoryItem(item);
                            const historyModal = document.getElementById('historyModal');
                            historyModal.classList.add('hidden');
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          選択
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                const historyModal = document.getElementById('historyModal');
                historyModal.classList.add('hidden');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}