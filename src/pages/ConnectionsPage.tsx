import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ConnectionForm } from '../components/ConnectionForm';
import { useConnectionStore, type Connection } from '../store/connectionStore';

export function ConnectionsPage() {
  const { connections, setConnections, addConnection, removeConnection, setCurrentConnection } =
    useConnectionStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Connection | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const result = await invoke<Connection[]>('list_connections');
      setConnections(result);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (connection: Connection) => {
    try {
      await invoke('save_connection', { connection });
      if (editing) {
        removeConnection(editing.name);
      }
      addConnection(connection);
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await invoke('delete_connection', { name });
      removeConnection(name);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTest = async (connection: Connection) => {
    return invoke<boolean>('test_connection', { connection });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">S3 连接</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          新建连接
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded">
          <h2 className="text-lg font-medium mb-4">{editing ? '编辑连接' : '新建连接'}</h2>
          <ConnectionForm
            initial={editing || undefined}
            onSubmit={handleSubmit}
            onTest={handleTest}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      <div className="space-y-2">
        {connections.map((conn) => (
          <div key={conn.name} className="flex items-center justify-between p-4 border rounded">
            <div>
              <div className="font-medium">{conn.name}</div>
              <div className="text-sm text-gray-500">{conn.endpoint} ({conn.region})</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setCurrentConnection(conn); }}
                className="px-3 py-1 border rounded hover:bg-gray-50"
              >
                连接
              </button>
              <button
                onClick={() => { setEditing(conn); setShowForm(true); }}
                className="px-3 py-1 border rounded hover:bg-gray-50"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(conn.name)}
                className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}