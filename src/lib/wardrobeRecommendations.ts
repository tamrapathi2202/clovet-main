// Wardrobe-based recommendation service with Gemini AI integration
import { api } from './api';
import { WardrobeItem } from './types';
import { searchCarousell, CarousellSearchResult } from './carousellApi';
import {
  analyzeWardrobeWithGemini,
  generateSearchQueries as generateGeminiSearchQueries,
  type WardrobeAnalysisPrompt,
  type GeminiRecommendation
} from './geminiAnalysis';

export type WardrobeFeatureAnalysis = {
  topColors: string[];
  topCategories: string[];
  topBrands: string[];
  commonStyles: string[];
};


/**
 * Analyze user's wardrobe to find top features
 * @param userId - User ID
 * @returns Analysis of wardrobe features
 */
export async function analyzeWardrobeFeatures(_userId: string): Promise<WardrobeFeatureAnalysis> {
  try {
    const { data: wardrobeItems } = await api.get('/wardrobe');

    if (!wardrobeItems || wardrobeItems.length === 0) {
      // Default recommendations for empty wardrobe
      return {
        topColors: ['Black', 'White', 'Blue'],
        topCategories: ['Tops', 'Bottoms', 'Dresses'],
        topBrands: [],
        commonStyles: ['Casual', 'Classic', 'Modern']
      };
    }

    // Count occurrences of each feature
    const colorCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const brandCounts: Record<string, number> = {};

    wardrobeItems.forEach((item: WardrobeItem) => {
      // Count colors
      if (item.color) {
        colorCounts[item.color] = (colorCounts[item.color] || 0) + 1;
      }

      // Count categories
      if (item.category) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }

      // Count brands
      if (item.brand) {
        brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
      }
    });

    // Get top 3 of each feature
    const topColors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([color]) => color);

    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    const topBrands = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand]) => brand);

    return {
      topColors: topColors.length > 0 ? topColors : ['Black', 'White', 'Blue'],
      topCategories: topCategories.length > 0 ? topCategories : ['Tops', 'Bottoms', 'Dresses'],
      topBrands,
      commonStyles: ['Casual', 'Classic', 'Modern'] // TODO: Enhance with actual style analysis
    };
  } catch (error) {
    console.error('Error analyzing wardrobe features:', error);
    return {
      topColors: ['Black', 'White', 'Blue'],
      topCategories: ['Tops', 'Bottoms', 'Dresses'],
      topBrands: [],
      commonStyles: ['Casual', 'Classic', 'Modern']
    };
  }
}
/**
 * Get cached recommendations from database
 * @param userId - User ID
 * @returns Array of cached recommendations or null if not cached
 */
async function getCachedRecommendations(_userId: string): Promise<CarousellSearchResult[] | null> {
  // Stub: Caching not implemented in MongoDB migration yet
  return null;
}

/**
 * Save recommendations to database cache
 * @param userId - User ID
 * @param recommendations - Recommendations to cache
 */
async function saveCachedRecommendations(_userId: string, recommendations: CarousellSearchResult[]): Promise<void> {
  // Stub: Caching not implemented in MongoDB migration yet
  console.log(`Would cache ${recommendations.length} recommendations`);
}

/**
 * Generate personalized recommendations based on wardrobe analysis
 * @param userId - User ID
 * @param forceRefresh - Force refresh cache
 * @returns Array of recommended items
 */
