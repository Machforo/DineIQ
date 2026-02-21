import { Category, MenuItem } from './data';

// Map of category names to local representative images
const CATEGORY_IMAGES: Record<string, string> = {
  'FROM THE GARDEN': '/menu-images/from-the-garden/Summer-Salad.jpeg',
  'SOUP': '/menu-images/soup/Bone-Broth-&-Mushroom-Soup.jpeg',
  'STARTERS FROM THE SEA': '/menu-images/starters-from-the-sea/Torched-Salmon.jpeg',
  'STARTERS FROM THE LAND': '/menu-images/starters-from-the-land/Dry-Rub-Chicken-Wings.jpeg',
  'STEAMED BAO BUNS': '/menu-images/steamed-bao-buns/Paneer-Bao.jpeg',
  'BURGERS & SANDWICHES': '/menu-images/burgers-and-sandwiches/Giant-Burger.jpeg',
  'PASTA': '/menu-images/pasta/Spaghetti-Carbonara.jpeg',
  'MAINS FROM THE LAND': '/menu-images/mains-from-the-land/Ash-Roasted-Chicken-Espetada.jpeg',
  'MAINS FROM THE SEA': '/menu-images/mains-from-the-sea/Catch-of-the-Day.jpeg',
  'GRILLS': '/menu-images/grills/TOMAHAWK-STEAK.jpeg',
  'SIDES': '/menu-images/sides/Garlic,-Paprika,-Cumin-&-Coriander-Fries.jpeg',
  "CHILDREN'S MENU": '/menu-images/childrens-menu/BREADED-CHICKEN-BREAST.jpeg',
  'DESSERTS': '/menu-images/desserts/Basque-Cheesecake.jpeg',
  "CHEF SPECIAL": '/menu-images/recommendations/chef-special.jpeg',
  'BESTSELLER': '/menu-images/recommendations/bestseller.jpeg',
};

