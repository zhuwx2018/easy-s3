import { Search } from 'lucide-react';
import { useBrowserStore } from '../store/browserStore';

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useBrowserStore();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="搜索文件..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border rounded-lg"
      />
    </div>
  );
}