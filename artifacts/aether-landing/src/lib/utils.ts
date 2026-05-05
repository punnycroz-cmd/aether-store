import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GalleryItem } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const R2_HOSTS = ["r2.dev"];

/** Wrap R2 CDN URLs through the local image proxy to avoid CORS blocks. */
export function proxyImg(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    if (R2_HOSTS.some(h => hostname === h || hostname.endsWith("." + h))) {
      return `/api/img-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch { /* not a valid URL, return as-is */ }
  return url;
}

export function getThumb(item: GalleryItem): string | null {
  let raw: string | null = null;
  if (item.first_thumbnail) raw = item.first_thumbnail;
  else {
    const imgs = item.images ?? [];
    const visible = imgs.find(img => img.status !== 'hidden' && img.status !== 'deleting');
    if (visible) raw = visible.thumbnail_url ?? visible.r2_url ?? visible.url ?? null;
    else raw = item.result?.image_urls?.[0] ?? null;
  }
  return proxyImg(raw);
}

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STOP_WORDS = new Set([
  'a','an','the','with','and','or','of','in','on','at','to','for','is','are','was','were',
  'it','its','be','by','as','from','that','this','into','over','under','through','very',
  'highly','ultra','more','some','her','his','their','which','where','when','who','how',
  'not','but','also','after','style','view','shot','light','render','detail','detailed',
  'beautiful','stunning','amazing','perfect','incredible','masterpiece','quality','best',
  'image','photo','picture','illustration','concept','art','digital','3d','hd','4k','8k',
]);

export function extractTags(prompt?: string): string[] {
  if (!prompt) return [];
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const seen = new Set<string>();
  return words.filter(w => seen.has(w) ? false : (seen.add(w), true)).slice(0, 5);
}
