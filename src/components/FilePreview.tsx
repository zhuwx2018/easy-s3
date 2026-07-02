import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, File } from 'lucide-react';

interface Props {
  bucket: string;
  key: string;
  connection: {
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
  };
  onClose: () => void;
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
const TEXT_EXTS = ['txt', 'json', 'csv', 'md', 'xml', 'html', 'css', 'js', 'ts'];

export function FilePreview({ bucket, key, connection, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = key.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTS.includes(ext);
  const isText = TEXT_EXTS.includes(ext);

  useEffect(() => {
    loadContent();
  }, [bucket, key]);

  useEffect(() => {
    return () => {
      if (content && content.startsWith('blob:')) {
        URL.revokeObjectURL(content);
      }
    };
  }, [content]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isImage) {
        const data = await invoke<number[]>('download_object', {
          connection,
          bucket,
          key,
        });
        const blob = new Blob([new Uint8Array(data)]);
        const url = URL.createObjectURL(blob);
        setContent(url);
      } else if (isText) {
        const data = await invoke<number[]>('download_object', {
          connection,
          bucket,
          key,
        });
        const text = new TextDecoder().decode(new Uint8Array(data));
        setContent(text);
      }
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium truncate">{key.split('/').pop()}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && <div className="text-center py-8">加载中...</div>}
          {error && <div className="text-red-600 text-center py-8">{error}</div>}
          {!loading && !error && isImage && content && (
            <img src={content} alt={key} className="max-w-full h-auto" />
          )}
          {!loading && !error && isText && content && (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded overflow-auto">
              {content}
            </pre>
          )}
          {!loading && !error && !isImage && !isText && (
            <div className="text-center py-8 text-gray-500">
              <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>不支持预览此文件类型</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}