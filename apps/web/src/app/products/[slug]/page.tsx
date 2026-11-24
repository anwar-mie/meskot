'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatEtb } from '@meskot/shared-types';
import { StorefrontHeader } from '@/components/storefront-header';
import { apiFetch } from '@/lib/api';
import { resolveProductImage } from '@/lib/product-images';

interface VariantDetail {
  id: string;
  sku: string;
  nameEn: string;
  price: number;
  compareAtPrice: number | null;
  availableQuantity: number;
}

interface ProductDetail {
  id: string;
  slug: string;
  nameEn: string;
  subtitleEn: string | null;
  descriptionEn: string | null;
  brand: string | null;
  category: { slug: string; nameEn: string };
  images: Array<{ id: string; url: string; altText: string | null }>;
  variants: VariantDetail[];
}

export default function ProductDetailsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'delivery'>('description');
  const [loading, setLoading] = useState(true);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<ProductDetail>(`/products/${slug}`)
      .then((data) => {
        setProduct(data);
        const firstAvailable =
          data.variants.find((v) => v.availableQuantity > 0) ?? data.variants[0];
        if (firstAvailable) setSelectedVariantId(firstAvailable.id);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const selectedVariant =
    product?.variants.find((v) => v.id === selectedVariantId) ?? product?.variants[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <StorefrontHeader />

      <main className="max-w-[1440px] w-full mx-auto px-6 lg:px-16 pt-8 pb-16 flex flex-col gap-6">
        {loading ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-10 text-[15px] text-muted">
            Loading product details...
          </div>
        ) : !product ? (
          <div className="rounded-[14px] border border-border-subtle bg-surface p-10 flex flex-col items-start gap-3">
            <h1 className="text-[24px] font-bold text-ink">Product not found</h1>
            <Link href="/shop" className="text-[14px] font-semibold text-brand hover:underline">
              ← Back to shop
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted">
              <Link href="/" className="hover:underline">
                Home
              </Link>{' '}
              /{' '}
              <Link href={`/shop?category=${product.category.slug}`} className="hover:underline">
                {product.category.nameEn}
              </Link>{' '}
              / <span className="text-ink">{product.nameEn}</span>
            </p>

            {/* Gallery & purchase options (Figma 4:694) */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,640px)_1fr] gap-6 items-start">
              <div className="flex flex-col gap-4">
                <div className="h-[420px] lg:h-[500px] w-full rounded-[12px] overflow-hidden bg-surface border border-border-subtle">
                  <img
                    src={resolveProductImage(product.slug, product.images)}
                    alt={product.nameEn}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className={`h-[88px] w-[96px] rounded-[12px] overflow-hidden border bg-surface ${
                        idx === 0 ? 'border-brand' : 'border-border-subtle opacity-80'
                      }`}
                    >
                      <img
                        src={resolveProductImage(product.slug, product.images)}
                        alt={`${product.nameEn} view ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 items-start">
                <p className="text-[13px] font-semibold tracking-wide text-brand uppercase">
                  {product.brand ?? 'THE EVERYDAY COLLECTION'}
                </p>
                <h1 className="text-[28px] font-bold text-ink">{product.nameEn}</h1>
                <p className="text-[28px] font-bold text-brand">
                  {selectedVariant ? formatEtb(selectedVariant.price) : '—'}
                </p>
                {product.subtitleEn && (
                  <p className="text-[16px] leading-[1.45] text-muted">{product.subtitleEn}</p>
                )}

                {selectedVariant && (
                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                      selectedVariant.availableQuantity > 0
                        ? 'bg-brand-tint text-brand'
                        : 'bg-warning-tint text-warning'
                    }`}
                  >
                    {selectedVariant.availableQuantity > 0
                      ? `In stock · ${selectedVariant.availableQuantity} available`
                      : 'Sold out'}
                  </span>
                )}

                {/* Variant picker */}
                <div className="flex flex-col gap-2 w-full">
                  <p className="text-[16px] font-semibold text-ink">
                    Variant · {selectedVariant?.nameEn ?? ''}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((variant) => {
                      const active = variant.id === selectedVariant?.id;
                      const soldOut = variant.availableQuantity === 0;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(variant.id);
                            setQuantity(1);
                            setCartNotice(null);
                          }}
                          className={`min-h-[48px] px-5 py-3 rounded-[10px] border text-[15px] font-semibold transition-colors ${
                            active
                              ? 'bg-brand-tint border-brand text-ink'
                              : 'bg-surface border-border-subtle text-ink hover:bg-canvas'
                          } ${soldOut ? 'opacity-55' : ''}`}
                        >
                          {active ? '✓ ' : ''}
                          {variant.nameEn}
                          {soldOut ? ' · Sold out' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity & Add to cart */}
                <div className="flex flex-col gap-2 w-full">
                  <p className="text-[16px] font-medium text-ink">Quantity</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center min-h-[48px] rounded-[10px] border border-border-subtle bg-surface">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-4 py-2 text-[18px] font-semibold text-ink hover:bg-canvas rounded-l-[10px]"
                      >
                        −
                      </button>
                      <span className="px-4 text-[16px] font-semibold text-ink">{quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) =>
                            Math.min(selectedVariant?.availableQuantity ?? 1, q + 1),
                          )
                        }
                        className="px-4 py-2 text-[18px] font-semibold text-ink hover:bg-canvas rounded-r-[10px]"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedVariant || selectedVariant.availableQuantity === 0}
                      onClick={() =>
                        setCartNotice(
                          `Selected ${quantity} × ${product.nameEn} (${selectedVariant?.sku}). Full cart & checkout arrive in Slice 4.`,
                        )
                      }
                      className="min-h-[48px] px-6 py-3 rounded-[10px] bg-brand text-[16px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
                    >
                      Add to cart
                    </button>
                  </div>
                </div>

                {cartNotice && (
                  <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[13px] text-brand w-full">
                    {cartNotice}
                  </div>
                )}

                <div className="rounded-[14px] border border-border-subtle bg-surface p-6 w-full flex flex-col gap-2 mt-2">
                  <p className="text-[16px] font-semibold text-ink">Delivery to Addis Ababa</p>
                  <p className="text-[13px] text-muted">
                    Fee calculated by delivery zone at checkout. Pay online via Chapa or choose cash
                    on delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Product information tabs */}
            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <div className="flex flex-wrap gap-6 border-b border-border-subtle pb-3 text-[16px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('description')}
                  className={
                    activeTab === 'description' ? 'font-semibold text-brand' : 'text-muted'
                  }
                >
                  Description
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={activeTab === 'specs' ? 'font-semibold text-brand' : 'text-muted'}
                >
                  Specifications
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('delivery')}
                  className={activeTab === 'delivery' ? 'font-semibold text-brand' : 'text-muted'}
                >
                  Delivery information
                </button>
              </div>

              {activeTab === 'description' && (
                <p className="text-[16px] leading-[1.55] text-muted">
                  {product.descriptionEn ?? product.subtitleEn ?? 'No description available.'}
                </p>
              )}
              {activeTab === 'specs' && (
                <div className="text-[14px] text-muted flex flex-col gap-2">
                  <p>
                    <strong className="text-ink">SKU:</strong> {selectedVariant?.sku ?? '—'}
                  </p>
                  <p>
                    <strong className="text-ink">Category:</strong> {product.category.nameEn}
                  </p>
                  <p>
                    <strong className="text-ink">Brand:</strong> {product.brand ?? 'market.'}
                  </p>
                </div>
              )}
              {activeTab === 'delivery' && (
                <p className="text-[15px] text-muted">
                  Same-day or next-day delivery across Addis Ababa (Bole, Kirkos, Yeka, Arada, Nifas
                  Silk, Kolfe). Regional delivery in 2–4 business days.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
