// lib/taskQueue.js
// サマリー生成タスクを管理するためのシンプルなキュー

// タスク状態の定数
export const TASK_STATUS = {
  PENDING: 'pending',    // 処理待ち
  PROCESSING: 'processing', // 処理中
  COMPLETED: 'completed',   // 完了
  FAILED: 'failed'       // 失敗
};

// インメモリでタスクを管理するためのマップ
// 本番環境では、Redis、データベースなどの永続ストレージを使用するべき
const taskMap = new Map();

// 新しいタスクを登録する
export function createTask(taskId, patientId, patientName) {
  const task = {
    taskId,
    patientId,
    patientName,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    error: null
  };
  
  taskMap.set(taskId, task);
  return task;
}

// タスクの状態を更新する
export function updateTask(taskId, updates) {
  const task = taskMap.get(taskId);
  if (!task) return null;
  
  const updatedTask = {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  taskMap.set(taskId, updatedTask);
  return updatedTask;
}

// タスクを取得する
export function getTask(taskId) {
  return taskMap.get(taskId);
}

// 患者IDに関連するタスクのリストを取得する
export function getTasksByPatientId(patientId) {
  const tasks = [];
  for (const task of taskMap.values()) {
    if (task.patientId === patientId) {
      tasks.push(task);
    }
  }
  
  // 作成日時の降順でソート（最新のタスクが先頭）
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// すべてのタスクを取得する
export function getAllTasks() {
  return Array.from(taskMap.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}