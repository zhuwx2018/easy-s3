import { useState, useEffect } from 'react';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { BrowserPage } from './pages/BrowserPage';
import { useConnectionStore } from './store/connectionStore';

function App() {
  const { currentConnection } = useConnectionStore();
  const [page, setPage] = useState<'connections' | 'browser'>(
    currentConnection ? 'browser' : 'connections'
  );

  // Sync page with currentConnection
  useEffect(() => {
    if (currentConnection) {
      setPage('browser');
    }
  }, [currentConnection]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b px-6 py-3 flex gap-4">
        <button
          onClick={() => setPage('connections')}
          className={`px-3 py-1 rounded ${page === 'connections' ? 'bg-blue-100 text-blue-700' : ''}`}
        >
          连接管理
        </button>
        <button
          onClick={() => setPage('browser')}
          disabled={!currentConnection}
          className="px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          文件浏览
        </button>
      </nav>
      {page === 'connections' ? <ConnectionsPage /> : <BrowserPage />}
    </div>
  );
}
export default App;