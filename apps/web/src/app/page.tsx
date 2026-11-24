import Link from 'next/link';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';

const CATEGORIES = [
  { slug: 'home-living', name: 'Home & living', tagline: 'Make room for better' },
  { slug: 'electronics', name: 'Electronics', tagline: 'For work and play' },
  { slug: 'fashion-accessories', name: 'Fashion & accessories', tagline: 'Made for your everyday' },
  { slug: 'beauty-care', name: 'Beauty & care', tagline: 'A moment for yourself' },
];

const FEATURED_FALLBACK = [
  {
    slug: 'woven-everyday-tote',
    category: 'BAGS & ACCESSORIES',
    name: 'Woven everyday tote',
    price: 1250,
    available: true,
    image: '/images/woven-tote.png',
  },
  {
    slug: 'studio-wireless-headphones',
    category: 'ELECTRONICS',
    name: 'Studio wireless headphones',
    price: 4850,
    available: true,
    image: null,
  },
  {
    slug: 'terracotta-vase',
    category: 'HOME & LIVING',
    name: 'Terracotta vase',
    price: 980,
    available: true,
    image: null,
  },
  {
    slug: 'handloom-cotton-throw',
    category: 'HOME & LIVING',
    name: 'Handloom cotton throw',
    price: 2150,
    available: true,
    image: null,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        {/* Hero */}
        <section className="rounded-[14px] bg-brand-tint overflow-hidden grid grid-cols-1 lg:grid-cols-2 items-center">
          <div className="p-8 lg:p-12 flex flex-col gap-4 items-start">
            <p className="text-[13px] font-semibold tracking-wide text-brand uppercase">
              THOUGHTFULLY CHOSEN. SIMPLY YOURS.
            </p>
            <h1 className="text-[34px] lg:text-[40px] font-bold leading-[1.25] text-ink">
              Good things for
              <br />
              your everyday.
            </h1>
            <p className="text-[16px] leading-[1.45] text-muted max-w-[460px]">
              Discover useful, beautiful essentials for your home, your work and everything in between.
            </p>
            <Link
              href="/shop"
              className="mt-1 inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover transition-colors"
            >
              Explore the collection →
            </Link>
            <p className="text-[13px] text-muted">
              Clear prices. Local delivery. A little less worry.
            </p>
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
          <p>✓ &nbsp;Prices always in ETB</p>
          <p>✓ &nbsp;Delivery fees shown before you pay</p>
          <p>✓ &nbsp;Pay online or on delivery</p>
        </section>

        {/* Category Shortcuts */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${cat.slug}`}
              className="rounded-[14px] border border-border-subtle bg-surface px-6 py-4 flex flex-col gap-3 hover:border-brand/50 transition-colors"
            >
              <span className="text-[16px] font-semibold text-ink">{cat.name} &nbsp;→</span>
              <span className="text-[13px] text-muted">{cat.tagline}</span>
            </Link>
          ))}
        </section>

        {/* Everyday Favorites */}
        <section className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[28px] font-bold text-ink">Everyday favorites</h2>
            <Link
              href="/shop"
              className="inline-flex items-center min-h-[48px] px-5 py-3 rounded-[10px] border border-border-subtle bg-surface text-[15px] font-semibold text-ink hover:bg-canvas transition-colors"
            >
              View all products
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_FALLBACK.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="rounded-[14px] border border-border-subtle bg-surface p-4 flex flex-col gap-2.5 hover:border-brand/50 transition-colors"
              >
                <div className="h-[210px] w-full rounded-[12px] bg-canvas overflow-hidden flex items-center justify-center text-[13px] text-muted">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    product.name
                  )}
                </div>
                <div className="flex items-center justify-between text-muted">
                  <span className="text-[11px] font-medium tracking-wide">{product.category}</span>
                  <span className="text-[20px] leading-none">♡</span>
                </div>
                <p className="text-[16px] font-medium text-ink min-h-[44px]">{product.name}</p>
                <p className="text-[20px] font-semibold text-ink">{formatEtb(product.price)}</p>
                <p className="text-[13px] text-brand">
                  {product.available ? 'Available · Ready to ship' : 'Out of stock'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
