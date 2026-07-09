import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import toast, { Toaster } from 'react-hot-toast';
import { useConnectionStore } from '../store/connectionStore';
import { useBrowserStore, type S3Object, type BucketInfo } from '../store/browserStore';
import { useDownloadStore } from '../store/downloadStore';
import { useUploadStore } from '../store/uploadStore';
import { FileList } from '../components/FileList';
import { SearchBar } from '../components/SearchBar';
import { FileUploader } from '../components/FileUploader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DownloadManager } from '../components/DownloadManager';
import { UploadManager } from '../components/UploadManager';
import { BucketSidebar } from '../components/BucketSidebar';
import { ChevronLeft } from 'lucide-react';
import { CreateBucketDialog } from '../components/CreateBucketDialog';

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
    setBuckets,
  } = useBrowserStore();
  const { addTask: addDownloadTask, updateTask: updateDownloadTask } = useDownloadStore();
  const { addTask: addUploadTask, updateTask: updateUploadTask } = useUploadStore();

  const [showUploader, setShowUploader] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; keys: string[] }>({
    open: false,
    keys: [],
  });
  const [createBucketDialog, setCreateBucketDialog] = useState(false);
  const [bucketLoading, setBucketLoading] = useState(false);

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
    setBucketLoading(true);
    try {
      const result = await invoke<{ name: string }[]>('list_buckets', {
        connection: currentConnection,
      });

      // Get object count for each bucket
      const bucketInfos: BucketInfo[] = await Promise.all(
        result.map(async (b) => {
          try {
            const count = await invoke<number>('get_bucket_object_count', {
              connection: currentConnection,
              bucket: b.name,
            });
            return { name: b.name, objectCount: count };
          } catch {
            return { name: b.name, objectCount: -1 };
          }
        })
      );

      setBuckets(bucketInfos);
      if (bucketInfos.length > 0 && !currentBucket) {
        setCurrentBucket(bucketInfos[0].name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBucketLoading(false);
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

  const handleCreateBucket = async (name: string) => {
    if (!currentConnection) return;
    // Validate bucket name
    if (!/^[a-z0-9][a-z0-9.-]{2,254}$/.test(name)) {
      toast.error('存储桶名称必须符合 DNS 命名规范：小写字母、数字、点、连字符，3-255字符');
      return;
    }
    try {
      await invoke('create_bucket', {
        connection: currentConnection,
        bucket: name,
      });
      toast.success(`存储桶 ${name} 创建成功`);
      setCreateBucketDialog(false);
      loadBuckets();
    } catch (e) {
      console.error('Create bucket error:', e);
      toast.error(`创建失败: ${e}`);
    }
  };

  const handleDeleteBucket = async (name: string) => {
    if (!currentConnection) return;
    try {
      await invoke('delete_bucket', {
        connection: currentConnection,
        bucket: name,
      });
      toast.success(`存储桶 ${name} 已删除`);
      loadBuckets();
      if (currentBucket === name) {
        setCurrentBucket('');
      }
    } catch (e) {
      toast.error(`删除失败: ${e}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!currentConnection || !currentBucket) return;
    const name = prompt('输入文件夹名称');
    if (!name || !name.trim()) return;
    try {
      await invoke('create_folder', {
        connection: currentConnection,
        bucket: currentBucket,
        prefix: currentPrefix,
        folderName: name.trim(),
      });
      toast.success(`文件夹 ${name} 创建成功`);
      loadObjects();
      loadBuckets();
    } catch (e) {
      toast.error(`创建失败: ${e}`);
    }
  };

  const handleDownload = async (key: string) => {
    if (!currentConnection || !currentBucket) return;

    const fileName = key.split('/').pop() || key;
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
      loadBuckets();
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
      loadBuckets();
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
      await invoke('delete_objects', {
        connection: currentConnection,
        bucket: currentBucket,
        keys,
      });
      setSelectedObjects([]);
      loadObjects();
      loadBuckets();
    } catch (e) {
      console.error(e);
    }
    setDeleteDialog({ open: false, keys: [] });
  };

  const handleRename = async (oldKey: string, newKey: string) => {
    if (!currentConnection || !currentBucket) return;
    try {
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
    if (key.endsWith('/')) {
      setCurrentPrefix(key);
    } else {
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
      {/* Left: Bucket Sidebar */}
      <BucketSidebar
        onCreateBucket={() => setCreateBucketDialog(true)}
        onDeleteBucket={handleDeleteBucket}
        loading={bucketLoading}
      />

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col overflow-hidden bg-gray-50">
        <Toaster position="top-right" />

        {/* Path Navigation */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button
            onClick={navigateUp}
            disabled={!currentPrefix}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 px-4 py-2 rounded-lg flex-1 min-w-0">
            <span className="text-gray-400 shrink-0">{currentBucket || '未选择存储桶'}</span>
            {pathParts.length > 0 && <span className="text-gray-300">/</span>}
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPrefix(pathParts.slice(0, i + 1).join('/') + '/')}
                  className="hover:text-blue-600 text-gray-700 truncate"
                >
                  {part}
                </button>
                {i < pathParts.length - 1 && <span className="text-gray-300">/</span>}
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowUploader(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0 transition-colors"
          >
            上传文件
          </button>
        </div>

        <div className="mb-4 shrink-0">
          <SearchBar />
        </div>

        {selectedObjects.length > 0 && (
          <div className="mb-4 flex items-center gap-2 shrink-0">
            <span className="text-sm text-gray-500">已选择 {selectedObjects.length} 项</span>
            <button
              onClick={() => setDeleteDialog({ open: true, keys: selectedObjects })}
              className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              批量删除
            </button>
            <button
              onClick={() => setSelectedObjects([])}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
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
            onCreateFolder={handleCreateFolder}
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

        <CreateBucketDialog
          open={createBucketDialog}
          onClose={() => setCreateBucketDialog(false)}
          onCreate={handleCreateBucket}
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
