const FALLBACK_IMAGE_BY_SLUG: Record<string, string> = {
  'woven-everyday-tote': '/images/woven-tote.png',
  'studio-wireless-headphones': '/images/wireless-headphones.png',
  'terracotta-vase': '/images/terracotta-vase.png',
  'handloom-cotton-throw': '/images/cotton-throw.png',
};

export function resolveProductImage(
  slug: string,
  images?: Array<{ url: string }> | null,
): string {
  if (images && images.length > 0 && images[0]?.url) {
    return images[0].url;
  }
  return FALLBACK_IMAGE_BY_SLUG[slug] ?? '/images/woven-tote.png';
}