// Comprehensive map of specific menu items to local images
const ITEM_IMAGES: Record<string, string> = {
  // FROM THE GARDEN
  'AGED STEAK & BRIE': '/menu-images/from-the-garden/Aged-Steak-&-Brie-Salad.jpeg',
  'BURRATA SALAD': '/menu-images/from-the-garden/Burrata-Salad.jpeg',
  'CALIFORNIA SALAD BOWL': '/menu-images/from-the-garden/California-Salad-Bowl.jpeg',
  'CHICKEN CAESAR': '/menu-images/from-the-garden/Chicken-Caesar.jpeg',
  'HARVEST SALAD': '/menu-images/from-the-garden/Harvest-Salad.jpeg',
  'SEARED TUNA SALAD': '/menu-images/from-the-garden/Seared-Tuna-Salad.jpeg',
  'SUMMER SALAD': '/menu-images/from-the-garden/Summer-Salad.jpeg',

  // SOUP
  'BONE BROTH & MUSHROOM SOUP': '/menu-images/soup/Bone-Broth-&-Mushroom-Soup.jpeg',
  'GREEN SOUP': '/menu-images/soup/Green-Soup.jpeg',
  'MULLIGATAWNY SOUP': '/menu-images/soup/Mulligatawny-Soup.jpeg',
  'TUSCAN WHITE BEAN': '/menu-images/soup/Tuscan-White-Bean.jpeg',

  // STARTERS FROM THE SEA
  'FISH CEVICHE SALAD': '/menu-images/starters-from-the-sea/Fish-Ceviche-Salad.jpeg',
  'GINGER & SESAME SALMON': '/menu-images/starters-from-the-sea/Ginger-&-Sesame-Salmon.jpeg',
  'TORCHED SALMON': '/menu-images/starters-from-the-sea/Torched-Salmon.jpeg',

  // STARTERS FROM THE LAND
  'CRISPY FRIED CAULIFLOWER': '/menu-images/starters-from-the-land/Crispy-Fried-Cauliflower.jpeg',
  'DRY-RUB CHICKEN WINGS': '/menu-images/starters-from-the-land/Dry-Rub-Chicken-Wings.jpeg',
  'MUSHROOM CEVICHE': '/menu-images/starters-from-the-land/Mushroom-Ceviche.jpeg',
  'SPINACH & MUSHROOM WRAP': '/menu-images/starters-from-the-land/Spinach-&-Mushroom-Wrap.jpeg',

  // STEAMED BAO BUNS
  'PANEER BAO': '/menu-images/steamed-bao-buns/Paneer-Bao.jpeg',
  'PRESSED PORK BELLY': '/menu-images/steamed-bao-buns/Pressed-Pork-Belly.jpeg',
  'SLOW-COOKED BEEF BRISKET': '/menu-images/steamed-bao-buns/Slow-Cooked-Beef-Brisket.jpeg',

  // BURGERS & SANDWICHES
  'CHICKEN & GOAT CHEESE QUESADILLA': '/menu-images/burgers-and-sandwiches/Chicken-&-Goat-Cheese-Quesadilla.jpeg',
  'CHICKEN KEBAB SANDWICH': '/menu-images/burgers-and-sandwiches/Chicken-Kebab-Sandwich.jpeg',
  'CUBANO SANDWICH': '/menu-images/burgers-and-sandwiches/Cubano-Sandwich.jpeg',
  'GIANT BURGER': '/menu-images/burgers-and-sandwiches/Giant-Burger.jpeg',
  'GRILLED TOFU & VEGGIE SANDWICH': '/menu-images/burgers-and-sandwiches/Grilled-Tofu-&-Veggie-Sandwich.jpeg',
  'HARVEST BRISKET BURGER': '/menu-images/burgers-and-sandwiches/Harvest-Brisket-Burger.jpeg',
  'HARVEST CLUB SANDWICH': '/menu-images/burgers-and-sandwiches/Harvest-Club-Sandwich.jpeg',
  'KOREAN FRIED MUSHROOM TACOS': '/menu-images/burgers-and-sandwiches/Korean-Fried-Mushroom-Tacos.jpeg',
  'PICANHA STEAK SANDWICH': '/menu-images/burgers-and-sandwiches/Picanha-Steak-Sandwich.jpeg',
  'PROSCIUTTO OPEN SANDWICH': '/menu-images/burgers-and-sandwiches/Prosciutto-Open-Sandwich.jpeg',
  'PULLED PORK & CARAMELIZED ONION': '/menu-images/burgers-and-sandwiches/Pulled-Pork-&-Caramelized-Onion.jpeg',

  // PASTA
  'BACON RIGATONI': '/menu-images/pasta/Bacon-Rigatoni.jpeg',
  'BEEF CARBONARA': '/menu-images/pasta/Beef-Carbonara.jpeg',
  'BUTTERNUT & SAGE RAVIOLI': '/menu-images/pasta/Butternut-&-Sage-Ravioli.jpeg',
  'SPAGHETTI CARBONARA': '/menu-images/pasta/Spaghetti-Carbonara.jpeg',
  'TRADIZIONALE': '/menu-images/pasta/Tradizionale.jpeg',

  // MAINS FROM THE LAND
  'ASH-ROASTED CHICKEN ESPETADA': '/menu-images/mains-from-the-land/Ash-Roasted-Chicken-Espetada.jpeg',
  'CHIMICHURRI CHARRED CAULIFLOWER STEAK': '/menu-images/mains-from-the-land/Chimichurri-Charred-Cauliflower-Steak.jpeg',
  'GLAZED LAMB STEAKS': '/menu-images/mains-from-the-land/Glazed-Lamb-Steaks.jpeg',
  'HERB CRUSTED LAMB SHANK': '/menu-images/mains-from-the-land/Herb-Crusted-Lamb-Shank.jpeg',
  'OSTRICH WELLINGTON': '/menu-images/mains-from-the-land/Ostrich-Wellington.jpeg',
  'PERSIAN LAMB KEBAB': '/menu-images/mains-from-the-land/Persian-Lamb-Kebab.jpeg',
  'ROASTED PORK BELLY': '/menu-images/mains-from-the-land/Roasted-Pork-Belly.jpeg',
  'SMOKED BEEF BRISKET': '/menu-images/mains-from-the-land/Smoked-Beef-Brisket.jpeg',
  'VEGETABLE KEBAB': '/menu-images/mains-from-the-land/Vegetable-Kebab.jpeg',
  'WHOLE ROAST BABY CHICKEN': '/menu-images/mains-from-the-land/Whole-Roast-Baby-Chicken.jpeg',
  'ZUCCHINI INVOLTINI': '/menu-images/mains-from-the-land/Zucchini-Involtini.jpeg',

  // MAINS FROM THE SEA
  'CATCH OF THE DAY': '/menu-images/mains-from-the-sea/Catch-of-the-Day.jpeg',
  'FISH + CHIPS': '/menu-images/mains-from-the-sea/Fish-+-Chips.jpeg',
  'FRITTO MISTO': '/menu-images/mains-from-the-sea/Fritto-Misto.jpeg',
  'OLIVE OIL ROASTED SALMON': '/menu-images/mains-from-the-sea/Olive-Oil-Roasted-Salmon.jpeg',

  // GRILLS
  'DRY AGED PORK CHOPS': '/menu-images/grills/DRY-AGED-PORK-CHOPS.jpeg',
  'FARMER MAX\' CHICKEN': '/menu-images/grills/Farmer-Max\'-Chicken.jpeg',
  'GRILLED JUMBO PRAWNS': '/menu-images/grills/GRILLED-JUMBO-PRAWNS.jpeg',
  'GRILLED RIB RACK': '/menu-images/grills/GRILLED-RIB-RACK.jpeg',
  'MEAT LOVERS PLATTER': '/menu-images/grills/MEAT-LOVERS-PLATTER.jpeg',
  'MIXED SEAFOOD PLATTER': '/menu-images/grills/MIXED-SEAFOOD-PLATTER.jpeg',
  // Note: NEW YORK STEAK has 2 variants — handled by nameEncounterCounter in getMenuItemImage
  'RIBEYE': '/menu-images/grills/RIBEYE.jpeg',
  'SURF & TURF': '/menu-images/grills/SURF-&-TURF.jpeg',
  'T-BONE STEAK': '/menu-images/grills/T-BONE-STEAK.jpeg',
  'TOMAHAWK STEAK': '/menu-images/grills/TOMAHAWK-STEAK.jpeg',

  // SIDES
  'GARLIC, PAPRIKA, CUMIN & CORIANDER FRIES': '/menu-images/sides/Garlic,-Paprika,-Cumin-&-Coriander-Fries.jpeg',
  'OREGANO, ROSEMARY, GARLIC, CHEESE & ONION FRIES': '/menu-images/sides/Oregano,-Rosemary,-Garlic,-Cheese-&-Onion-Fries.jpeg',
  'SPICY DEHYDRATED PICKLED FRIES': '/menu-images/sides/Spicy-Dehydrated-Pickled-Fries.jpeg',

  // CHILDREN'S MENU
  'BREADED CHICKEN BREAST': '/menu-images/childrens-menu/BREADED-CHICKEN-BREAST.jpeg',
  'GRILLED FISH FILLET': '/menu-images/childrens-menu/GRILLED-FISH-FILLET.jpeg',
  'PAN FRIED BEEF PATTY': '/menu-images/childrens-menu/PAN-FRIED-BEEF-PATTY.jpeg',
  'POTATO GNOCCHI': '/menu-images/childrens-menu/POTATO-GNOCCHI.jpeg',
  'STIR FRIED NOODLES': '/menu-images/childrens-menu/STIR-FRIED-NOODLES.jpeg',
  'VANILLA ICE CREAM': '/menu-images/childrens-menu/VANILLA-ICE-CREAM.jpeg',

  // DESSERTS
  'BASQUE CHEESECAKE': '/menu-images/desserts/Basque-Cheesecake.jpeg',
  'CHOCOLATE OVERLOAD': '/menu-images/desserts/Chocolate-Overload.jpeg',
  'CYCLIC CHURROS': '/menu-images/desserts/Cyclic-Churros.jpeg',
  'FRESH FRUIT SALAD': '/menu-images/desserts/Fresh-Fruit-Salad.jpeg',
  'ICE CREAM OF THE DAY': '/menu-images/desserts/Ice-Cream-of-the-Day.jpeg',
  'LAVENDER PARFAIT': '/menu-images/desserts/Lavender-Parfait.jpeg',
  'SORBET OF THE DAY': '/menu-images/desserts/Sorbet-of-the-Day.jpeg',
  'VANILLA MILLEFEUILLE': '/menu-images/desserts/Vanilla-Millefeuille.jpeg',
};

