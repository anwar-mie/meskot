'use client';

import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { useTranslations } from '@/lib/i18n';

const CATEGORIES = [
  {
    slug: 'home-living',
    nameEn: 'Home & living',
    nameAm: 'ቤት እና ኑሮ',
    taglineEn: 'Make room for better',
    taglineAm: 'ለቤትዎ ውበት እና ምቾት',
  },
  {
    slug: 'electronics',
    nameEn: 'Electronics',
    nameAm: 'ኤሌክትሮኒክስ',
    taglineEn: 'For work and play',
    taglineAm: 'ለስራ እና ለመዝናኛ',
  },
  {
    slug: 'fashion-accessories',
    nameEn: 'Fashion & accessories',
    nameAm: 'ፋሽን እና መለዋወጫዎች',
    taglineEn: 'Made for your everyday',
    taglineAm: 'ለዕለት ተዕለት ዘይቤዎ',
  },
  {
    slug: 'beauty-care',
    nameEn: 'Beauty & care',
    nameAm: 'ውበት እና እንክብካቤ',
    taglineEn: 'A moment for yourself',
    taglineAm: 'ለራስዎ የሚሰጡት ጊዜ',
  },
];

const FEATURED_FALLBACK = [
  {
    slug: 'woven-everyday-tote',
    categoryEn: 'BAGS & ACCESSORIES',
    categoryAm: 'ቦርሳዎች እና መለዋወጫዎች',
    nameEn: 'Woven everyday tote',
    nameAm: 'የዕለት ተዕለት የተሸመነ ቦርሳ',
    price: 1250,
    available: true,
    image: '/images/woven-tote.png',
  },
  {
    slug: 'studio-wireless-headphones',
    categoryEn: 'ELECTRONICS',
    categoryAm: 'ኤሌክትሮኒክስ',
    nameEn: 'Studio wireless headphones',
    nameAm: 'ስቱዲዮ ገመድ አልባ የጆሮ ማዳመጫ',
    price: 4850,
    available: true,
    image: '/images/wireless-headphones.png',
  },
  {
    slug: 'terracotta-vase',
    categoryEn: 'HOME & LIVING',
    categoryAm: 'ቤት እና ኑሮ',
    nameEn: 'Terracotta vase',
    nameAm: 'የሸክላ አበባ ማስቀመጫ',
    price: 980,
    available: true,
    image: '/images/terracotta-vase.png',
  },
  {
    slug: 'handloom-cotton-throw',
    categoryEn: 'HOME & LIVING',
    categoryAm: 'ቤት እና ኑሮ',
    nameEn: 'Handloom cotton throw',
    nameAm: 'በእጅ የተሸመነ የጥጥ ብርድ ልብስ',
    price: 2150,
    available: true,
    image: '/images/cotton-throw.png',
  },
];

export default function HomePage() {
  const { t, pickLocalized } = useTranslations();

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        {/* Hero */}
        <section className="rounded-[14px] bg-brand-tint overflow-hidden grid grid-cols-1 lg:grid-cols-2 items-center">
          <div className="p-8 lg:p-12 flex flex-col gap-4 items-start">
            <p className="text-[13px] font-semibold tracking-wide text-brand uppercase">
              {t('heroEyebrow')}
            </p>
            <h1 className="text-[34px] lg:text-[40px] font-bold leading-[1.25] text-ink">
              {t('heroTitleLine1')}
              <br />
              {t('heroTitleLine2')}
            </h1>
            <p className="text-[16px] leading-[1.45] text-muted max-w-[460px]">
              {t('heroSubtitle')}
            </p>
            <Link
              href="/shop"
              className="mt-1 inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover transition-colors"
            >
              {t('exploreCollection')}
            </Link>
            <p className="text-[13px] text-muted">{t('heroFootnote')}</p>
          </div>
          <div className="h-[280px] lg:h-[411px] w-full">
            <img
              src="/images/woven-tote.png"
              alt="Woven everyday tote"
              className="w-full h-full object-cover"
            />
          </div>
        </section>

        {/* Shopping Assurances */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px] font-medium text-muted py-1">
          <p>{t('assuranceEtb')}</p>
          <p>{t('assuranceDelivery')}</p>
          <p>{t('assurancePayment')}</p>
        </section>

        {/* Category Shortcuts */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${cat.slug}`}
              className="rounded-[14px] border border-border-subtle bg-surface px-6 py-4 flex flex-col gap-3 hover:border-brand/50 transition-colors"
            >
              <span className="text-[16px] font-semibold text-ink">
                {pickLocalized(cat.nameEn, cat.nameAm)} &nbsp;→
              </span>
              <span className="text-[13px] text-muted">
                {pickLocalized(cat.taglineEn, cat.taglineAm)}
              </span>
            </Link>
          ))}
        </section>

        {/* Everyday Favorites */}
        <section className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[28px] font-bold text-ink">{t('everydayFavorites')}</h2>
            <Link
              href="/shop"
              className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[15px] font-semibold text-ink hover:bg-canvas transition-colors"
            >
              {t('viewAllProducts')}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_FALLBACK.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="rounded-[14px] border border-border-subtle bg-surface p-4 flex flex-col gap-2.5 hover:border-brand/50 transition-colors"
              >
                <div className="h-[210px] w-full rounded-[12px] bg-canvas overflow-hidden">
                  <img
                    src={product.image}
                    alt={pickLocalized(product.nameEn, product.nameAm)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between text-muted">
                  <span className="text-[11px] font-medium tracking-wide">
                    {pickLocalized(product.categoryEn, product.categoryAm)}
                  </span>
                  <span className="text-[20px] leading-none">♡</span>
                </div>
                <p className="text-[16px] font-medium text-ink min-h-[44px]">
                  {pickLocalized(product.nameEn, product.nameAm)}
                </p>
                <p className="text-[20px] font-semibold text-ink">{formatEtb(product.price)}</p>
                <p className="text-[13px] text-brand">
                  {product.available ? t('availableReady') : t('outOfStock')}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
