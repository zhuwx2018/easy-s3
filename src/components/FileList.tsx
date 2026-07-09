import { CheckSquare, Square, Download, Trash2, Edit, Plus } from 'lucide-react';
import { useBrowserStore } from '../store/browserStore';
import { getFileIcon } from '../utils/fileIcons';

interface Props {
  onDownload: (key: string) => void;
  onDelete: (keys: string[]) => void;
  onRename: (oldKey: string, newKey: string) => void;
  onNavigate: (prefix: string) => void;
  onCreateFolder: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function FileList({ onDownload, onDelete, onRename, onNavigate, onCreateFolder }: Props) {
  const { objects, searchQuery, selectedObjects, toggleSelected, setSelectedObjects } =
    useBrowserStore();

  const filtered = objects
    .filter((obj) => obj.key.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      const nameA = a.key.split('/').pop() || '';
      const nameB = b.key.split('/').pop() || '';
      return nameA.localeCompare(nameB);
    });

  const allSelected = filtered.length > 0 && filtered.every((o) => selectedObjects.includes(o.key));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedObjects([]);
    } else {
      setSelectedObjects(filtered.map((o) => o.key));
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
      {/* Toolbar */}
      <div className="bg-slate-100 px-4 py-3 flex items-center justify-between border-b shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={toggleAll} className="p-1">
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>
          <span className="text-sm text-gray-600">{allSelected ? '取消全选' : '全选'}</span>
        </div>
        <button
          onClick={onCreateFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          新建文件夹
        </button>
      </div>

      {/* Table */}
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-24" />
          <col className="w-40" />
          <col className="w-32" />
        </colgroup>
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="p-3 text-left"></th>
            <th className="p-3 text-left text-sm font-medium text-gray-600">名称</th>
            <th className="p-3 text-left text-sm font-medium text-gray-600">大小</th>
            <th className="p-3 text-left text-sm font-medium text-gray-600">修改时间</th>
            <th className="p-3 text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
      </table>
      <div className="flex-1 overflow-y-auto bg-white">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-24" />
            <col className="w-40" />
            <col className="w-32" />
          </colgroup>
          <tbody>
            {filtered.map((obj) => {
              const IconComponent = getFileIcon(obj.key, obj.isFolder);
              return (
                <tr key={obj.key} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="p-3">
                    <button onClick={() => toggleSelected(obj.key)} className="p-1">
                      {selectedObjects.includes(obj.key) ? (
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <IconComponent className={`w-5 h-5 shrink-0 ${obj.isFolder ? 'text-yellow-500' : 'text-gray-400'}`} />
                      <button
                        onClick={() => obj.isFolder && onNavigate(obj.key)}
                        className={`text-sm truncate ${obj.isFolder ? 'text-gray-800 font-medium cursor-pointer hover:underline' : 'text-gray-700'}`}
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
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          title="下载"
                        >
                          <Download className="w-4 h-4 text-blue-500" />
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
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="重命名"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => onDelete([obj.key])}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="text-gray-400 text-sm">暂无文件</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
