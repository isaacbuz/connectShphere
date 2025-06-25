import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AIContextType {
  isAIActive: boolean;
  aiSuggestions: string[];
  toggleAI: () => void;
  getSuggestions: (content: string) => Promise<string[]>;
  clearSuggestions: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

interface AIProviderProps {
  children: ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const [isAIActive, setIsAIActive] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const toggleAI = () => {
    setIsAIActive(!isAIActive);
  };

  const getSuggestions = async (content: string): Promise<string[]> => {
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
      return data.suggestions || [];
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return [];
    }
  };

  const clearSuggestions = () => {
    setAiSuggestions([]);
  };

  const value: AIContextType = {
    isAIActive,
    aiSuggestions,
    toggleAI,
    getSuggestions,
    clearSuggestions,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}; 