'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch } from '@/lib/api';
import { resolveProductImage } from '@/lib/product-images';

interface Category {
  id: string;
  slug: string;
  nameEn: string;
}

interface ProductSummary {
  id: string;
  slug: string;
  nameEn: string;
  minPrice: number;
  totalAvailable: number;
  category: Category;
  images: Array<{ url: string }>;
}

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? '';
  const initialSearch = searchParams.get('search') ?? '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('relevance');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedCategory(searchParams.get('category') ?? '');
  }, [searchParams]);

  useEffect(() => {
    apiFetch<Category[]>('/categories')
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (selectedCategory) qs.set('category', selectedCategory);
    if (search.trim()) qs.set('search', search.trim());
    if (inStockOnly) qs.set('inStock', 'true');
    if (minPrice) qs.set('minPrice', minPrice);
    if (maxPrice) qs.set('maxPrice', maxPrice);
    if (sort !== 'relevance') qs.set('sort', sort);

    setLoading(true);
    apiFetch<ProductSummary[]>(`/products?${qs.toString()}`)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [selectedCategory, search, inStockOnly, minPrice, maxPrice, sort]);

  function clearFilters() {
    setSelectedCategory('');
    setSearch('');
    setInStockOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSort('relevance');
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        <p className="text-[13px] text-muted">
          <Link href="/" className="hover:underline">
            Home
          </Link>{' '}
          / Shop /{' '}
          <span className="text-ink">
            {selectedCategory
              ? categories.find((c) => c.slug === selectedCategory)?.nameEn ?? selectedCategory
              : 'All products'}
          </span>
        </p>

        <h1 className="text-[28px] font-bold text-ink">Find your everyday favorites</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[248px_1fr] gap-4 items-start">
          {/* Filters sidebar (Figma 4:594) */}
          <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Filters</h2>

            <div className="flex flex-col gap-2">
              <p className="text-[16px] font-semibold text-ink">Category</p>
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`text-left text-[13px] ${
                  selectedCategory === '' ? 'text-brand font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                {selectedCategory === '' ? '☑' : '□'} All products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`text-left text-[13px] ${
                    selectedCategory === cat.slug
                      ? 'text-brand font-semibold'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {selectedCategory === cat.slug ? '☑' : '□'} {cat.nameEn}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[16px] font-semibold text-ink">Price range (ETB)</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="min-h-[42px] w-full rounded-[10px] border border-border-subtle px-3 text-[14px] text-ink outline-none focus:border-brand"
                />
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="min-h-[42px] w-full rounded-[10px] border border-border-subtle px-3 text-[14px] text-ink outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[16px] font-semibold text-ink">Availability</p>
              <button
                type="button"
                onClick={() => setInStockOnly((v) => !v)}
                className={`text-left text-[13px] ${
                  inStockOnly ? 'text-brand font-medium' : 'text-muted'
                }`}
              >
                {inStockOnly ? '☑' : '□'} In stock only
              </button>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="min-h-[44px] w-full rounded-[10px] border border-border-subtle bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-canvas transition-colors"
            >
              Clear all filters
            </button>
          </aside>

          {/* Product results */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[16px] text-muted">
                {loading ? 'Loading products...' : `${products.length} products`}
              </p>

              <div className="flex items-center gap-3">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by keyword..."
                  className="min-h-[44px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[14px] text-ink outline-none focus:border-brand"
                />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="min-h-[44px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[14px] font-semibold text-ink outline-none focus:border-brand"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price_asc">Sort: Price low to high</option>
                  <option value="price_desc">Sort: Price high to low</option>
                </select>
              </div>
            </div>

            {/* Active filter pills */}
            <div className="flex flex-wrap gap-2">
              {inStockOnly && (
                <button
                  type="button"
                  onClick={() => setInStockOnly(false)}
                  className="rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-brand"
                >
                  In stock ×
                </button>
              )}
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className="rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-brand"
                >
                  {selectedCategory} ×
                </button>
              )}
              {(minPrice || maxPrice) && (
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                  className="rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium text-brand"
                >
                  ETB {minPrice || '0'}–{maxPrice || '∞'} ×
                </button>
              )}
            </div>

            {!loading && products.length === 0 ? (
              <div className="rounded-[14px] border border-border-subtle bg-surface p-10 text-center flex flex-col items-center gap-3">
                <p className="text-[18px] font-semibold text-ink">No matching products</p>
                <p className="text-[14px] text-muted">
                  Try adjusting your category, search keyword, or price filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-[44px] px-5 rounded-[10px] bg-brand text-[14px] font-semibold text-white"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="rounded-[14px] border border-border-subtle bg-surface p-4 flex flex-col gap-2.5 hover:border-brand/50 transition-colors"
                  >
                    <div className="h-[210px] w-full rounded-[12px] bg-canvas overflow-hidden">
                      <img
                        src={resolveProductImage(product.slug, product.images)}
                        alt={product.nameEn}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between text-muted">
                      <span className="text-[11px] font-medium tracking-wide uppercase">
                        {product.category.nameEn}
                      </span>
                      <span className="text-[20px] leading-none">♡</span>
                    </div>
                    <p className="text-[16px] font-medium text-ink min-h-[44px]">
                      {product.nameEn}
                    </p>
                    <p className="text-[20px] font-semibold text-ink">
                      {formatEtb(product.minPrice)}
                    </p>
                    <p
                      className={`text-[13px] ${
                        product.totalAvailable > 0 ? 'text-brand' : 'text-warning'
                      }`}
                    >
                      {product.totalAvailable > 0
                        ? `Available · ${product.totalAvailable} ready to ship`
                        : 'Out of stock'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <ShopContent />
    </Suspense>
  );
}
