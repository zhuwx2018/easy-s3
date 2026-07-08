import { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

interface Props {
  onUpload: (key: string, data: Uint8Array) => void;
  onUploadMultipart: (key: string, data: Uint8Array) => void;
  onClose: () => void;
}

export function FileUploader({ onUpload, onUploadMultipart, onClose }: Props) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [useMultipart, setUseMultipart] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleUpload = async () => {
    // Store files to upload and clear UI immediately
    const filesToUpload = [...files];
    setFiles([]);
    setUploading(false);

    // Start uploads in background
    for (const file of filesToUpload) {
      const data = await file.arrayBuffer();
      const uint8Array = new Uint8Array(data);
      if (useMultipart) {
        await onUploadMultipart(file.name, uint8Array);
      } else {
        await onUpload(file.name, uint8Array);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">上传文件</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600 mb-2">拖拽文件到此处，或</p>
          <label className="text-blue-600 hover:underline cursor-pointer">
            点击选择文件
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 mb-4">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useMultipart}
              onChange={(e) => setUseMultipart(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">分片上传（显示进度）</span>
          </label>
          <span className="text-xs text-gray-500">开启后大文件可显示上传进度</span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? '上传中...' : `上传 ${files.length} 个文件`}
          </button>
        </div>
      </div>
    </div>
  );
}