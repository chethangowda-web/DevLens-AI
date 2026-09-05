import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, Loader2, X } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { apiClient } from '../../services/apiClient';

interface SearchResult {
  id: string;
  file_path: string;
  content: string;
  start_line: number;
  end_line: number;
  symbol_name: string | null;
  symbol_type: string | null;
  score: number;
}

export const SearchModal: React.FC = () => {
  const { isSearchModalOpen, setSearchModalOpen, activeRepo, openFile, highlightLines } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setSearchModalOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !activeRepo) return;

    setIsLoading(true);
    try {
      const res = await apiClient.post(`/projects/${activeRepo.projectId}/repositories/${activeRepo.id}/search`, {
        query,
      });
      setResults(res.data.data.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    try {
      openFile({
        id: `search-${result.id}`,
        name: result.file_path.split('/').pop() || 'result',
        path: result.file_path,
        language: 'typescript', // fallback
        content: result.content
      });
      highlightLines(result.start_line, result.end_line);
      setSearchModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isSearchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#1e1e1e] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <form onSubmit={handleSearch} className="flex items-center px-4 py-3 border-b border-zinc-800 relative">
          <Search className="w-5 h-5 text-zinc-400 absolute left-4" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeRepo ? `Search across ${activeRepo.name} (hybrid semantic)...` : 'Select a repository first...'}
            disabled={!activeRepo}
            className="w-full pl-10 pr-10 py-2 bg-transparent border-none text-zinc-100 placeholder-zinc-500 focus:outline-none text-lg"
          />
          <button type="button" onClick={() => setSearchModalOpen(false)} className="absolute right-4 text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </form>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="p-8 flex justify-center text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          
          {!isLoading && results.length > 0 && (
            <div className="p-2 space-y-1">
              {results.map((res) => (
                <button
                  key={res.id}
                  onClick={() => handleResultClick(res)}
                  className="w-full text-left flex flex-col p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex items-center space-x-2 text-sm text-zinc-300 mb-1">
                    <FileCode className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium truncate">{res.file_path}</span>
                    <span className="text-zinc-600 px-2">•</span>
                    <span className="text-zinc-500">Lines {res.start_line}-{res.end_line}</span>
                    {res.symbol_type && (
                      <>
                        <span className="text-zinc-600 px-2">•</span>
                        <span className="text-emerald-400/80 capitalize">{res.symbol_type}: {res.symbol_name}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 line-clamp-2 bg-zinc-900/50 p-2 rounded border border-zinc-800/50 group-hover:border-zinc-700">
                    {res.content.split('\n').slice(0, 3).join('\n')}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
