// pages/json-converter/index.js
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';

export default function JsonConverter() {
  const [inputText, setInputText] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [conversionMode, setConversionMode] = useState('auto'); // auto, manual
  const [previewMode, setPreviewMode] = useState('formatted'); // formatted, raw

  // テキストからJSONへの自動変換
  useEffect(() => {
    if (conversionMode === 'auto' && inputText.trim()) {
      convertTextToJson(inputText);
    } else if (!inputText.trim()) {
      setJsonOutput('');
      setIsValid(true);
      setError('');
    }
  }, [inputText, conversionMode]);

  // テキストをJSONに変換する関数
  const convertTextToJson = (text) => {
    try {
      // テキストが既にJSON形式かチェック
      if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
        // 既にJSON形式の場合はバリデーション
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          setJsonOutput(JSON.stringify(parsed, null, 2));
          setIsValid(true);
          setError('');
          return;
        }
      }

      // テキストを行単位で分割（改行を保持）
      const lines = text.split('\n');
      
      // 各行をJSONオブジェクトに変換
      const jsonArray = [];
      let currentText = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim() === '') {
          // 空行の場合
          if (currentText) {
            // 蓄積されたテキストがあれば追加
            jsonArray.push({
              "Text": currentText.trim(),
              "Foreground": "#FF000000",
              "Size": "12"
            });
            currentText = '';
          }
          // 空行を追加
          jsonArray.push({
            "Text": "",
            "Foreground": "#FF000000",
            "Size": "12"
          });
        } else {
          // 非空行の場合
          if (currentText) {
            currentText += '\n' + line;
          } else {
            currentText = line;
          }
        }
      }
      
      // 最後に残ったテキストがあれば追加
      if (currentText) {
        jsonArray.push({
          "Text": currentText.trim(),
          "Foreground": "#FF000000",
          "Size": "12"
        });
      }

      // JSON文字列として出力
      const jsonString = JSON.stringify(jsonArray, null, 2);
      setJsonOutput(jsonString);
      setIsValid(true);
      setError('');
    } catch (err) {
      setError(`変換エラー: ${err.message}`);
      setIsValid(false);
    }
  };

  // 手動変換ボタンのハンドラ
  const handleManualConvert = () => {
    convertTextToJson(inputText);
  };

  // JSONの妥当性チェック
  const validateJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error('JSONは配列形式である必要があります');
      }
      
      // 各項目の妥当性チェック
      parsed.forEach((item, index) => {
        if (!item.hasOwnProperty('Text')) {
          throw new Error(`項目${index + 1}: Textフィールドが必須です`);
        }
        if (typeof item.Text !== 'string') {
          throw new Error(`項目${index + 1}: Textは文字列である必要があります`);
        }
        if (item.Text.length > 1000) {
          throw new Error(`項目${index + 1}: テキストは1000文字以下である必要があります`);
        }
      });
      
      return { valid: true, parsed };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  };

  // JSONテキストの変更ハンドラ
  const handleJsonChange = (value) => {
    setJsonOutput(value);
    
    if (value.trim()) {
      const validation = validateJson(value);
      setIsValid(validation.valid);
      setError(validation.valid ? '' : validation.error);
    } else {
      setIsValid(true);
      setError('');
    }
  };

  // JSONからテキストへの逆変換
  const convertJsonToText = () => {
    try {
      const parsed = JSON.parse(jsonOutput);
      if (Array.isArray(parsed)) {
        let text = '';
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i];
          if (item.Text === '') {
            // 空行の場合は改行を追加（最初の項目でなければ）
            if (i > 0) text += '\n';
          } else {
            // テキストがある場合
            if (i > 0 && parsed[i-1].Text !== '') {
              text += '\n';
            }
            text += item.Text;
          }
        }
        setInputText(text);
        setError('');
      }
    } catch (err) {
      setError(`逆変換エラー: ${err.message}`);
    }
  };

  // コピー機能
  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert('クリップボードにコピーしました'))
        .catch(() => alert('コピーに失敗しました'));
    } else {
      // フォールバック
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('クリップボードにコピーしました');
      } catch (err) {
        alert('コピーに失敗しました');
      }
      document.body.removeChild(textArea);
    }
  };

  // クリア機能
  const clearAll = () => {
    setInputText('');
    setJsonOutput('');
    setError('');
    setIsValid(true);
  };

  // サンプルデータの挿入
  const insertSample = () => {
    const sampleText = `第2子希望
G1P1
2024/2/21　FET妊娠 → 39週　自然分娩　2966ｇ男児（藤本産婦人科小児科）

2022/5　腹腔鏡下卵巣腫瘍切除（右；dermoid）
凍結胚：７個

LMP：5/6～　D-4　（出産後2025/3月に月経再開し2回目の月経）
移植から希望。8月、9月頃に移植したいです。

5月はじめ頃にかゆみがあって藤本産婦人科に受診したらガンジタといわれ膣錠を処方されました。`;
    setInputText(sampleText);
  };

  // プレビューテキストのレンダリング
  const renderPreview = () => {
    if (!jsonOutput) return <span className="text-gray-400">JSONプレビューがここに表示されます</span>;
    
    try {
      const parsed = JSON.parse(jsonOutput);
      if (previewMode === 'formatted' && Array.isArray(parsed)) {
        return parsed.map((item, index) => (
          <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">項目 {index + 1}:</div>
            <div className={`${item.Text === '' ? 'bg-gray-200 text-gray-500 italic' : ''} min-h-[1.5rem]`}>
              {item.Text === '' ? '(空行)' : item.Text}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              色: {item.Foreground}, サイズ: {item.Size}
            </div>
          </div>
        ));
      } else {
        return <pre className="text-sm">{jsonOutput}</pre>;
      }
    } catch (err) {
      return <span className="text-red-500">無効なJSON形式</span>;
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">医療記録JSON変換ツール</h1>
        <p className="text-gray-600 mt-2">テキスト形式の医療記録をJSON配列形式に変換します</p>
      </div>

      {/* 操作パネル */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">変換モード:</label>
            <select 
              value={conversionMode} 
              onChange={(e) => setConversionMode(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="auto">自動変換</option>
              <option value="manual">手動変換</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">プレビュー:</label>
            <select 
              value={previewMode} 
              onChange={(e) => setPreviewMode(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="formatted">フォーマット表示</option>
              <option value="raw">Raw JSON</option>
            </select>
          </div>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={insertSample}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              サンプル挿入
            </button>
            <button
              onClick={handleManualConvert}
              disabled={conversionMode === 'auto'}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
            >
              変換実行
            </button>
            <button
              onClick={convertJsonToText}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              JSON→テキスト
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              クリア
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左画面: テキスト入力 */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">テキスト入力</h2>
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500">
                    {inputText.length} 文字
                  </span>
                  <button
                    onClick={() => copyToClipboard(inputText)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    disabled={!inputText}
                  >
                    コピー
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="医療記録のテキストを入力してください..."
                className="w-full h-96 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ガイドライン */}
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">入力のガイドライン</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• 段落は空行で区切ってください</p>
              <p>• 各段落は1つのJSON項目として変換されます</p>
              <p>• 空行も<code>{`{"Text": ""}`}</code>として変換されます</p>
              <p>• 1つの段落は1000文字以下にしてください</p>
              <p>• 自動変換モードでは入力と同時に変換されます</p>
            </div>
          </div>
        </div>

        {/* 右画面: JSON出力 */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">JSON出力</h2>
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      有効
                    </span>
                  ) : (
                    <span className="text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      無効
                    </span>
                  )}
                  <button
                    onClick={() => copyToClipboard(jsonOutput)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    disabled={!jsonOutput}
                  >
                    コピー
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={jsonOutput}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder="JSON配列がここに表示されます..."
                className={`w-full h-96 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 ${
                  isValid ? 'border-gray-300 focus:ring-blue-500' : 'border-red-300 focus:ring-red-500'
                }`}
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {renderPreview()}
            </div>
          </div>
        </div>
    </Layout>
  );
}