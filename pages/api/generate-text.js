// pages/api/generate-text.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, patientId, patientName } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'プロンプトが必要です' });
    }
    
    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    console.log("API Key設定状態:", apiKey ? "設定済み (非表示)" : "未設定");
    
    if (!apiKey) {
      console.error('APIキーが設定されていません');
      return res.status(500).json({ error: 'OpenAI APIキーが設定されていません。.env.localファイルを確認してください。' });
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('APIキーの形式が無効です');
      return res.status(500).json({ error: 'OpenAI APIキーの形式が無効です。"sk-"で始まる文字列が必要です。' });
    }
    
    // Current date formatting
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

    console.log(`OpenAI APIへリクエスト送信: 患者ID=${patientId}, プロンプト長=${prompt.length}`);
    
    try {
      // Call OpenAI API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト
      
      console.log('OpenAI API リクエスト開始...');
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
      
      console.log('OpenAI APIからレスポンス受信: ステータス =', response.status);
      
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (textError) {
        console.error('レスポンステキスト取得エラー:', textError);
        responseText = '(テキスト取得失敗)';
      }
      
      if (!response.ok) {
        console.error('OpenAI APIエラー:', response.status, responseText);
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
        
        return res.status(500).json({ error: errorMessage });
      }
      
      // レスポンスをJSONとしてパース
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON解析エラー:', jsonError, '受信テキスト:', responseText.substring(0, 100));
        return res.status(500).json({ error: 'OpenAI APIからのレスポンスをJSON形式で解析できませんでした' });
      }
      
      if (!data.choices || !data.choices.length || !data.choices[0].message) {
        console.error('無効な応答形式:', data);
        return res.status(500).json({ error: 'OpenAI APIから無効な形式のレスポンスを受信しました' });
      }
      
      const generatedText = data.choices[0].message.content;
      console.log('テキスト生成成功: 文字数 =', generatedText.length);
      
      return res.status(200).json({ generatedText });
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
      
      return res.status(500).json({ 
        error: errorMessage,
        details: String(apiError)
      });
    }
  } catch (error) {
    console.error('予期せぬエラー:', error);
    return res.status(500).json({ 
      error: 'AI処理中に予期せぬエラーが発生しました', 
      details: String(error)
    });
  }
}