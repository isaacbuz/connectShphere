import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

export const ConnectButton: React.FC = () => {
  const { connect, disconnect, isConnected, isConnecting } = useWeb3();
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      setShowWalletOptions(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  if (isConnected) {
    return (
      <button
        onClick={handleDisconnect}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
      >
        Disconnect
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWalletOptions(!showWalletOptions)}
        disabled={isConnecting}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span>🔗</span>
            <span>Connect Wallet</span>
          </>
        )}
      </button>

      {showWalletOptions && !isConnecting && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Connect Your Wallet
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">MetaMask</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Popular Ethereum wallet</div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">W</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">WalletConnect</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Connect any wallet</div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">Coinbase Wallet</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Secure & simple</div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                By connecting, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close wallet options */}
      {showWalletOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowWalletOptions(false)}
        />
      )}
    </div>
  );
}; 