export async function generatePersonalizedRecommendations(
  userId: string,
  forceRefresh: boolean = false
): Promise<CarousellSearchResult[]> {
  // Check database cache first
  if (!forceRefresh) {
    const cached = await getCachedRecommendations(userId);
    if (cached && cached.length > 0) {
      console.log('Returning cached recommendations from database');
      return cached;
    }
  }

  try {
    console.log('Generating new personalized recommendations for user:', userId);

    // Analyze wardrobe features
    const features = await analyzeWardrobeFeatures(userId);
    console.log('Wardrobe analysis:', features);

    // Get wardrobe items for Gemini analysis
    const { data: wardrobeItems } = await api.get('/wardrobe');

    let geminiAnalysis: GeminiRecommendation | undefined;
    let searchQueries: string[] = [];

    // Try Gemini analysis first
    if (wardrobeItems && wardrobeItems.length > 0) {
      try {
        const wardrobeData: WardrobeAnalysisPrompt = {
          items: wardrobeItems.map((item: WardrobeItem) => ({
            name: item.name,
            category: item.category,
            color: item.color || undefined,
            brand: item.brand || undefined
          })),
          userPreferences: {
            favoriteColors: features.topColors,
            preferredStyles: features.commonStyles
          }
        };

        geminiAnalysis = await analyzeWardrobeWithGemini(wardrobeData);
        searchQueries = generateGeminiSearchQueries(geminiAnalysis, 6);
        console.log('Gemini analysis complete:', geminiAnalysis);
        console.log('Generated search queries:', searchQueries);
      } catch (error) {
        console.warn('Gemini analysis failed, falling back to basic analysis:', error);
        // Show user-friendly message if API key is missing
        if (error instanceof Error && error.message.includes('API key not configured')) {
          console.info('💡 To get AI-powered recommendations, add your Gemini API key to .env file');
        }
        // Fallback to basic analysis
        searchQueries = generateSearchQueries(features);
      }
    } else {
      // Empty wardrobe - use basic queries
      searchQueries = generateSearchQueries(features);
    }

    const allRecommendations: CarousellSearchResult[] = [];

    // Execute searches for each query (limit to avoid API overload)
    for (const query of searchQueries.slice(0, 6)) {
      try {
        const results = await searchCarousell(query);
        // Take first 4-5 results from each search for more variety
        allRecommendations.push(...results.slice(0, 4));
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }
    }

    // Remove duplicates and limit results - increased for horizontal scroll
    const uniqueRecommendations = removeDuplicates(allRecommendations).slice(0, 20);

    // Cache the results
    await saveCachedRecommendations(userId, uniqueRecommendations);

    console.log(`Generated ${uniqueRecommendations.length} personalized recommendations`);
    return uniqueRecommendations;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
}

/**
 * Generate search queries based on wardrobe features
 */
function generateSearchQueries(features: WardrobeFeatureAnalysis): string[] {
  const queries: string[] = [];

  // Combine colors with categories
  features.topColors.forEach(color => {
    features.topCategories.forEach(category => {
      queries.push(`${color.toLowerCase()} ${category.toLowerCase()}`);
    });
  });

  // Add brand-specific searches
  features.topBrands.forEach(brand => {
    queries.push(brand.toLowerCase());
  });

  // Add style-based searches
  features.commonStyles.forEach(style => {
    queries.push(`${style.toLowerCase()} clothing`);
  });

  // Add complementary color searches
  const complementaryColors = getComplementaryColors(features.topColors);
  complementaryColors.forEach(color => {
    queries.push(`${color.toLowerCase()} accessories`);
  });

  return queries;
}

/**
 * Get complementary colors for recommendations
 */
function getComplementaryColors(topColors: string[]): string[] {
  const colorComplements: Record<string, string> = {
    'Black': 'White',
    'White': 'Black',
    'Blue': 'Orange',
    'Red': 'Green',
    'Green': 'Red',
    'Yellow': 'Purple',
    'Purple': 'Yellow',
    'Pink': 'Green',
    'Brown': 'Blue',
    'Gray': 'Yellow',
    'Navy': 'Gold',
    'Beige': 'Navy'
  };

  return topColors
    .map(color => colorComplements[color])
    .filter(Boolean)
    .slice(0, 2);
}

/**
 * Remove duplicate items from recommendations
 */
function removeDuplicates(items: CarousellSearchResult[]): CarousellSearchResult[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.name}-${item.price}-${item.platform}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Clear recommendation cache from database
 * @param userId - User ID
 */
export async function clearRecommendationCache(_userId: string): Promise<void> {
  // Stub
  console.log('Cleared recommendation cache (stub)');
}