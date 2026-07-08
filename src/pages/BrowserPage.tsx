import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import toast, { Toaster } from 'react-hot-toast';
import { useConnectionStore } from '../store/connectionStore';
import { useBrowserStore, type S3Object } from '../store/browserStore';
import { useDownloadStore } from '../store/downloadStore';
import { useUploadStore } from '../store/uploadStore';
import { FileList } from '../components/FileList';
import { SearchBar } from '../components/SearchBar';
import { FileUploader } from '../components/FileUploader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DownloadManager } from '../components/DownloadManager';
import { UploadManager } from '../components/UploadManager';
import { FolderOpen } from 'lucide-react';

interface DownloadProgress {
  task_id: string;
  downloaded: number;
  total: number;
}

interface UploadProgress {
  task_id: string;
  uploaded: number;
  total: number;
}

export function BrowserPage() {
  const { currentConnection } = useConnectionStore();
  const {
    setObjects,
    currentBucket,
    setCurrentBucket,
    currentPrefix,
    setCurrentPrefix,
    selectedObjects,
    setSelectedObjects,
  } = useBrowserStore();
  const { addTask: addDownloadTask, updateTask: updateDownloadTask } = useDownloadStore();
  const { addTask: addUploadTask, updateTask: updateUploadTask } = useUploadStore();

  const [buckets, setBuckets] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; keys: string[] }>({
    open: false,
    keys: [],
  });

  // Listen for download progress events
  useEffect(() => {
    const unlistenDownload = listen<DownloadProgress>('download-progress', (event) => {
      const { task_id, downloaded, total } = event.payload;
      updateDownloadTask(task_id, {
        downloadedBytes: downloaded,
        totalBytes: total,
      });
    });

    const unlistenUpload = listen<UploadProgress>('upload-progress', (event) => {
      console.log('Upload progress event:', event.payload);
      const { task_id, uploaded, total } = event.payload;
      updateUploadTask(task_id, {
        uploadedBytes: uploaded,
        totalBytes: total,
      });
    });

    return () => {
      unlistenDownload.then((fn) => fn());
      unlistenUpload.then((fn) => fn());
    };
  }, [updateDownloadTask, updateUploadTask]);

  // 监听 currentConnection 变化，切换连接时重置状态并加载
  useEffect(() => {
    if (currentConnection) {
      setCurrentPrefix('');
      setSelectedObjects([]);
      setObjects([]);
      loadBuckets();
    }
  }, [currentConnection]);

  // 监听 bucket 变化，加载文件列表
  useEffect(() => {
    if (currentBucket) {
      loadObjects();
    }
  }, [currentBucket, currentPrefix]);

  const loadBuckets = async () => {
    if (!currentConnection) return;
    try {
      const result = await invoke<{ name: string }[]>('list_buckets', {
        connection: currentConnection,
      });
      const bucketNames = result.map((b) => b.name);
      setBuckets(bucketNames);
      if (bucketNames.length > 0) {
        setCurrentBucket(bucketNames[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadObjects = async () => {
    if (!currentConnection || !currentBucket) return;
    try {
      const result = await invoke<S3Object[]>('list_objects', {
        connection: currentConnection,
        bucket: currentBucket,
        prefix: currentPrefix || null,
      });
      setObjects(result);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = async (key: string) => {
    if (!currentConnection || !currentBucket) return;

    const fileName = key.split('/').pop() || key;
    // key 可能已经是完整路径，不需要再拼接 currentPrefix
    const fullKey = key;
    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    addDownloadTask({
      id: taskId,
      fileName,
      key: fullKey,
      bucket: currentBucket,
      totalBytes: 0,
      downloadedBytes: 0,
      status: 'downloading',
      startTime: Date.now(),
    });

    try {
      console.log('Starting download:', fullKey);
      const result = await invoke<{ local_path: string; size: number }>('download_object_with_progress', {
        connection: currentConnection,
        bucket: currentBucket,
        key: fullKey,
        taskId: taskId,
      });
      console.log('download_object_with_progress result:', result);

      // Browser download for convenience
      const data = await invoke<number[]>('download_object', {
        connection: currentConnection,
        bucket: currentBucket,
        key: fullKey,
      });
      console.log('download_object data length:', data.length);

      const blob = new Blob([new Uint8Array(data)]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      updateDownloadTask(taskId, {
        status: 'completed',
        endTime: Date.now(),
        totalBytes: result.size,
        downloadedBytes: result.size,
        localPath: result.local_path,
      });

      toast.success(`下载完成: ${fileName}`);
    } catch (e) {
      console.error('Download error:', e);
      updateDownloadTask(taskId, {
        status: 'failed',
        endTime: Date.now(),
        error: String(e),
      });
      toast.error(`下载失败: ${fileName} - ${e}`);
      console.error(e);
    }
  };

  const handleUpload = async (key: string, data: Uint8Array) => {
    if (!currentConnection || !currentBucket) return;

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    addUploadTask({
      id: taskId,
      fileName: key.split('/').pop() || key,
      key,
      bucket: currentBucket,
      totalBytes: data.length,
      uploadedBytes: 0,
      status: 'uploading',
      startTime: Date.now(),
    });

    // Close uploader immediately, task is already in the list
    setShowUploader(false);

    try {
      console.log('Starting upload:', currentPrefix + key, 'size:', data.length);
      await invoke<number>('upload_object_with_progress', {
        connection: currentConnection,
        bucket: currentBucket,
        key: currentPrefix + key,
        data: Array.from(data),
        taskId: taskId,
      });
      console.log('Upload complete');

      updateUploadTask(taskId, {
        status: 'completed',
        endTime: Date.now(),
        uploadedBytes: data.length,
      });

      loadObjects();
      toast.success(`上传完成: ${key}`);
    } catch (e) {
      updateUploadTask(taskId, {
        status: 'failed',
        endTime: Date.now(),
        error: String(e),
      });
      toast.error(`上传失败: ${key}`);
      console.error(e);
    }
  };

  const handleUploadMultipart = async (key: string, data: Uint8Array) => {
    if (!currentConnection || !currentBucket) return;

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    addUploadTask({
      id: taskId,
      fileName: key.split('/').pop() || key,
      key,
      bucket: currentBucket,
      totalBytes: data.length,
      uploadedBytes: 0,
      status: 'uploading',
      startTime: Date.now(),
    });

    // Close uploader immediately, task is already in the list
    setShowUploader(false);

    try {
      console.log('Starting multipart upload:', currentPrefix + key, 'size:', data.length);
      await invoke<number>('upload_object_multipart_with_progress', {
        connection: currentConnection,
        bucket: currentBucket,
        key: currentPrefix + key,
        data: Array.from(data),
        taskId: taskId,
      });
      console.log('Multipart upload complete');

      updateUploadTask(taskId, {
        status: 'completed',
        endTime: Date.now(),
        uploadedBytes: data.length,
      });

      loadObjects();
      toast.success(`上传完成: ${key}`);
    } catch (e) {
      updateUploadTask(taskId, {
        status: 'failed',
        endTime: Date.now(),
        error: String(e),
      });
      toast.error(`上传失败: ${key}`);
      console.error(e);
    }
  };

  const handleDelete = async (keys: string[]) => {
    if (!currentConnection || !currentBucket) return;
    try {
      // keys 已经是完整路径，不需要再拼接 currentPrefix
      await invoke('delete_objects', {
        connection: currentConnection,
        bucket: currentBucket,
        keys,
      });
      setSelectedObjects([]);
      loadObjects();
    } catch (e) {
      console.error(e);
    }
    setDeleteDialog({ open: false, keys: [] });
  };

  const handleRename = async (oldKey: string, newKey: string) => {
    if (!currentConnection || !currentBucket) return;
    try {
      // oldKey 和 newKey 已经是完整路径，不需要再拼接 currentPrefix
      await invoke('rename_object', {
        connection: currentConnection,
        bucket: currentBucket,
        oldKey,
        newKey,
      });
      loadObjects();
    } catch (e) {
      console.error(e);
    }
  };

  const navigateToFolder = (key: string) => {
    // key 可能是 "folder/" 或 "folder/file.txt" 形式
    // 需要提取文件夹部分并正确拼接
    if (key.endsWith('/')) {
      // 文件夹：直接设置 prefix
      setCurrentPrefix(key);
    } else {
      // 文件：不应该触发导航
      console.warn('navigateToFolder received a file key:', key);
    }
  };

  const navigateUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
  };

  const pathParts = currentPrefix.split('/').filter(Boolean);

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        <Toaster position="top-right" />

        {/* Header with bucket and upload */}
        <div className="flex items-center gap-4 mb-4 shrink-0">
          <FolderOpen className="w-6 h-6" />
          <select
            value={currentBucket}
            onChange={(e) => setCurrentBucket(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {buckets.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <button
            onClick={() => setShowUploader(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            上传文件
          </button>
        </div>

        {/* Path Navigation */}
        <div className="flex items-center gap-2 mb-4 text-sm bg-gray-50 px-4 py-2 rounded-lg border shrink-0">
          <button
            onClick={navigateUp}
            disabled={!currentPrefix}
            className="px-2 py-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
          >
            返回
          </button>
          <span className="text-gray-400">|</span>
          {pathParts.length === 0 ? (
            <span className="text-gray-500">根目录</span>
          ) : (
            pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => setCurrentPrefix(pathParts.slice(0, i + 1).join('/') + '/')}
                  className="hover:underline text-gray-800"
                >
                  {part}
                </button>
              </span>
            ))
          )}
        </div>

        <div className="mb-4 shrink-0">
          <SearchBar />
        </div>

        {selectedObjects.length > 0 && (
          <div className="mb-4 flex items-center gap-2 shrink-0">
            <span className="text-sm text-gray-500">已选择 {selectedObjects.length} 项</span>
            <button
              onClick={() => setDeleteDialog({ open: true, keys: selectedObjects })}
              className="px-3 py-1 text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              批量删除
            </button>
            <button onClick={() => setSelectedObjects([])} className="px-3 py-1 border rounded hover:bg-gray-50">
              取消选择
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0">
          <FileList
            onDownload={handleDownload}
            onDelete={(keys) => setDeleteDialog({ open: true, keys })}
            onRename={handleRename}
            onNavigate={navigateToFolder}
          />
        </div>

        {showUploader && (
          <FileUploader
            onUpload={handleUpload}
            onUploadMultipart={handleUploadMultipart}
            onClose={() => setShowUploader(false)}
          />
        )}

        <ConfirmDialog
          open={deleteDialog.open}
          title="确认删除"
          message={`确定要删除 ${deleteDialog.keys.length} 个文件吗？此操作不可撤销。`}
          onConfirm={() => handleDelete(deleteDialog.keys)}
          onCancel={() => setDeleteDialog({ open: false, keys: [] })}
        />
      </div>

      {/* Sidebar with Upload/Download Managers */}
      <div className="w-80 border-l bg-gray-50 overflow-auto flex flex-col gap-4 p-4">
        <UploadManager />
        <DownloadManager />
      </div>
    </div>
  );
}
