import { Category, MenuItem } from './data';

const MENU_IMAGE_BASE = '/src/assets/menu-images';

// Map of category names to local representative images
const CATEGORY_IMAGES: Record<string, string> = {
  'FROM THE GARDEN': `${MENU_IMAGE_BASE}/from-the-garden/Summer-Salad.jpeg`,
  'SOUP': `${MENU_IMAGE_BASE}/soup/Bone-Broth-&-Mushroom-Soup.jpeg`,
  'STARTERS FROM THE SEA': `${MENU_IMAGE_BASE}/starters-from-the-sea/Torched-Salmon.jpeg`,
  'STARTERS FROM THE LAND': `${MENU_IMAGE_BASE}/starters-from-the-land/Dry-Rub-Chicken-Wings.jpeg`,
  'STEAMED BAO BUNS': `${MENU_IMAGE_BASE}/steamed-bao-buns/Paneer-Bao.jpeg`,
  'BURGERS & SANDWICHES': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Giant-Burger.jpeg`,
  'PASTA': `${MENU_IMAGE_BASE}/pasta/Spaghetti-Carbonara.jpeg`,
  'MAINS FROM THE LAND': `${MENU_IMAGE_BASE}/mains-from-the-land/Ash-Roasted-Chicken-Espetada.jpeg`,
  'MAINS FROM THE SEA': `${MENU_IMAGE_BASE}/mains-from-the-sea/Catch-of-the-Day.jpeg`,
  'GRILLS': `${MENU_IMAGE_BASE}/grills/TOMAHAWK-STEAK.jpeg`,
  'SIDES': `${MENU_IMAGE_BASE}/sides/Garlic,-Paprika,-Cumin-&-Coriander-Fries.jpeg`,
  "CHILDREN'S MENU": `${MENU_IMAGE_BASE}/childrens-menu/BREADED-CHICKEN-BREAST.jpeg`,
  'DESSERTS': `${MENU_IMAGE_BASE}/desserts/Basque-Cheesecake.jpeg`,
  "CHEF SPECIAL": `${MENU_IMAGE_BASE}/recommendations/chef-special.jpeg`,
  'BESTSELLER': `${MENU_IMAGE_BASE}/recommendations/bestseller.jpeg`,
};

// Comprehensive map of specific menu items to local images
const ITEM_IMAGES: Record<string, string> = {
  // FROM THE GARDEN
  'AGED STEAK & BRIE': `${MENU_IMAGE_BASE}/from-the-garden/Aged-Steak-&-Brie-Salad.jpeg`,
  'BURRATA SALAD': `${MENU_IMAGE_BASE}/from-the-garden/Burrata-Salad.jpeg`,
  'CALIFORNIA SALAD BOWL': `${MENU_IMAGE_BASE}/from-the-garden/California-Salad-Bowl.jpeg`,
  'CHICKEN CAESAR': `${MENU_IMAGE_BASE}/from-the-garden/Chicken-Caesar.jpeg`,
  'HARVEST SALAD': `${MENU_IMAGE_BASE}/from-the-garden/Harvest-Salad.jpeg`,
  'SEARED TUNA SALAD': `${MENU_IMAGE_BASE}/from-the-garden/Seared-Tuna-Salad.jpeg`,
  'SUMMER SALAD': `${MENU_IMAGE_BASE}/from-the-garden/Summer-Salad.jpeg`,

  // SOUP
  'BONE BROTH & MUSHROOM SOUP': `${MENU_IMAGE_BASE}/soup/Bone-Broth-&-Mushroom-Soup.jpeg`,
  'GREEN SOUP': `${MENU_IMAGE_BASE}/soup/Green-Soup.jpeg`,
  'MULLIGATAWNY SOUP': `${MENU_IMAGE_BASE}/soup/Mulligatawny-Soup.jpeg`,
  'TUSCAN WHITE BEAN': `${MENU_IMAGE_BASE}/soup/Tuscan-White-Bean.jpeg`,

  // STARTERS FROM THE SEA
  'FISH CEVICHE SALAD': `${MENU_IMAGE_BASE}/starters-from-the-sea/Fish-Ceviche-Salad.jpeg`,
  'GINGER & SESAME SALMON': `${MENU_IMAGE_BASE}/starters-from-the-sea/Ginger-&-Sesame-Salmon.jpeg`,
  'TORCHED SALMON': `${MENU_IMAGE_BASE}/starters-from-the-sea/Torched-Salmon.jpeg`,

  // STARTERS FROM THE LAND
  'CRISPY FRIED CAULIFLOWER': `${MENU_IMAGE_BASE}/starters-from-the-land/Crispy-Fried-Cauliflower.jpeg`,
  'DRY-RUB CHICKEN WINGS': `${MENU_IMAGE_BASE}/starters-from-the-land/Dry-Rub-Chicken-Wings.jpeg`,
  'MUSHROOM CEVICHE': `${MENU_IMAGE_BASE}/starters-from-the-land/Mushroom-Ceviche.jpeg`,
  'SPINACH & MUSHROOM WRAP': `${MENU_IMAGE_BASE}/starters-from-the-land/Spinach-&-Mushroom-Wrap.jpeg`,

  // STEAMED BAO BUNS
  'PANEER BAO': `${MENU_IMAGE_BASE}/steamed-bao-buns/Paneer-Bao.jpeg`,
  'PRESSED PORK BELLY': `${MENU_IMAGE_BASE}/steamed-bao-buns/Pressed-Pork-Belly.jpeg`,
  'SLOW-COOKED BEEF BRISKET': `${MENU_IMAGE_BASE}/steamed-bao-buns/Slow-Cooked-Beef-Brisket.jpeg`,

  // BURGERS & SANDWICHES
  'CHICKEN & GOAT CHEESE QUESADILLA': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Chicken-&-Goat-Cheese-Quesadilla.jpeg`,
  'CHICKEN KEBAB SANDWICH': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Chicken-Kebab-Sandwich.jpeg`,
  'CUBANO SANDWICH': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Cubano-Sandwich.jpeg`,
  'GIANT BURGER': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Giant-Burger.jpeg`,
  'GRILLED TOFU & VEGGIE SANDWICH': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Grilled-Tofu-&-Veggie-Sandwich.jpeg`,
  'HARVEST BRISKET BURGER': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Harvest-Brisket-Burger.jpeg`,
  'HARVEST CLUB SANDWICH': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Harvest-Club-Sandwich.jpeg`,
  'KOREAN FRIED MUSHROOM TACOS': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Korean-Fried-Mushroom-Tacos.jpeg`,
  'PICANHA STEAK SANDWICH': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Picanha-Steak-Sandwich.jpeg`,
  'PROSCIUTTO OPEN SANDWICH': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Prosciutto-Open-Sandwich.jpeg`,
  'PULLED PORK & CARAMELIZED ONION': `${MENU_IMAGE_BASE}/burgers-and-sandwiches/Pulled-Pork-&-Caramelized-Onion.jpeg`,

  // PASTA
  'BACON RIGATONI': `${MENU_IMAGE_BASE}/pasta/Bacon-Rigatoni.jpeg`,
  'BEEF CARBONARA': `${MENU_IMAGE_BASE}/pasta/Beef-Carbonara.jpeg`,
  'BUTTERNUT & SAGE RAVIOLI': `${MENU_IMAGE_BASE}/pasta/Butternut-&-Sage-Ravioli.jpeg`,
  'SPAGHETTI CARBONARA': `${MENU_IMAGE_BASE}/pasta/Spaghetti-Carbonara.jpeg`,
  'TRADIZIONALE': `${MENU_IMAGE_BASE}/pasta/Tradizionale.jpeg`,

  // MAINS FROM THE LAND
  'ASH-ROASTED CHICKEN ESPETADA': `${MENU_IMAGE_BASE}/mains-from-the-land/Ash-Roasted-Chicken-Espetada.jpeg`,
  'CHIMICHURRI CHARRED CAULIFLOWER STEAK': `${MENU_IMAGE_BASE}/mains-from-the-land/Chimichurri-Charred-Cauliflower-Steak.jpeg`,
  'GLAZED LAMB STEAKS': `${MENU_IMAGE_BASE}/mains-from-the-land/Glazed-Lamb-Steaks.jpeg`,
  'HERB CRUSTED LAMB SHANK': `${MENU_IMAGE_BASE}/mains-from-the-land/Herb-Crusted-Lamb-Shank.jpeg`,
  'OSTRICH WELLINGTON': `${MENU_IMAGE_BASE}/mains-from-the-land/Ostrich-Wellington.jpeg`,
  'PERSIAN LAMB KEBAB': `${MENU_IMAGE_BASE}/mains-from-the-land/Persian-Lamb-Kebab.jpeg`,
  'ROASTED PORK BELLY': `${MENU_IMAGE_BASE}/mains-from-the-land/Roasted-Pork-Belly.jpeg`,
  'SMOKED BEEF BRISKET': `${MENU_IMAGE_BASE}/mains-from-the-land/Smoked-Beef-Brisket.jpeg`,
  'VEGETABLE KEBAB': `${MENU_IMAGE_BASE}/mains-from-the-land/Vegetable-Kebab.jpeg`,
  'WHOLE ROAST BABY CHICKEN': `${MENU_IMAGE_BASE}/mains-from-the-land/Whole-Roast-Baby-Chicken.jpeg`,
  'ZUCCHINI INVOLTINI': `${MENU_IMAGE_BASE}/mains-from-the-land/Zucchini-Involtini.jpeg`,

  // MAINS FROM THE SEA
  'CATCH OF THE DAY': `${MENU_IMAGE_BASE}/mains-from-the-sea/Catch-of-the-Day.jpeg`,
  'FISH + CHIPS': `${MENU_IMAGE_BASE}/mains-from-the-sea/Fish-+-Chips.jpeg`,
  'FRITTO MISTO': `${MENU_IMAGE_BASE}/mains-from-the-sea/Fritto-Misto.jpeg`,
  'OLIVE OIL ROASTED SALMON': `${MENU_IMAGE_BASE}/mains-from-the-sea/Olive-Oil-Roasted-Salmon.jpeg`,

  // GRILLS
  'DRY AGED PORK CHOPS': `${MENU_IMAGE_BASE}/grills/DRY-AGED-PORK-CHOPS.jpeg`,
  'FARMER MAX\' CHICKEN': `${MENU_IMAGE_BASE}/grills/Farmer-Max\'-Chicken.jpeg`,
  'GRILLED JUMBO PRAWNS': `${MENU_IMAGE_BASE}/grills/GRILLED-JUMBO-PRAWNS.jpeg`,
  'GRILLED RIB RACK': `${MENU_IMAGE_BASE}/grills/GRILLED-RIB-RACK.jpeg`,
  'MEAT LOVERS PLATTER': `${MENU_IMAGE_BASE}/grills/MEAT-LOVERS-PLATTER.jpeg`,
  'MIXED SEAFOOD PLATTER': `${MENU_IMAGE_BASE}/grills/MIXED-SEAFOOD-PLATTER.jpeg`,
  // Note: NEW YORK STEAK has 2 variants — handled by nameEncounterCounter in getMenuItemImage
  'RIBEYE': `${MENU_IMAGE_BASE}/grills/RIBEYE.jpeg`,
  'SURF & TURF': `${MENU_IMAGE_BASE}/grills/SURF-&-TURF.jpeg`,
  'T-BONE STEAK': `${MENU_IMAGE_BASE}/grills/T-BONE-STEAK.jpeg`,
  'TOMAHAWK STEAK': `${MENU_IMAGE_BASE}/grills/TOMAHAWK-STEAK.jpeg`,

  // SIDES
  'GARLIC, PAPRIKA, CUMIN & CORIANDER FRIES': `${MENU_IMAGE_BASE}/sides/Garlic,-Paprika,-Cumin-&-Coriander-Fries.jpeg`,
  'OREGANO, ROSEMARY, GARLIC, CHEESE & ONION FRIES': `${MENU_IMAGE_BASE}/sides/Oregano,-Rosemary,-Garlic,-Cheese-&-Onion-Fries.jpeg`,
  'SPICY DEHYDRATED PICKLED FRIES': `${MENU_IMAGE_BASE}/sides/Spicy-Dehydrated-Pickled-Fries.jpeg`,

  // CHILDREN'S MENU
  'BREADED CHICKEN BREAST': `${MENU_IMAGE_BASE}/childrens-menu/BREADED-CHICKEN-BREAST.jpeg`,
  'GRILLED FISH FILLET': `${MENU_IMAGE_BASE}/childrens-menu/GRILLED-FISH-FILLET.jpeg`,
  'PAN FRIED BEEF PATTY': `${MENU_IMAGE_BASE}/childrens-menu/PAN-FRIED-BEEF-PATTY.jpeg`,
  'POTATO GNOCCHI': `${MENU_IMAGE_BASE}/childrens-menu/POTATO-GNOCCHI.jpeg`,
  'STIR FRIED NOODLES': `${MENU_IMAGE_BASE}/childrens-menu/STIR-FRIED-NOODLES.jpeg`,
  'VANILLA ICE CREAM': `${MENU_IMAGE_BASE}/childrens-menu/VANILLA-ICE-CREAM.jpeg`,

  // DESSERTS
  'BASQUE CHEESECAKE': `${MENU_IMAGE_BASE}/desserts/Basque-Cheesecake.jpeg`,
  'CHOCOLATE OVERLOAD': `${MENU_IMAGE_BASE}/desserts/Chocolate-Overload.jpeg`,
  'CYCLIC CHURROS': `${MENU_IMAGE_BASE}/desserts/Cyclic-Churros.jpeg`,
  'FRESH FRUIT SALAD': `${MENU_IMAGE_BASE}/desserts/Fresh-Fruit-Salad.jpeg`,
  'ICE CREAM OF THE DAY': `${MENU_IMAGE_BASE}/desserts/Ice-Cream-of-the-Day.jpeg`,
  'LAVENDER PARFAIT': `${MENU_IMAGE_BASE}/desserts/Lavender-Parfait.jpeg`,
  'SORBET OF THE DAY': `${MENU_IMAGE_BASE}/desserts/Sorbet-of-the-Day.jpeg`,
  'VANILLA MILLEFEUILLE': `${MENU_IMAGE_BASE}/desserts/Vanilla-Millefeuille.jpeg`,
};

// Two variants for 'New York Steak' — alternated per render cycle
const NEW_YORK_STEAK_IMAGES = [
  `${MENU_IMAGE_BASE}/grills/NEW-YORK-STEAK-1.jpeg`,
  `${MENU_IMAGE_BASE}/grills/NEW-YORK-STEAK-2.jpeg`,
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
