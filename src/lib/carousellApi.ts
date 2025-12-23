// Carousell API service with caching
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY
const RAPIDAPI_HOST = import.meta.env.VITE_RAPIDAPI_HOST
// runtime dev mode checks are handled elsewhere — don't import runtime helper here

// Basic validation so we can avoid noisy HTTP errors when keys are missing
function checkRapidApiConfig(): boolean {
  if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    console.warn('Carousell RapidAPI configuration is missing. Set VITE_RAPIDAPI_KEY and VITE_RAPIDAPI_HOST in your .env to enable Carousell searches.');
    return false;
  }
  return true;
}

export type CarousellSearchResult = {
  id: string;
  name: string;
  price: number;
  currency: string;
  platform: string;
  image_url: string;
  url: string;
  seller?: any;
  description?: string;
  condition?: string;
  size?: string;
  brand?: string;
  posted_date?: string;
  category?: string;
  color?: string;
  material?: string;
  measurements?: {
    bust?: string;
    waist?: string;
    hips?: string;
    length?: string;
  };
};

// Cache for search results
const searchCache = new Map<string, { data: CarousellSearchResult[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function searchCarousell(keyword: string, country: string = 'sg'): Promise<CarousellSearchResult[]> {
  const cacheKey = `${keyword}-${country}`;

  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached results for:', keyword);
    return cached.data;
  }

  // Quick guard if env is not configured
  if (!checkRapidApiConfig()) {
    console.info('Missing keys — returning mock results');
    const mockResults = getMockResults(keyword);

    // IMPORTANT: Cache the mock results so ProductView can find them later!
    searchCache.set(cacheKey, {
      data: mockResults,
      timestamp: Date.now()
    });

    return mockResults;
  }

  try {
    console.log('Fetching new results from Carousell API for:', keyword);
    // Sanitize the keyword to avoid very long / malformed queries that some endpoints reject
    const sanitized = sanitizeQuery(keyword);
    const url = `https://carousell.p.rapidapi.com/searchByKeyword?keyword=${encodeURIComponent(sanitized)}&country=${country}&count=50`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'Unable to read response body');
      // If quota exceeded (429) or unauthorized (401/403), fallback to mock data
      if (response.status === 429 || response.status === 401 || response.status === 403) {
        console.warn(`Carousell API limit reached or auth failed (${response.status}). Falling back to mock data.`);
        const mockResults = getMockResults(keyword);
        searchCache.set(cacheKey, { data: mockResults, timestamp: Date.now() });
        return mockResults;
      }

      const message = `Carousell API returned ${response.status} ${response.statusText}: ${body}`;
      throw new Error(message);
    }

    const data = await response.json();
    const transformedData = transformCarousellData(data);

    // Cache the results
    searchCache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now()
    });

    return transformedData;
  } catch (error) {
    console.error('Error fetching from Carousell API:', error);
    // Fallback to mock data on error
    console.log('Falling back to mock data due to error');
    const mockResults = getMockResults(keyword);
    searchCache.set(cacheKey, { data: mockResults, timestamp: Date.now() });
    return mockResults;
  }
}

/**
 * Sanitize/shorten queries sent to the Carousell endpoint
 * - Remove long punctuation blocks
 * - Truncate to a safe length
 */
function sanitizeQuery(q: string): string {
  if (!q) return q;
  // Remove excessive punctuation and newlines
  let s = q.replace(/[\n\r]+/g, ' ')
    .replace(/[*_~`<>]/g, ' ') // remove markdown-like characters
    .replace(/:\s*/g, ' ') // remove colon separators that might break some endpoints
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();

  // If it's too long, take the first 80 characters and try to keep words whole
  const MAX = 100;
  if (s.length > MAX) {
    s = s.slice(0, MAX);
    // cut back to last space to avoid mid-word break
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > 20) s = s.slice(0, lastSpace);
  }

  return s;
}

// Get a specific product by ID from cache or API
export function getCarousellProduct(productId: string): CarousellSearchResult | null {
  // Search through all cached results for the product
  for (const [, cacheEntry] of searchCache) {
    const product = cacheEntry.data.find(item => item.id === productId);
    if (product) {
      return product;
    }
  }
  return null;
}

// Clear cache
export function clearSearchCache() {
  searchCache.clear();
}

// Transform Carousell API response to match your SearchResult type
function transformCarousellData(carousellItems: any[]): CarousellSearchResult[] {
  if (!Array.isArray(carousellItems)) {
    console.warn('Expected array but got:', typeof carousellItems);
    return [];
  }

  return carousellItems.map((item: any) => {
    // Extract price from the string (e.g., "S$300" -> 300)
    const priceMatch = item.price?.match(/\d+/);
    const price = priceMatch ? parseInt(priceMatch[0]) : 0;

    // Extract currency from the string (e.g., "S$300" -> "SGD")
    const currency = item.price?.startsWith('S$') ? 'SGD' : 'USD';

    // Get image URL from media array
    const imageUrl = item.media?.[0]?.photoItem?.url || item.thumbnailURL || '';

    // Get description from belowFold array
    const description = item.belowFold?.find((fold: any) => fold.component === 'paragraph')?.stringContent || '';

    // Extract additional details
    const sizeInfo = item.belowFold?.find((fold: any) =>
      fold.stringContent?.toLowerCase().includes('size:') ||
      fold.stringContent?.toLowerCase().includes('eu ') ||
      fold.stringContent?.toLowerCase().includes('uk ') ||
      fold.stringContent?.toLowerCase().includes('us ')
    )?.stringContent;

    // Extract condition info
    const conditionInfo = item.belowFold?.find((fold: any) =>
      fold.stringContent?.toLowerCase().includes('condition') ||
      fold.stringContent?.toLowerCase().includes('new') ||
      fold.stringContent?.toLowerCase().includes('used') ||
      fold.stringContent?.toLowerCase().includes('like new')
    )?.stringContent;

    return {
      id: item.id || item.listingID?.toString() || Math.random().toString(36),
      name: item.title || 'Unknown Item',
      price: price,
      currency: currency,
      platform: 'Carousell',
      image_url: imageUrl,
      url: `https://carousell.com/p/${item.listingID}`,
      seller: item.seller?.username || item.seller?.firstName || 'Unknown Seller',
      description: description,
      condition: conditionInfo || 'Good',
      size: sizeInfo || 'One Size',
      brand: extractBrand(item.title || ''),
      posted_date: item.aboveFold?.[0]?.timestampContent ?
        new Date(item.aboveFold[0].timestampContent.seconds.low * 1000).toISOString().split('T')[0] :
        new Date().toISOString().split('T')[0],
      category: categorizeItem(item.title || ''),
      color: extractColor(item.title || ''),
      material: extractMaterial(description)
    };
  }).filter(item => item.name !== 'Unknown Item'); // Filter out items without proper data
}

