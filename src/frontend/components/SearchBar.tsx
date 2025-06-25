import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'user' | 'content' | 'tag';
  title: string;
  subtitle?: string;
  avatar?: string;
  url: string;
}

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchContent = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      // Simulate API call
      setTimeout(() => {
        const mockResults: SearchResult[] = [
          {
            id: '1',
            type: 'user',
            title: 'Alice Johnson',
            subtitle: '@alicej',
            avatar: '👩',
            url: '/profile/alicej'
          },
          {
            id: '2',
            type: 'content',
            title: 'The Future of Web3',
            subtitle: 'A comprehensive guide to decentralized applications...',
            url: '/post/123'
          },
          {
            id: '3',
            type: 'tag',
            title: '#web3',
            subtitle: '1.2k posts',
            url: '/tag/web3'
          },
          {
            id: '4',
            type: 'user',
            title: 'Bob Smith',
            subtitle: '@bobsmith',
            avatar: '👨',
            url: '/profile/bobsmith'
          },
          {
            id: '5',
            type: 'content',
            title: 'AI and Blockchain Integration',
            subtitle: 'Exploring the intersection of artificial intelligence...',
            url: '/post/456'
          }
        ];

        // Filter results based on query
        const filteredResults = mockResults.filter(result =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.subtitle?.toLowerCase().includes(query.toLowerCase())
        );

        setResults(filteredResults);
        setIsLoading(false);
      }, 300);
    };

    const debounceTimer = setTimeout(searchContent, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Navigate to search results page
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return '👤';
      case 'content': return '📝';
      case 'tag': return '🏷️';
      default: return '🔍';
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, content, or tags..."
            className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔍</span>
          </div>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && (query.trim().length >= 2) && (
        <div className="absolute top-full mt-1 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    to={result.url}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {result.avatar ? (
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm">
                          {result.avatar}
                        </div>
                      ) : (
                        <span className="text-lg">{getResultIcon(result.type)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {result.type}
                      </span>
                    </div>
                  </Link>
                ))}
                
                {/* View All Results */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <Link
                    to={`/search?q=${encodeURIComponent(query)}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline py-2"
                  >
                    View all results for "{query}"
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                <span className="text-lg">🔍</span>
                <p className="mt-1 text-sm">No results found</p>
                <p className="text-xs">Try different keywords</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 