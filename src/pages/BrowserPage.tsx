import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '../store/connectionStore';
import { useBrowserStore, type S3Object } from '../store/browserStore';
import { FileList } from '../components/FileList';
import { SearchBar } from '../components/SearchBar';
import { FileUploader } from '../components/FileUploader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ChevronRight, FolderOpen } from 'lucide-react';

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

  const [buckets, setBuckets] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; keys: string[] }>({
    open: false,
    keys: [],
  });

  useEffect(() => {
    if (currentConnection) {
      loadBuckets();
    }
  }, [currentConnection]);

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
      setBuckets(result.map((b) => b.name));
      if (result.length > 0 && !currentBucket) {
        setCurrentBucket(result[0].name);
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
    try {
      const data = await invoke<number[]>('download_object', {
        connection: currentConnection,
        bucket: currentBucket,
        key: currentPrefix + key,
      });
      const blob = new Blob([new Uint8Array(data)]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = key.split('/').pop() || key;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (keys: string[]) => {
    if (!currentConnection || !currentBucket) return;
    try {
      await invoke('delete_objects', {
        connection: currentConnection,
        bucket: currentBucket,
        keys: keys.map((k) => currentPrefix + k),
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
      await invoke('rename_object', {
        connection: currentConnection,
        bucket: currentBucket,
        oldKey: currentPrefix + oldKey,
        newKey: currentPrefix + newKey,
      });
      loadObjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (key: string, data: Uint8Array) => {
    if (!currentConnection || !currentBucket) return;
    try {
      await invoke('upload_object', {
        connection: currentConnection,
        bucket: currentBucket,
        key: currentPrefix + key,
        data: Array.from(data),
      });
      setShowUploader(false);
      loadObjects();
    } catch (e) {
      console.error(e);
    }
  };

  const navigateToFolder = (prefix: string) => {
    setCurrentPrefix(currentPrefix + prefix);
  };

  const navigateUp = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
  };

  const pathParts = currentPrefix.split('/').filter(Boolean);

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
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

      {currentPrefix && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button onClick={navigateUp} className="px-2 py-1 hover:bg-gray-100 rounded">
            返回
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPrefix(pathParts.slice(0, i + 1).join('/') + '/')}
                className="hover:underline"
              >
                {part}
              </button>
              {i < pathParts.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            </span>
          ))}
        </div>
      )}

      <div className="mb-4">
        <SearchBar />
      </div>

      {selectedObjects.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
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

      <FileList
        onDownload={handleDownload}
        onDelete={(keys) => setDeleteDialog({ open: true, keys })}
        onRename={handleRename}
        onNavigate={navigateToFolder}
      />

      {showUploader && (
        <FileUploader
          onUpload={handleUpload}
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
  );
}