// Helper functions for extracting additional details
function extractBrand(title: string): string {
  const brands = ['Armani', 'Exchange', 'COS', 'HAV', 'Mazie', 'Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Levi\'s', 'Gucci', 'Prada', 'Topshop', 'ASOS'];
  for (const brand of brands) {
    if (title.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return 'Unknown Brand';
}

function categorizeItem(title: string): string {
  const categories = {
    'jacket': 'Outerwear',
    'blazer': 'Outerwear',
    'coat': 'Outerwear',
    'sweater': 'Knitwear',
    'jumper': 'Knitwear',
    'shirt': 'Tops',
    'blouse': 'Tops',
    'tee': 'Tops',
    'dress': 'Dresses',
    'pants': 'Bottoms',
    'jeans': 'Bottoms',
    'trousers': 'Bottoms',
    'skirt': 'Bottoms'
  };

  for (const [keyword, category] of Object.entries(categories)) {
    if (title.toLowerCase().includes(keyword)) {
      return category;
    }
  }
  return 'Clothing';
}

function extractColor(title: string): string {
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'brown', 'gray', 'grey', 'navy', 'cream', 'beige', 'khaki'];
  for (const color of colors) {
    if (title.toLowerCase().includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1);
    }
  }
  return 'Unknown';
}

function extractMaterial(description: string): string {
  const materials = ['leather', 'cotton', 'wool', 'silk', 'polyester', 'denim', 'linen', 'cashmere', 'satin', 'velvet'];
  for (const material of materials) {
    if (description.toLowerCase().includes(material)) {
      return material.charAt(0).toUpperCase() + material.slice(1);
    }
  }
  return 'Mixed Materials';
}

