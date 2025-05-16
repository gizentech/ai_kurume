// pages/api/generate-text.js
import { createTask, TASK_STATUS, updateTask } from '../../lib/taskQueue';
import { v4 as uuidv4 } from 'uuid'; // uuidパッケージを追加する必要があります

// OpenAI API呼び出しを実行するバックグラウンドタスク
async function generateTextInBackground(taskId, prompt, patientId, patientName) {
  try {
    // タスクを処理中状態に更新
    updateTask(taskId, { status: TASK_STATUS.PROCESSING });
    
    // APIキーを環境変数から取得
    const apiKey = process.env.OPENAI_API_KEY;
    
    // 現在の日付フォーマット
    const today = new Date();
    const formattedDate = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日`;
    
    const medicalPrompt = `あなたは熟練の医師です。下記の診療記録に基づき、院内の別の医師が確認するための診療サマリーを作成してください。

患者ID: ${patientId}
患者名: ${patientName || '記録なし'}
サマリー作成日: ${formattedDate}

診療記録:
${prompt}

以下の点に注意して、診療サマリーを作成してください:
1. サマリーは診療経過のみに焦点を当て、患者基本情報は含めないでください。
2. 診断名、治療内容、検査結果、現在の状態など、重要な臨床情報を簡潔にまとめてください。
3. 時系列順に重要なイベントを整理してください。
4. 医学的専門用語を適切に使用し、院内の医師間のコミュニケーションとして作成してください。
5. この患者の今後の治療計画や注意点があれば含めてください。
6. 不必要な挨拶文や冗長な表現は避け、臨床的に重要な情報に焦点を当ててください。

サマリーは「診断名」「現病歴」「治療経過」「現在の状態」「今後の方針」などの見出しを使用して構造化してください。`;

    // 開発環境でダミーデータを使用する場合
    if (process.env.NODE_ENV === 'development' && process.env.USE_DUMMY_AI === 'true') {
      console.log('開発用ダミーAI応答を使用します (バックグラウンド)');
      
      // 処理時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // ダミーテキストを生成
      const dummyText = `
# ${patientName || `患者ID: ${patientId}`}様 診療サマリー
作成日: ${formattedDate}

## 診断名
変形性関節症、急性上気道炎

## 現病歴
患者は膝の痛みと咳が主訴で来院されています。市販薬による自己治療を試みたが効果が見られなかったため医療機関を受診。

## 治療経過
内科および整形外科を受診。膝関節の診察では明らかな腫脹は認められませんでした。
呼吸音に軽度ラ音あり、上気道感染症状が認められました。

## 現在の状態
膝関節痛については変形性関節症として対応中。鎮痛剤の内服と湿布による対症療法を実施。
上気道症状に対しては対症療法を実施中。

## 今後の方針
1. 変形性関節症に対しては引き続き保存的治療を継続
2. 症状改善が見られない場合は整形外科での詳細検査を検討
3. 急性上気道炎については経過観察とし、症状悪化時は再診を指示
      `;
      
      // タスクを完了状態に更新
      updateTask(taskId, {
        status: TASK_STATUS.COMPLETED,
        result: dummyText
      });
      
      return;
    }
    
    // OpenAI API呼び出し
    console.log('OpenAI APIへリクエスト送信 (バックグラウンド)');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: medicalPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // タイムアウトをクリア
      
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (textError) {
        console.error('レスポンステキスト取得エラー:', textError);
        throw new Error('テキスト取得失敗');
      }
      
      if (!response.ok) {
        let errorMessage = 'OpenAI APIエラー';
        
        try {
          // エラーレスポンスがJSONかどうか確認
          const errorData = JSON.parse(responseText);
          if (errorData.error) {
            errorMessage = `OpenAI API: ${errorData.error.message || errorData.error.type || '不明なエラー'}`;
          }
        } catch (jsonError) {
          errorMessage = `OpenAI API: ${response.status} - ${responseText.substring(0, 100)}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // レスポンスをJSONとしてパース
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON解析エラー:', jsonError, '受信テキスト:', responseText.substring(0, 100));
        throw new Error('OpenAI APIからのレスポンスをJSON形式で解析できませんでした');
      }
      
      if (!data.choices || !data.choices.length || !data.choices[0].message) {
        console.error('無効な応答形式:', data);
        throw new Error('OpenAI APIから無効な形式のレスポンスを受信しました');
      }
      
      const generatedText = data.choices[0].message.content;
      console.log('テキスト生成成功');
      
      // タスクを完了状態に更新
      updateTask(taskId, {
        status: TASK_STATUS.COMPLETED,
        result: generatedText
      });
      
    } catch (apiError) {
      console.error('OpenAI API呼び出しエラー:', apiError);
      
      let errorMessage = 'AIテキスト生成に失敗しました';
      
      if (apiError.name === 'AbortError') {
        errorMessage = 'リクエストがタイムアウトしました';
      } else if (apiError.code === 'ECONNRESET') {
        errorMessage = '接続が切断されました';
      } else if (apiError.code === 'ETIMEDOUT') {
        errorMessage = '接続がタイムアウトしました';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      // タスクを失敗状態に更新
      updateTask(taskId, {
        status: TASK_STATUS.FAILED,
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('予期せぬエラー:', error);
    
    // タスクを失敗状態に更新
    updateTask(taskId, {
      status: TASK_STATUS.FAILED,
      error: String(error)
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, patientId, patientName } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'プロンプトが必要です' });
    }
    
    // 新しいタスクIDを生成
    const taskId = uuidv4();
    
    // タスクを作成
    const task = createTask(taskId, patientId, patientName);
    
    // バックグラウンドでテキスト生成プロセスを開始
    // await せずに非同期で実行
    generateTextInBackground(taskId, prompt, patientId, patientName);
    
    // 即座にタスクIDとステータスを返す
    return res.status(202).json({ 
      message: 'サマリー生成タスクを登録しました',
      taskId,
      status: task.status
    });
  } catch (error) {
    console.error('予期せぬエラー:', error);
    return res.status(500).json({ 
      error: 'タスク登録中に予期せぬエラーが発生しました', 
      details: String(error)
    });
  }
}