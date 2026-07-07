import { useState, useEffect } from 'react';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { BrowserPage } from './pages/BrowserPage';
import { StockPage } from './pages/StockPage';
import { useConnectionStore } from './store/connectionStore';

function App() {
  const { currentConnection } = useConnectionStore();
  const [page, setPage] = useState<'connections' | 'browser' | 'stock'>(
    currentConnection ? 'browser' : 'connections'
  );
  const [stockVisible, setStockVisible] = useState(false);

  // F8 切换股票页面显示
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setStockVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync page with currentConnection
  useEffect(() => {
    if (currentConnection && page === 'connections') {
      setPage('browser');
    }
  }, [currentConnection]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b px-6 py-3 flex gap-4">
        <button
          onClick={() => setStockVisible(!stockVisible)}
          className={`px-3 py-1 rounded ${stockVisible ? 'bg-blue-100 text-blue-700' : ''}`}
        >
          NIU STOCKER {stockVisible ? '✓' : ''}
        </button>
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
      {stockVisible ? <StockPage /> :
       page === 'connections' ? <ConnectionsPage /> :
       page === 'browser' ? <BrowserPage /> :
       <ConnectionsPage />}
    </div>
  );
}
export default App;
