'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { StaffShell } from '@/components/staff-shell';
import { apiFetch, apiUploadFile, ApiError } from '@/lib/api';

interface Category {
  id: string;
  nameEn: string;
}

interface VariantDraft {
  id?: string;
  sku: string;
  nameEn: string;
  price: string;
  costPrice: string;
  availableQuantity?: number;
}

export default function ProductEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === 'new';

  const [categories, setCategories] = useState<Category[]>([]);
  const [nameEn, setNameEn] = useState('');
  const [nameAm, setNameAm] = useState('');
  const [subtitleEn, setSubtitleEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([
    { sku: '', nameEn: 'Standard', price: '', costPrice: '' },
  ]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Category[]>('/categories')
      .then((cats) => {
        setCategories(cats);
        if (isNew && cats[0]) setCategoryId(cats[0].id);
      })
      .catch(() => {});
  }, [isNew]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    apiFetch<{
      nameEn: string;
      nameAm: string | null;
      subtitleEn: string | null;
      descriptionEn: string | null;
      brand: string | null;
      categoryId: string;
      status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
      isFeatured: boolean;
      images?: Array<{ url: string }>;
      variants: Array<{
        id: string;
        sku: string;
        nameEn: string;
        price: number;
        costPrice: number | null;
        availableQuantity: number;
      }>;
    }>(`/staff/products/${params.id}`, { auth: true })
      .then((p) => {
        setNameEn(p.nameEn);
        setNameAm(p.nameAm ?? '');
        setSubtitleEn(p.subtitleEn ?? '');
        setDescriptionEn(p.descriptionEn ?? '');
        setBrand(p.brand ?? '');
        setCategoryId(p.categoryId);
        setStatus(p.status);
        setIsFeatured(p.isFeatured);
        setImageUrls((p.images ?? []).map((img) => img.url));
        setVariants(
          p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            nameEn: v.nameEn,
            price: String(v.price),
            costPrice: v.costPrice ? String(v.costPrice) : '',
            availableQuantity: v.availableQuantity,
          })),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load product.'))
      .finally(() => setLoading(false));
  }, [isNew, params.id]);

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { sku: '', nameEn: '', price: '', costPrice: '' }]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);
    setSaving(true);

    try {
      const payload = {
        categoryId,
        nameEn,
        nameAm: nameAm || undefined,
        subtitleEn: subtitleEn || undefined,
        descriptionEn: descriptionEn || undefined,
        brand: brand || undefined,
        status,
        isFeatured,
        imageUrls,
        variants: variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          sku: v.sku.trim(),
          nameEn: v.nameEn.trim(),
          price: Number(v.price),
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          isActive: true,
        })),
      };

      if (isNew) {
        const created = await apiFetch<{ id: string }>('/products', {
          method: 'POST',
          auth: true,
          body: JSON.stringify(payload),
        });
        router.push(`/dashboard/products/${created.id}`);
      } else {
        await apiFetch(`/products/${params.id}`, {
          method: 'PATCH',
          auth: true,
          body: JSON.stringify(payload),
        });
        setSavedMsg('Product changes saved and recorded in the audit log.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (isNew) return;
    setSaving(true);
    try {
      await apiFetch(`/products/${params.id}/archive`, { method: 'PATCH', auth: true });
      setStatus('ARCHIVED');
      setSavedMsg('Product archived. Historical order references remain intact.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to archive product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StaffShell title={isNew ? 'New product' : 'Product editor'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/products" className="text-[13px] font-medium text-brand hover:underline">
            ← Back to products
          </Link>
          <h1 className="text-[28px] font-bold text-ink mt-1">
            {isNew ? 'Add product' : nameEn || 'Edit product'}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="min-h-[48px] px-5 py-3 rounded-[10px] bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save product'}
        </button>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="rounded-[10px] border border-brand/30 bg-brand-tint px-4 py-3 text-[14px] text-brand font-medium">
          ✓ {savedMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-[14px] border border-border-subtle bg-surface p-8 text-[14px] text-muted">
          Loading product...
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          {/* Left column: Basics + Variants */}
          <div className="flex flex-col gap-4">
            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <h2 className="text-[20px] font-semibold text-ink">Basics</h2>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Product name · English *</label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Woven everyday tote"
                  className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Product name · Amharic</label>
                <input
                  type="text"
                  value={nameAm}
                  onChange={(e) => setNameAm(e.target.value)}
                  placeholder="Add translated product name"
                  className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[16px] text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Subtitle / short summary</label>
                <input
                  type="text"
                  value={subtitleEn}
                  onChange={(e) => setSubtitleEn(e.target.value)}
                  placeholder="Handcrafted natural cotton blend with reinforced straps"
                  className="min-h-[48px] rounded-[10px] border border-border-subtle px-4 text-[15px] text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-ink">Description</label>
                <textarea
                  rows={4}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder="Describe materials, dimensions, and care instructions..."
                  className="rounded-[10px] border border-border-subtle p-4 text-[15px] text-ink outline-none focus:border-brand"
                />
              </div>
            </section>

            {/* Product Images (Figma 4:1855) */}
            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-[20px] font-semibold text-ink">Images</h2>
                <p className="text-[13px] text-muted mt-1">
                  The first image is your main storefront photo. JPG, PNG or WebP · Up to 5 MB.
                </p>
              </div>

              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {imageUrls.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="w-[180px] flex flex-col gap-2">
                      <img
                        src={url}
                        alt={`Product image ${idx + 1}`}
                        className="h-[144px] w-[180px] rounded-[10px] object-cover border border-border-subtle bg-canvas"
                      />
                      <div className="flex items-center gap-2 text-[13px]">
                        {idx === 0 ? (
                          <span className="text-brand font-medium">Main image</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setImageUrls((prev) => [url, ...prev.filter((_, i) => i !== idx)])
                            }
                            className="text-muted hover:text-ink"
                          >
                            Make main
                          </button>
                        )}
                        <span className="text-muted">·</span>
                        <button
                          type="button"
                          onClick={() =>
                            setImageUrls((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-muted hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="inline-flex items-center min-h-[48px] px-4 py-3 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink hover:bg-canvas cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadingImg}
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length === 0) return;
                      setUploadingImg(true);
                      setError(null);
                      try {
                        for (const file of files) {
                          const uploaded = await apiUploadFile(file, 'products');
                          setImageUrls((prev) => [...prev, uploaded.url]);
                        }
                      } catch (err) {
                        setError(
                          err instanceof ApiError ? err.message : 'Unable to upload image.',
                        );
                      } finally {
                        setUploadingImg(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  {uploadingImg ? 'Uploading...' : 'Upload images'}
                </label>
              </div>
            </section>

            {/* Variants & SKUs (Figma 4:1868) */}
            <section className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[20px] font-semibold text-ink">Variants &amp; SKUs</h2>
                <button
                  type="button"
                  onClick={addVariantRow}
                  className="min-h-[40px] px-4 rounded-[10px] border border-border-subtle bg-surface text-[13px] font-semibold text-ink hover:bg-canvas"
                >
                  + Add variant
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {variants.map((variant, idx) => (
                  <div
                    key={variant.id ?? idx}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-[10px] border border-border-subtle p-3 bg-canvas/50"
                  >
                    <input
                      type="text"
                      required
                      value={variant.sku}
                      onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                      placeholder="SKU (e.g. TOTE-NAT-01)"
                      className="min-h-[42px] rounded-[8px] border border-border-subtle bg-surface px-3 text-[13px] text-ink outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      required
                      value={variant.nameEn}
                      onChange={(e) => updateVariant(idx, { nameEn: e.target.value })}
                      placeholder="Variant (e.g. Natural)"
                      className="min-h-[42px] rounded-[8px] border border-border-subtle bg-surface px-3 text-[13px] text-ink outline-none focus:border-brand"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={variant.price}
                      onChange={(e) => updateVariant(idx, { price: e.target.value })}
                      placeholder="Price (ETB)"
                      className="min-h-[42px] rounded-[8px] border border-border-subtle bg-surface px-3 text-[13px] text-ink outline-none focus:border-brand"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variant.costPrice}
                        onChange={(e) => updateVariant(idx, { costPrice: e.target.value })}
                        placeholder="Cost (ETB)"
                        className="min-h-[42px] w-full rounded-[8px] border border-border-subtle bg-surface px-3 text-[13px] text-ink outline-none focus:border-brand"
                      />
                      {variant.availableQuantity !== undefined && (
                        <span className="text-[12px] text-brand font-medium shrink-0">
                          {variant.availableQuantity} avail
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right column: Publishing & Organization */}
          <aside className="rounded-[14px] border border-border-subtle bg-surface p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink">Publishing</h2>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED')
                }
                className="min-h-[44px] rounded-[10px] border border-border-subtle bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="UNPUBLISHED">Unpublished</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="min-h-[44px] rounded-[10px] border border-border-subtle bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="market. Studio"
                className="min-h-[44px] rounded-[10px] border border-border-subtle px-3 text-[14px] text-ink outline-none focus:border-brand"
              />
            </div>

            <label className="flex items-center gap-2 text-[14px] text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="accent-brand"
              />
              Feature on Home storefront
            </label>

            {!isNew && status !== 'ARCHIVED' && (
              <button
                type="button"
                onClick={handleArchive}
                className="mt-2 min-h-[44px] rounded-[10px] border border-border-subtle bg-surface px-4 text-[13px] font-semibold text-warning hover:bg-warning-tint/40 transition-colors"
              >
                Archive product
              </button>
            )}
          </aside>
        </form>
      )}
    </StaffShell>
  );
}
