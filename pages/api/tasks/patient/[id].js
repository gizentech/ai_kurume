// pages/api/tasks/patient/[id].js
import { getTasksByPatientId } from '../../../../lib/taskQueue';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: patientId } = req.query;
    
    if (!patientId) {
      return res.status(400).json({ error: '患者IDが必要です' });
    }
    
    // 患者関連のタスクを取得
    const tasks = getTasksByPatientId(patientId);
    
    // タスクのリストを返す
    return res.status(200).json({ tasks });
  } catch (error) {
    console.error('患者タスク取得エラー:', error);
    return res.status(500).json({ 
      error: '患者のタスク情報取得に失敗しました', 
      details: String(error)
    });
  }
}