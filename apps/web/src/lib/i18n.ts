'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'am';

const DICTIONARY = {
  en: {
    searchPlaceholder: 'Search products, brands and more',
    signIn: 'Sign in',
    signOut: 'Sign out',
    staffWorkspace: 'Staff workspace',
    cart: 'Cart',
    allCategories: 'All categories',
    homeLiving: 'Home & living',
    electronics: 'Electronics',
    fashion: 'Fashion',
    beauty: 'Beauty',
    newArrivals: 'New arrivals',
    offers: 'Offers',
    heroEyebrow: 'THOUGHTFULLY CHOSEN. SIMPLY YOURS.',
    heroTitleLine1: 'Good things for',
    heroTitleLine2: 'your everyday.',
    heroSubtitle:
      'Discover useful, beautiful essentials for your home, your work and everything in between.',
    exploreCollection: 'Explore the collection →',
    heroFootnote: 'Clear prices. Local delivery. A little less worry.',
    assuranceEtb: '✓  Prices always in ETB',
    assuranceDelivery: '✓  Delivery fees shown before you pay',
    assurancePayment: '✓  Pay online or on delivery',
    everydayFavorites: 'Everyday favorites',
    viewAllProducts: 'View all products',
    availableReady: 'Available · Ready to ship',
    outOfStock: 'Out of stock',
    shopHeading: 'Find your everyday favorites',
    filters: 'Filters',
    category: 'Category',
    allProducts: 'All products',
    priceRange: 'Price range (ETB)',
    availability: 'Availability',
    inStockOnly: 'In stock only',
    clearFilters: 'Clear all filters',
    addToCart: 'Add to cart',
    adding: 'Adding...',
    quantity: 'Quantity',
    description: 'Description',
    specifications: 'Specifications',
    deliveryInfo: 'Delivery information',
    // Staff sidebar
    workspace: 'WORKSPACE',
    navOverview: 'Overview',
    navProducts: 'Products',
    navInventory: 'Inventory',
    navOrders: 'Orders',
    navDeliveries: 'Deliveries',
    navCustomers: 'Customers',
    navReports: 'Reports',
    navEmployees: 'Employees',
    navRoles: 'Roles & permissions',
    navDeliveryZones: 'Delivery zones',
    navSettings: 'Settings',
    navAuditLog: 'Audit log',
    helpSupport: 'Help & support',
  },
  am: {
    searchPlaceholder: 'ምርቶችን፣ ብራንዶችን እና ሌሎችን ይፈልጉ',
    signIn: 'ግባ',
    signOut: 'ውጣ',
    staffWorkspace: 'የሰራተኞች ዳሽቦርድ',
    cart: 'ቅርጫት',
    allCategories: 'ሁሉም ምድቦች',
    homeLiving: 'ቤት እና ኑሮ',
    electronics: 'ኤሌክትሮኒክስ',
    fashion: 'ፋሽን',
    beauty: 'ውበት',
    newArrivals: 'አዳዲስ ምርቶች',
    offers: 'ቅናሾች',
    heroEyebrow: 'በጥንቃቄ የተመረጡ። ለእርስዎ የቀረቡ።',
    heroTitleLine1: 'ለዕለት ተዕለት ኑሮዎ',
    heroTitleLine2: 'ምርጥ ምርጫዎች።',
    heroSubtitle: 'ለቤትዎ፣ ለስራዎ እና ለዕለት ተዕለት ህይወትዎ ጠቃሚና ውብ ምርቶችን ያግኙ።',
    exploreCollection: 'ምርቶችን ይመልከቱ →',
    heroFootnote: 'ግልጽ ዋጋዎች። ፈጣን አቅርቦት። ያለ ስጋት ግብይት።',
    assuranceEtb: '✓  ዋጋዎች ሁልጊዜ በብር (ETB)',
    assuranceDelivery: '✓  የማድረሻ ክፍያ ከመክፈልዎ በፊት ይታያል',
    assurancePayment: '✓  በኦንላይን ወይም ሲደርስ ይክፈሉ',
    everydayFavorites: 'የዕለት ተዕለት ተወዳጆች',
    viewAllProducts: 'ሁሉንም ምርቶች ይመልከቱ',
    availableReady: 'ይገኛል · ለመላክ ዝግጁ',
    outOfStock: 'አልቋል',
    shopHeading: 'የዕለት ተዕለት ተወዳጆችዎን ያግኙ',
    filters: 'ማጣሪያዎች',
    category: 'ምድብ',
    allProducts: 'ሁሉም ምርቶች',
    priceRange: 'የዋጋ ክልል (ETB)',
    availability: 'መገኘት',
    inStockOnly: 'በመጋዘን ያሉ ብቻ',
    clearFilters: 'ማጣሪያዎችን አጽዳ',
    addToCart: 'ወደ ቅርጫት ጨምር',
    adding: 'በመጨመር ላይ...',
    quantity: 'ብዛት',
    description: 'መግለጫ',
    specifications: 'ዝርዝር መረጃ',
    deliveryInfo: 'የማድረስ መረጃ',
    // Staff sidebar
    workspace: 'የስራ ቦታ',
    navOverview: 'አጠቃላይ እይታ',
    navProducts: 'ምርቶች',
    navInventory: 'መጋዘን እና ክምችት',
    navOrders: 'ትዕዛዞች',
    navDeliveries: 'ማድረሻዎች',
    navCustomers: 'ደንበኞች',
    navReports: 'ሪፖርቶች',
    navEmployees: 'ሰራተኞች',
    navRoles: 'ሚናዎች እና ፈቃዶች',
    navDeliveryZones: 'የማድረሻ ዞኖች',
    navSettings: 'ቅንብሮች',
    navAuditLog: 'የኦዲት መዝገብ',
    helpSupport: 'እገዛ እና ድጋፍ',
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY.en;

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'meskot-locale-storage' },
  ),
);

export function useTranslations() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const dict = DICTIONARY[locale];

  return {
    locale,
    setLocale,
    t: (key: TranslationKey) => dict[key],
    pickLocalized: (en: string, am?: string | null) =>
      locale === 'am' && am && am.trim().length > 0 ? am : en,
  };
}