function getMockResults(keyword: string): CarousellSearchResult[] {
  if (!keyword || !keyword.trim()) {
    return [];
  }

  const lowerKeyword = keyword.toLowerCase();

  // 1. Generate dynamic results based on the keyword
  // This ensures we always have "many" results that are relevant
  const dynamicResults: CarousellSearchResult[] = [];
  const numResults = 50; // Generate exactly 50 items as requested

  // Expanded Image pools for different categories
  // Using reliable Unsplash/Pexels IDs
  const imagePools: Record<string, string[]> = {
    'jacket': [
      'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1040424/pexels-photo-1040424.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/16170/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1381556/pexels-photo-1381556.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/6770028/pexels-photo-6770028.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/325876/pexels-photo-325876.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/837140/pexels-photo-837140.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1035685/pexels-photo-1035685.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/17042226/pexels-photo-17042226/free-photo-of-model-in-leather-jacket.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2061901/pexels-photo-2061901.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/28534432/pexels-photo-28534432/free-photo-of-stylish-man-in-leather-jacket-outdoors.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/18395560/pexels-photo-18395560/free-photo-of-man-in-leather-jacket-posing-on-street.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'dress': [
      'https://images.pexels.com/photos/902030/pexels-photo-902030.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2235071/pexels-photo-2235071.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/291759/pexels-photo-291759.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1755459/pexels-photo-1755459.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1449667/pexels-photo-1449667.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2065195/pexels-photo-2065195.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2043590/pexels-photo-2043590.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2562499/pexels-photo-2562499.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'pants': [
      'https://images.pexels.com/photos/4210866/pexels-photo-4210866.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1895943/pexels-photo-1895943.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1346187/pexels-photo-1346187.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2343661/pexels-photo-2343661.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1321943/pexels-photo-1321943.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'jeans': [
      'https://images.pexels.com/photos/4210866/pexels-photo-4210866.jpeg?auto=compress&cs=tinysrgb&w=800', // Black jeans
      'https://images.pexels.com/photos/1082529/pexels-photo-1082529.jpeg?auto=compress&cs=tinysrgb&w=800', // Blue jeans
      'https://images.pexels.com/photos/603022/pexels-photo-603022.jpeg?auto=compress&cs=tinysrgb&w=800', // Denim texture
      'https://images.pexels.com/photos/3584924/pexels-photo-3584924.jpeg?auto=compress&cs=tinysrgb&w=800', // Jeans stack
      'https://images.pexels.com/photos/1895943/pexels-photo-1895943.jpeg?auto=compress&cs=tinysrgb&w=800', // Blue jeans
      'https://images.pexels.com/photos/2343661/pexels-photo-2343661.jpeg?auto=compress&cs=tinysrgb&w=800', // Ripped jeans
      'https://images.pexels.com/photos/1346187/pexels-photo-1346187.jpeg?auto=compress&cs=tinysrgb&w=800',  // Blue jeans
      'https://images.pexels.com/photos/1321943/pexels-photo-1321943.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1082528/pexels-photo-1082528.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/65676/nunes-jeans-clothing-65676.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'denim': [
      'https://images.pexels.com/photos/1040424/pexels-photo-1040424.jpeg?auto=compress&cs=tinysrgb&w=800', // Denim jacket
      'https://images.pexels.com/photos/4210866/pexels-photo-4210866.jpeg?auto=compress&cs=tinysrgb&w=800', // Jeans
      'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800', // Jeans
      'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800', // Jacket
      'https://images.pexels.com/photos/3584924/pexels-photo-3584924.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'skirt': [
      'https://images.pexels.com/photos/1007018/pexels-photo-1007018.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/601316/pexels-photo-601316.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1154861/pexels-photo-1154861.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2466756/pexels-photo-2466756.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2388245/pexels-photo-2388245.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'top': [
      'https://images.pexels.com/photos/6311392/pexels-photo-6311392.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2690323/pexels-photo-2690323.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2043590/pexels-photo-2043590.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    'default': [
      'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/325876/pexels-photo-325876.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
  };

  // Determine category for images
  let categoryKey = 'default';
  if (lowerKeyword.includes('jacket') || lowerKeyword.includes('coat') || lowerKeyword.includes('blazer')) categoryKey = 'jacket';
  else if (lowerKeyword.includes('dress') || lowerKeyword.includes('gown')) categoryKey = 'dress';
  else if (lowerKeyword.includes('jeans')) categoryKey = 'jeans';
  else if (lowerKeyword.includes('denim')) categoryKey = 'denim';
  else if (lowerKeyword.includes('pant') || lowerKeyword.includes('trouser')) categoryKey = 'pants';
  else if (lowerKeyword.includes('skirt')) categoryKey = 'skirt';
  else if (lowerKeyword.includes('top') || lowerKeyword.includes('shirt') || lowerKeyword.includes('blouse')) categoryKey = 'top';

  const images = imagePools[categoryKey] || imagePools['default'];

  for (let i = 0; i < numResults; i++) {
    const price = Math.floor(Math.random() * 150) + 20;
    const brands = ['Zara', 'H&M', 'Uniqlo', 'Vintage', 'Love Bonito', 'Cotton On', 'Nike', 'Adidas', 'Levi\'s', 'Topshop', 'ASOS', 'Mango', 'Pull&Bear'];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const conditions = ['New', 'Like New', 'Good', 'Used'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    // Use a random string for ID to avoid collisions
    const randomId = Math.random().toString(36).substring(2, 15);

    // Generate a realistic looking URL for the "View on Platform" button
    const searchUrl = `https://www.carousell.sg/search/${encodeURIComponent(keyword)}`;

    dynamicResults.push({
      id: `mock-gen-${Date.now()}-${i}-${randomId}`,
      name: `${brand} ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`, // E.g. "Zara Leather jacket"
      price: price,
      currency: 'SGD',
      platform: 'Carousell',
      image_url: images[i % images.length],
      url: searchUrl,
      seller: `Seller_${Math.floor(Math.random() * 1000)}`,
      description: `A beautiful ${keyword} in ${condition.toLowerCase()} condition. Perfect for your wardrobe!`,
      condition: condition,
      size: ['XS', 'S', 'M', 'L', 'XL'][Math.floor(Math.random() * 5)],
      brand: brand,
      posted_date: new Date().toISOString().split('T')[0],
      category: categorizeItem(keyword),
      color: extractColor(keyword) !== 'Unknown' ? extractColor(keyword) : ['Black', 'White', 'Blue', 'Beige', 'Navy'][Math.floor(Math.random() * 5)],
      material: extractMaterial(keyword) !== 'Mixed Materials' ? extractMaterial(keyword) : 'Cotton'
    });
  }

  return dynamicResults;
}