// Two variants for 'New York Steak' — alternated per render cycle
const NEW_YORK_STEAK_IMAGES = [
  '/menu-images/grills/NEW-YORK-STEAK-1.jpeg',
  '/menu-images/grills/NEW-YORK-STEAK-2.jpeg',
];

// Tracks how many times a specific item name has been resolved this session
const nameEncounterCounter = new Map<string, number>();

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop';

/**
 * Get the image URL for a category
 */
export function getCategoryImage(categoryName: string): string {
  const normalized = categoryName.trim().toUpperCase();

  // Robust matching for keywords
  if (normalized.includes('GARDEN') || normalized.includes('SALAD')) return CATEGORY_IMAGES['FROM THE GARDEN'];
  if (normalized.includes('SOUP')) return CATEGORY_IMAGES['SOUP'];
  if (normalized.includes('BAO')) return CATEGORY_IMAGES['STEAMED BAO BUNS'];
  if (normalized.includes('BURGER') || normalized.includes('SANDWICH')) return CATEGORY_IMAGES['BURGERS & SANDWICHES'];
  if (normalized.includes('PASTA')) return CATEGORY_IMAGES['PASTA'];
  if (normalized.includes('GRILL')) return CATEGORY_IMAGES['GRILLS'];
  if (normalized.includes('SIDE')) return CATEGORY_IMAGES['SIDES'];
  if (normalized.includes('DESSERT')) return CATEGORY_IMAGES['DESSERTS'];
  if (normalized.includes('CHILD') || normalized.includes('KID')) return CATEGORY_IMAGES["CHILDREN'S MENU"];
  if (normalized.includes('BESTSELLER')) return CATEGORY_IMAGES['BESTSELLER'];
  if (normalized.includes('CHEF') || normalized.includes('SPECIAL') || normalized.includes('RECOMMENDATION')) return CATEGORY_IMAGES['CHEF SPECIAL'];

  // Handle Land/Sea starters vs mains
  if (normalized.includes('LAND')) {
    if (normalized.includes('START') || normalized.includes('APPETIZER') || !normalized.includes('MAIN')) return CATEGORY_IMAGES['STARTERS FROM THE LAND'];
    return CATEGORY_IMAGES['MAINS FROM THE LAND'];
  }
  if (normalized.includes('SEA')) {
    if (normalized.includes('START') || normalized.includes('APPETIZER') || !normalized.includes('MAIN')) return CATEGORY_IMAGES['STARTERS FROM THE SEA'];
    return CATEGORY_IMAGES['MAINS FROM THE SEA'];
  }

  return CATEGORY_IMAGES[normalized] || CATEGORY_IMAGES[categoryName] || FALLBACK_IMAGE;
}

