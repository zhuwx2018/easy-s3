import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, X, FolderOpen, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useDownloadStore, type DownloadTask } from '../store/downloadStore';
import { useConnectionStore } from '../store/connectionStore';

export function DownloadManager() {
  const [expanded, setExpanded] = useState(true);
  const { tasks, removeTask, clearCompleted } = useDownloadStore();
  useConnectionStore(); // Keep connection alive

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const formatSpeed = (bytes: number, ms: number) => {
    if (ms <= 0) return '0 B/s';
    const speed = (bytes / ms) * 1000;
    if (speed < 1024) return `${speed.toFixed(0)} B/s`;
    if (speed < 1024 * 1024) return `${(speed / 1024).toFixed(1)} KB/s`;
    return `${(speed / 1024 / 1024).toFixed(1)} MB/s`;
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const handleOpenFile = async (task: DownloadTask) => {
    if (task.localPath) {
      try {
        await invoke('open_path', { path: task.localPath });
      } catch (e) {
        console.error('Failed to open file:', e);
      }
    }
  };

  const handleOpenFolder = async (task: DownloadTask) => {
    if (task.localPath) {
      try {
        // Open the folder containing the file
        const folder = task.localPath.substring(0, task.localPath.lastIndexOf('\\'));
        await invoke('open_path', { path: folder });
      } catch (e) {
        console.error('Failed to open folder:', e);
      }
    }
  };

  const activeTasks = tasks.filter((t) => t.status === 'downloading');
  const completedTasks = tasks.filter((t) => t.status !== 'downloading');

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          <span className="font-medium">下载管理</span>
          {activeTasks.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {activeTasks.length}
            </span>
          )}
        </div>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="border-t">
          {/* Active Downloads */}
          {activeTasks.length > 0 && (
            <div className="p-2 border-b">
              <div className="text-xs text-gray-500 mb-2">正在下载</div>
              {activeTasks.map((task) => (
                <DownloadItem
                  key={task.id}
                  task={task}
                  formatSize={formatSize}
                  formatSpeed={formatSpeed}
                  formatTime={formatTime}
                  onOpenFolder={() => handleOpenFolder(task)}
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>
          )}

          {/* Completed Downloads */}
          {completedTasks.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>下载记录 ({completedTasks.length})</span>
                <button
                  onClick={(e) => { e.stopPropagation(); clearCompleted(); }}
                  className="text-blue-600 hover:underline"
                >
                  清除记录
                </button>
              </div>
              {completedTasks.slice(0, 10).map((task) => (
                <CompletedItem
                  key={task.id}
                  task={task}
                  formatSize={formatSize}
                  formatTime={formatTime}
                  onOpenFile={() => handleOpenFile(task)}
                  onOpenFolder={() => handleOpenFolder(task)}
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>
          )}

          {tasks.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">
              暂无下载任务
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DownloadItem({
  task,
  formatSize,
  formatSpeed,
  formatTime,
  onOpenFolder,
  onRemove,
}: {
  task: DownloadTask;
  formatSize: (bytes: number) => string;
  formatSpeed: (bytes: number, ms: number) => string;
  formatTime: (ms: number) => string;
  onOpenFolder: () => void;
  onRemove: () => void;
}) {
  const progress = task.totalBytes > 0 ? (task.downloadedBytes / task.totalBytes) * 100 : 0;
  const elapsed = Date.now() - task.startTime;
  const speed = formatSpeed(task.downloadedBytes, elapsed);
  const remaining = task.totalBytes > task.downloadedBytes
    ? formatTime(((task.totalBytes - task.downloadedBytes) / task.downloadedBytes) * elapsed)
    : '--';

  return (
    <div className="p-2 hover:bg-gray-50 rounded">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm truncate flex-1" title={task.fileName}>{task.fileName}</span>
        <div className="flex items-center gap-1">
          <button onClick={onOpenFolder} className="p-1 hover:bg-gray-200 rounded" title="打开目录">
            <FolderOpen className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={onRemove} className="p-1 hover:bg-gray-200 rounded" title="取消">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{formatSize(task.downloadedBytes)} / {formatSize(task.totalBytes)}</span>
        <span className="text-blue-600">{speed}</span>
        <span>剩余 {remaining}</span>
      </div>
      <div className="mt-1 h-1.5 bg-gray-200 rounded overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function CompletedItem({
  task,
  formatSize,
  formatTime,
  onOpenFile,
  onOpenFolder,
  onRemove,
}: {
  task: DownloadTask;
  formatSize: (bytes: number) => string;
  formatTime: (ms: number) => string;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onRemove: () => void;
}) {
  const duration = task.endTime ? task.endTime - task.startTime : 0;

  return (
    <div className="p-2 hover:bg-gray-50 rounded flex items-center gap-2">
      {task.status === 'completed' ? (
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate" title={task.fileName}>{task.fileName}</div>
        <div className="text-xs text-gray-500">
          {formatSize(task.totalBytes)} • {formatTime(duration)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onOpenFile} className="p-1 hover:bg-gray-200 rounded" title="打开文件">
          <Loader2 className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={onOpenFolder} className="p-1 hover:bg-gray-200 rounded" title="打开目录">
          <FolderOpen className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={onRemove} className="p-1 hover:bg-gray-200 rounded" title="删除记录">
          <Trash2 className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
