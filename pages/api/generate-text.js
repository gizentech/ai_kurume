// pages/api/generate-text.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { prompt, patientId } = req.body;
      // specialty パラメータを削除
      
      if (!prompt) {
        return res.status(400).json({ error: 'プロンプトが必要です' });
      }
      
      // Get API key from environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'APIキーが設定されていません' });
      }
      
      // Current date formatting
      const today = new Date();
      const formattedDate = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日`;
      
      const medicalPrompt = `あなたは熟練の医師です。下記の診療記録に基づき、院内の別の医師が確認するための診療サマリーを作成してください。
  
  患者ID: ${patientId}
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
  
      try {
        // Call OpenAI API
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
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const generatedText = data.choices[0].message.content;
        
        return res.status(200).json({ generatedText });
      } catch (apiError) {
        console.error('OpenAI API Error:', apiError);
        return res.status(500).json({ 
          error: 'AIによる生成に失敗しました', 
          details: apiError.message 
        });
      }
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ 
        error: 'テキスト生成に失敗しました', 
        details: error.message 
      });
    }
  }