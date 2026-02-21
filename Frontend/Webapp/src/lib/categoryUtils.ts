import { Category } from './data';

// Map of category names to Unsplash image URLs
const CATEGORY_IMAGES: Record<string, string> = {
  'Bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
  'Rice': 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=200&h=200&fit=crop',
  'Gravy': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop',
  'Dry Veg': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop',
  'Starter': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop',
  'Snacks': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop',
  'Beverages': 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=200&h=200&fit=crop',
  'Smoothies': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=200&h=200&fit=crop',
  'Dessert': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop',
  'Raita': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=200&h=200&fit=crop',
};

// Fallback image for unmapped categories
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';

/**
 * Get the image URL for a category
 * @param categoryName - The name of the category
 * @returns The Unsplash image URL or fallback if not found
 */
export function getCategoryImage(categoryName: string): string {
  return CATEGORY_IMAGES[categoryName] || FALLBACK_IMAGE;
}

/**
 * Sort categories alphabetically by name
 * @param categories - Array of categories to sort
 * @returns Sorted array of categories
 */
export function sortCategoriesAlphabetically(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

// Map of category names to Taglines
const CATEGORY_TAGLINES: Record<string, string> = {
  'FROM THE GARDEN': 'Fresh & Crisp Salads',
  'SOUP': 'Warm & Comforting',
  'STARTERS FROM THE SEA': 'Ocean Fresh Bites',
  'STARTERS FROM THE LAND': 'Savoury Meat Treats',
  'STEAMED BAO BUNS': 'Soft & Fluffy Delight',
  'BURGERS & SANDWICHES': 'Hearty & Satisfying',
  'PASTA': 'Italian Classics',
  'MAINS FROM THE LAND': 'Hearty Meat Feasts',
  'MAINS FROM THE SEA': 'Seafood Specialties',
  'GRILLS': 'Smoky & Charred',
  'SIDES': 'Perfect Companions',
  "CHILDREN'S MENU": 'Little Bites for Little Ones',
  'DESSERTS': 'Sweet Endings',
};

// Fallback tagline
const FALLBACK_TAGLINE = 'Delicious Selection';

/**
 * Get the tagline for a category
 * @param categoryName - The name of the category
 * @returns The tagline or fallback if not found
 */
export function getCategoryTagline(categoryName: string): string {
  // Upper case match
  return CATEGORY_TAGLINES[categoryName.toUpperCase()] || FALLBACK_TAGLINE;
}

/**
 * Extract dynamic categories from menu sections
 * @param menuSections - Object with category names as keys and menu items as values
 * @returns Array of Category objects sorted alphabetically
 */
export function extractDynamicCategories(
  menuSections: Record<string, any[]> | undefined
): Category[] {
  if (!menuSections || Object.keys(menuSections).length === 0) {
    console.debug('No menu sections available for category extraction');
    return [];
  }

  // Extract unique category names from menu sections keys
  const categoryNames = Object.keys(menuSections);

  // Map to Category objects with images and taglines
  const categories: Category[] = categoryNames.map((name, index) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    image: getCategoryImage(name),
    tagline: getCategoryTagline(name),
  }));

  // Return categories directly (backend preserves sheet order)
  console.debug('Extracted categories:', categories.map(c => c.name));

  return categories;
}
