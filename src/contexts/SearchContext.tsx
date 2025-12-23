import { createContext, useContext, useState, ReactNode } from 'react';
import { CarousellSearchResult } from '../lib/carousellApi';

// Unified search result type
export type UnifiedSearchResult = CarousellSearchResult;

type SearchContextType = {
  searchResults: UnifiedSearchResult[];
  setSearchResults: (results: UnifiedSearchResult[]) => void;
  currentSearchQuery: string;
  setCurrentSearchQuery: (query: string) => void;
  selectedPlatform: string;
  setSelectedPlatform: (platform: string) => void;
  forYouRecommendations: UnifiedSearchResult[];
  setForYouRecommendations: (results: UnifiedSearchResult[]) => void;
  clearSearchData: () => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [forYouRecommendations, setForYouRecommendations] = useState<UnifiedSearchResult[]>([]);

  const clearSearchData = () => {
    setSearchResults([]);
    setCurrentSearchQuery('');
    setSelectedPlatform('All');
  };

  return (
    <SearchContext.Provider value={{
      searchResults,
      setSearchResults,
      currentSearchQuery,
      setCurrentSearchQuery,
      selectedPlatform,
      setSelectedPlatform,
      forYouRecommendations,
      setForYouRecommendations,
      clearSearchData
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}