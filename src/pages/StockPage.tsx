import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Trash2, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Terminal, GripVertical } from 'lucide-react';
import { useStockStore } from '../store/stockStore';

interface SearchResult {
  symbol: string;
  name: string;
  pinyin: string;
  market: string;
}

interface LogEntry {
  time: string;
  type: 'search' | 'quote' | 'error';
  url: string;
  params: string;
  response: string;
  status: 'success' | 'error';
}

export function StockPage() {
  const { stocks, addStock, removeStock, updateStock, reorderStocks } = useStockStore();
  const stocksRef = useRef(stocks);
  stocksRef.current = stocks;

  const [inputSymbol, setInputSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>('');
  const [fetchError, setFetchError] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const intervalRef = useRef<number | null>(null);

  const addLog = (entry: Omit<LogEntry, 'time'>) => {
    const newLog: LogEntry = {
      ...entry,
      time: new Date().toLocaleTimeString(),
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  // 搜索股票
  const searchStocks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setError('');
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(query)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`;

    try {
      const text = await invoke<string>('http_get', { url });
      addLog({ type: 'search', url, params: query, response: text.slice(0, 300), status: 'success' });

      const data = JSON.parse(text);
      if (data.QuotationCodeTable?.Data) {
        const results: SearchResult[] = data.QuotationCodeTable.Data.slice(0, 10).map((item: any) => {
          let symbol = '';
          if (item.JYS === 'HK' || item.Classify === 'HK') {
            symbol = 'hk' + item.Code.toLowerCase();
          } else if (item.Classify === 'UsStock') {
            symbol = 'us' + item.Code.toUpperCase();
          } else if (item.JYS === 'SH' || item.Classify === 'SH' || item.Code.startsWith('6')) {
            symbol = item.Code + '.SH';
          } else {
            symbol = item.Code + '.SZ';
          }
          return { symbol, name: item.Name, pinyin: item.PinYin || '', market: item.JYS || item.Classify || '' };
        });
        setSearchResults(results);
      }
    } catch (e) {
      addLog({ type: 'error', url, params: query, response: String(e), status: 'error' });
      setError(`搜索失败: ${e}`);
    }
  };

  // 获取股票行情
  const fetchStocks = async () => {
    const currentStocks = stocksRef.current;
    if (currentStocks.length === 0) return;

    // 构建新浪行情API代码
    const codes = currentStocks.map(s => {
      const sym = s.symbol.toLowerCase();
      if (sym.startsWith('hk')) return 'hk' + sym.slice(2);
      if (sym.startsWith('us')) return 'us' + sym.slice(2);
      if (sym.endsWith('.sh')) return 'sh' + sym.slice(0, -3);
      if (sym.endsWith('.sz')) return 'sz' + sym.slice(0, -3);
      // 纯数字代码，根据规则添加后缀
      if (/^\d{6}$/.test(sym)) {
        return sym.startsWith('6') || sym.startsWith('9') ? 'sh' + sym : 'sz' + sym;
      }
      return sym;
    }).join(',');

    const url = `https://hq.sinajs.cn/list=${codes}`;

    try {
      const text = await invoke<string>('http_get', { url });
      addLog({ type: 'quote', url, params: codes, response: text.slice(0, 300), status: 'success' });

      // 解析返回数据，建立 code -> data 映射
      // 格式: var hq_str_sh600519="名称,今开,昨收,现价,最高,最低,..."
      const dataMap = new Map<string, { price: number; change: number; changePercent: number }>();

      const lines = text.split('\n');
      for (const line of lines) {
        const match = line.match(/hq_str_(\w+)="([^"]+)"/);
        if (!match) continue;

        const code = match[1];
        const values = match[2].split(',');
        if (values.length < 6) continue;

        const price = parseFloat(values[3]); // 现价
        const prevClose = parseFloat(values[2]); // 昨收

        if (isNaN(price) || price <= 0) continue;

        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        dataMap.set(code, { price, change, changePercent });
      }

      // 更新 store 中的股票数据
      for (const stock of currentStocks) {
        const sym = stock.symbol.toLowerCase();
        let codeKey = sym;
        if (sym.endsWith('.sh')) codeKey = 'sh' + sym.slice(0, -3);
        if (sym.endsWith('.sz')) codeKey = 'sz' + sym.slice(0, -3);
        if (sym.startsWith('hk')) codeKey = 'hk' + sym.slice(2);
        if (sym.startsWith('us')) codeKey = 'us' + sym.slice(2);

        const data = dataMap.get(codeKey);
        if (data) {
          updateStock(stock.symbol, {
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
          });
        }
      }

      setFetchError('');
    } catch (e) {
      addLog({ type: 'error', url, params: codes, response: String(e), status: 'error' });
      setFetchError(`获取失败: ${e}`);
    }
  };

  const handleAddStock = (result: SearchResult) => {
    addStock({ symbol: result.symbol, name: result.name, price: 0, change: 0, changePercent: 0 });
    setInputSymbol('');
    setSearchResults([]);
  };

  // 自动刷新
  useEffect(() => {
    if (stocks.length > 0) {
      fetchStocks();
      intervalRef.current = window.setInterval(fetchStocks, 3000) as unknown as number;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stocks.length]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => searchStocks(inputSymbol), 300);
    return () => clearTimeout(timer);
  }, [inputSymbol]);

  // 格式化货币符号
  const getCurrencySymbol = (symbol: string) => {
    const sym = symbol.toLowerCase();
    if (sym.startsWith('hk')) return 'HK$';
    if (sym.startsWith('us')) return '$';
    return '¥';
  };

  // 格式化价格
  const formatPrice = (price: number) => isNaN(price) || price <= 0 ? '--' : price.toFixed(2);

  return (
    <div className="p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">NIU STOCKER</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDebug(!showDebug)} className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">
            <Terminal className="w-4 h-4" />
            {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={fetchStocks} disabled={stocks.length === 0} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            <RefreshCw className="w-4 h-4" />刷新
          </button>
        </div>
      </div>

      {/* 调试面板 */}
      {showDebug && (
        <div className="mb-6 p-4 bg-gray-900 text-gray-100 rounded-lg max-h-80 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-400">请求日志</span>
            <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-300">清除</button>
          </div>
          {logs.length === 0 ? (
            <div className="text-gray-500 text-sm">暂无日志</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className="border-b border-gray-700 pb-2">
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="text-gray-500">{log.time}</span>
                    <span className={`px-1.5 py-0.5 rounded ${log.type === 'search' ? 'bg-blue-900 text-blue-300' : log.type === 'quote' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {log.type === 'search' ? '搜索' : log.type === 'quote' ? '行情' : '错误'}
                    </span>
                    <span className={log.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                      {log.status === 'success' ? '成功' : '失败'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">地址: {log.url}</div>
                  {log.params && <div className="text-xs text-gray-400">参数: {log.params}</div>}
                  <div className="text-xs text-gray-400 break-all">返回: {log.response}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 搜索框 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
            placeholder="输入股票代码、名称或拼音搜索"
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
              {searchResults.map((result) => (
                <button key={result.symbol} onClick={() => handleAddStock(result)} className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{result.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{result.symbol}</span>
                  </div>
                  {result.pinyin && <span className="text-xs text-gray-400">{result.pinyin}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
      {fetchError && <div className="mb-4 p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded text-sm">{fetchError}</div>}

      {/* 股票列表 - 卡片形式（可拖动排序） */}
      {stocks.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><p>暂无股票，请搜索添加</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {stocks.map((stock, index) => (
            <div
              key={stock.symbol}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
                setDraggedIndex(index);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverIndex(index);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (!isNaN(fromIndex) && fromIndex !== index) {
                  reorderStocks(fromIndex, index);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-500 border-2' : ''}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-600">{stock.symbol.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{stock.symbol}</div>
                  <div className="text-xs text-gray-500 truncate">{stock.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-bold">{getCurrencySymbol(stock.symbol)}{formatPrice(stock.price)}</div>
                  <div className={`text-xs flex items-center gap-1 ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </div>
                </div>
                <button onClick={() => removeStock(stock.symbol)} className="p-1 text-red-500 hover:text-red-700" title="删除">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
