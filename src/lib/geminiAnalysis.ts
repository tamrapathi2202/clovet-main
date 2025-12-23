// SINGLE CLEANED FILE: Gemini helper with retry/backoff
import { GoogleGenAI } from "@google/genai";
import { getDisableExternalApiRuntime } from './devMode';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export type WardrobeAnalysisPrompt = {
  items: Array<{
    name: string;
    category: string;
    color?: string;
    brand?: string;
    style?: string;
  }>;
  userPreferences?: {
    favoriteColors?: string[];
    preferredStyles?: string[];
    budgetRange?: { min: number; max: number };
  };
};

export type GeminiRecommendation = {
  searchQueries: string[];
  styleInsights: string[];
  recommendations: string[];
  missingPieces: string[];
};

export async function analyzeWardrobeWithGemini(wardrobeData: WardrobeAnalysisPrompt): Promise<GeminiRecommendation> {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    if (getDisableExternalApiRuntime()) {
      console.info('Developer Mode or environment toggle enabled — skipping Gemini call and returning fallback recommendations');
      return extractRecommendationsFromText('');
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = generateWardrobeAnalysisPrompt(wardrobeData);

    // Try once, and retry if overloaded
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
      });
    } catch (err) {
      const msg = String((err as any)?.message || err || '');
      if (msg.includes('503') || msg.toLowerCase().includes('overloaded') || msg.toLowerCase().includes('unavailable')) {
        console.warn('Gemini overloaded, retrying once');
        await new Promise(r => setTimeout(r, 1000));
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: prompt }] }],
        });
      } else {
        throw err;
      }
    }

    const generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error('No response from Gemini API');
    return parseGeminiResponse(generatedText);
  } catch (err) {
    console.error('Error analyzing wardrobe with Gemini:', err);
    throw err;
  }
}

function generateWardrobeAnalysisPrompt(wardrobeData: WardrobeAnalysisPrompt): string {
  const itemsList = wardrobeData.items.map(item =>
    `- ${item.name} (${item.category}${item.color ? `, ${item.color}` : ''}${item.brand ? `, ${item.brand}` : ''})`
  ).join('\n');

  const preferences = wardrobeData.userPreferences;
  const preferencesText = preferences ? `\nUser Preferences:\n- Favorite Colors: ${preferences.favoriteColors?.join(', ') || 'Not specified'}\n- Preferred Styles: ${preferences.preferredStyles?.join(', ') || 'Not specified'}\n- Budget Range: ${preferences.budgetRange ? `$${preferences.budgetRange.min}-$${preferences.budgetRange.max}` : 'Not specified'}\n` : '';

  return `
As a fashion stylist and wardrobe consultant, analyze this user's wardrobe and provide personalized recommendations.

Current Wardrobe:
${itemsList}

${preferencesText}

Please provide your analysis in the following JSON format:
{
  "searchQueries": [
    "2-3 specific search terms that would help find items that complement this wardrobe",
    "Focus on gaps, versatile pieces, and style enhancement"
  ],
  "styleInsights": [
    "1-2 insights about the user's current style and wardrobe composition",
    "Include color palette analysis and style direction"
  ],
  "recommendations": [
    "2-3 specific item recommendations that would enhance the wardrobe",
    "Consider versatility, missing pieces, and style cohesion"
  ],
  "missingPieces": [
    "1-2 key pieces missing from the wardrobe",
    "Focus on versatile items that would maximize outfit options"
  ]
}

Make the search queries specific and suitable for secondhand/vintage fashion platforms. Consider current fashion trends while maintaining timeless appeal. Focus on sustainable fashion choices and versatile pieces that work with existing items.
`;
}

function parseGeminiResponse(responseText: string): GeminiRecommendation {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Gemini response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      searchQueries: Array.isArray(parsed.searchQueries) ? parsed.searchQueries : [],
      styleInsights: Array.isArray(parsed.styleInsights) ? parsed.styleInsights : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      missingPieces: Array.isArray(parsed.missingPieces) ? parsed.missingPieces : []
    };
  } catch (err) {
    console.error('Error parsing Gemini response:', err);
    return extractRecommendationsFromText(responseText);
  }
}

function extractRecommendationsFromText(_text: string): GeminiRecommendation {
  return {
    searchQueries: ['versatile blazer', 'statement accessories', 'comfortable flats', 'classic white shirt', 'dark wash jeans'],
    styleInsights: ['Your wardrobe shows a preference for classic, versatile pieces', 'There\'s a good foundation with neutral colors that can be built upon', 'Adding some statement pieces would enhance your style options'],
    recommendations: ['A structured blazer for professional and casual looks', 'Statement jewelry to elevate basic outfits', 'A versatile midi dress for multiple occasions', 'Quality leather accessories for a polished finish'],
    missingPieces: ['Structured outerwear piece', 'Statement accessories', 'Versatile dress option', 'Quality leather goods']
  };
}

export function generateSearchQueries(geminiRecommendation: GeminiRecommendation, maxQueries: number = 6): string[] {
  const { searchQueries, missingPieces, recommendations } = geminiRecommendation;
  const allQueries = [
    ...searchQueries,
    ...missingPieces.map(piece => piece.toLowerCase()),
    ...recommendations.map(rec => extractKeywords(rec))
  ].filter(Boolean);
  return Array.from(new Set(allQueries)).slice(0, maxQueries);
}

function extractKeywords(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(' ').filter(w => w.length > 3).slice(0,2).join(' ');
}
