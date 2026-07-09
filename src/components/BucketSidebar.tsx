import { Database, Plus, Trash2, Loader2 } from 'lucide-react';
import { useBrowserStore } from '../store/browserStore';

interface Props {
  onCreateBucket: () => void;
  onDeleteBucket: (name: string) => void;
  loading: boolean;
}

export function BucketSidebar({ onCreateBucket, onDeleteBucket, loading }: Props) {
  const { buckets, currentBucket, setCurrentBucket } = useBrowserStore();

  return (
    <div className="w-60 bg-white border-r flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">存储桶</h2>
        <button
          onClick={onCreateBucket}
          className="p-1.5 hover:bg-blue-50 rounded-md transition-colors"
          title="新建存储桶"
        >
          <Plus className="w-5 h-5 text-blue-600" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : buckets.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">暂无存储桶</div>
        ) : (
          <div className="p-2">
            {buckets.map((bucket) => (
              <div
                key={bucket.name}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition-all ${
                  currentBucket === bucket.name
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => setCurrentBucket(bucket.name)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{bucket.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {bucket.objectCount === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBucket(bucket.name);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                      title="删除存储桶"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
