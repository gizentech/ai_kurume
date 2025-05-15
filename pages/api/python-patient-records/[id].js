// pages/api/patient-records/[id].js
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// exec を Promise ベースに変換
const execPromise = promisify(exec);

// 一時ファイルのパス
const getTempFilePath = (prefix) => {
  return path.join(process.cwd(), 'temp', `${prefix}_${Date.now()}.json`);
};

// ディレクトリが存在しない場合は作成
const ensureTempDir = () => {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: '患者IDが必要です' });
  }

  try {
    // 一時ディレクトリの確保
    ensureTempDir();
    
    // 出力用の一時ファイルパス
    const outputFile = getTempFilePath('patient_records');
    
    // Python スクリプトのパス
    const scriptPath = path.join(process.cwd(), 'python', 'patient_records.py');
    
    // Python スクリプトの実行
    const command = `python "${scriptPath}" --patient_id "${id}" --output "${outputFile}"`;
    
    console.log(`実行コマンド: ${command}`);
    
    await execPromise(command);
    
    // 出力ファイルの読み取り
    if (fs.existsSync(outputFile)) {
      const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      
      // 一時ファイルの削除
      fs.unlinkSync(outputFile);
      
      return res.status(200).json(data);
    } else {
      throw new Error('Python スクリプトの出力ファイルが見つかりません');
    }
  } catch (error) {
    console.error('Python スクリプト実行エラー:', error);
    return res.status(500).json({ 
      error: 'Python スクリプトの実行に失敗しました',
      details: error.message
    });
  }
}