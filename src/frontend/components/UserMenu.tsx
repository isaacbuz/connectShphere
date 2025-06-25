import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

export const UserMenu: React.FC = () => {
  const { account, disconnect } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white font-medium text-sm">
            {account ? account.slice(2, 4).toUpperCase() : 'U'}
          </span>
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
          {account ? formatAddress(account) : 'User'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            {/* User Info */}
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-200 dark:border-gray-600">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {account ? account.slice(2, 4).toUpperCase() : 'U'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {account ? formatAddress(account) : 'Anonymous User'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {account ? 'Connected' : 'Not connected'}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>👤</span>
                <span>Profile</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>⚙️</span>
                <span>Settings</span>
              </Link>

              <Link
                to="/wallet"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>💼</span>
                <span>Wallet</span>
              </Link>

              <Link
                to="/activity"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>📊</span>
                <span>Activity</span>
              </Link>

              <Link
                to="/bookmarks"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>🔖</span>
                <span>Bookmarks</span>
              </Link>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <span>🚪</span>
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 