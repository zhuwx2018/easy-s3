import { Folder, File, CheckSquare, Square, Download, Trash2, Edit } from 'lucide-react';
import { useBrowserStore } from '../store/browserStore';

interface Props {
  onDownload: (key: string) => void;
  onDelete: (keys: string[]) => void;
  onRename: (oldKey: string, newKey: string) => void;
  onNavigate: (prefix: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function FileList({ onDownload, onDelete, onRename }: Props) {
  const { objects, searchQuery, selectedObjects, toggleSelected, setSelectedObjects } =
    useBrowserStore();

  const filtered = objects.filter((obj) =>
    obj.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((o) => selectedObjects.includes(o.key));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedObjects([]);
    } else {
      setSelectedObjects(filtered.map((o) => o.key));
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="w-10 p-3">
              <button onClick={toggleAll} className="p-1">
                {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
            </th>
            <th className="text-left p-3">名称</th>
            <th className="text-left p-3 w-24">大小</th>
            <th className="text-left p-3 w-40">修改时间</th>
            <th className="w-32 p-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((obj) => (
            <tr key={obj.key} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <button onClick={() => toggleSelected(obj.key)} className="p-1">
                  {selectedObjects.includes(obj.key) ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {obj.isFolder ? (
                    <Folder className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <File className="w-4 h-4 text-gray-400" />
                  )}
                  <button
                    onClick={() => !obj.isFolder && onDownload(obj.key)}
                    className={obj.isFolder ? 'cursor-pointer' : 'hover:underline'}
                  >
                    {obj.key.split('/').filter(Boolean).pop()}
                  </button>
                </div>
              </td>
              <td className="p-3 text-sm text-gray-500">
                {obj.isFolder ? '--' : formatSize(obj.size)}
              </td>
              <td className="p-3 text-sm text-gray-500">
                {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '--'}
              </td>
              <td className="p-3">
                <div className="flex gap-1">
                  {!obj.isFolder && (
                    <button
                      onClick={() => onDownload(obj.key)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="下载"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const newName = prompt('输入新名称', obj.key.split('/').pop());
                      if (newName && newName !== obj.key.split('/').pop()) {
                        const prefix = obj.key.includes('/') ? obj.key.substring(0, obj.key.lastIndexOf('/') + 1) : '';
                        onRename(obj.key, prefix + newName);
                      }
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="重命名"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete([obj.key])}
                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="p-8 text-center text-gray-500">暂无文件</div>
      )}
    </div>
  );
}