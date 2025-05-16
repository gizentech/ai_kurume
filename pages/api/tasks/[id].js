// pages/api/tasks/[id].js
import { getTask } from '../../../lib/taskQueue';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: taskId } = req.query;
    
    if (!taskId) {
      return res.status(400).json({ error: 'タスクIDが必要です' });
    }
    
    // タスクを取得
    const task = getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }
    
    // タスクの状態を返す
    return res.status(200).json(task);
  } catch (error) {
    console.error('タスク取得エラー:', error);
    return res.status(500).json({ 
      error: 'タスク情報の取得に失敗しました', 
      details: String(error)
    });
  }
}