/**
 * Get the image URL for a specific menu item
 */
export function getMenuItemImage(item: any): string {
  const name = String(item.Item_Name || item.name || '').toUpperCase().trim();
  const category = String(item.Item_Category || item.category || '').toUpperCase().trim();

  // Special case: 'New York Steak' — alternate between two images
  if (name.includes('NEW YORK STEAK')) {
    const count = nameEncounterCounter.get('NEW YORK STEAK') || 0;
    nameEncounterCounter.set('NEW YORK STEAK', count + 1);
    return NEW_YORK_STEAK_IMAGES[count % NEW_YORK_STEAK_IMAGES.length];
  }

  // 1. Direct item match from local library
  for (const [key, path] of Object.entries(ITEM_IMAGES)) {
    if (name.includes(key)) return path;
  }

  // 2. Fallback to Image_URL from backend if available and not a placeholder
  const backendImage = item.Image_URL || item.image;
  if (backendImage && !backendImage.includes('unsplash.com') && !backendImage.includes('placeholder')) {
    return backendImage;
  }

  // 3. Fallback to category image
  return getCategoryImage(category);
}

/**
 * Sort categories alphabetically
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

const FALLBACK_TAGLINE = 'Delicious Selection';

/**
 * Get the tagline for a category
 */
export function getCategoryTagline(categoryName: string): string {
  const normalized = categoryName.toUpperCase().trim();

  if (normalized.includes('GARDEN') || normalized.includes('SALAD')) return CATEGORY_TAGLINES['FROM THE GARDEN'];
  if (normalized.includes('CHILD') || normalized.includes('KID')) return CATEGORY_TAGLINES["CHILDREN'S MENU"];

  return CATEGORY_TAGLINES[normalized] || CATEGORY_TAGLINES[categoryName] || FALLBACK_TAGLINE;
}

/**
 * Extract dynamic categories
 */
export function extractDynamicCategories(
  menuSections: Record<string, any[]> | undefined
): Category[] {
  if (!menuSections || Object.keys(menuSections).length === 0) return [];

  const categoryNames = Object.keys(menuSections);

  return categoryNames.map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    name,
    image: getCategoryImage(name),
    tagline: getCategoryTagline(name),
  }));
}
