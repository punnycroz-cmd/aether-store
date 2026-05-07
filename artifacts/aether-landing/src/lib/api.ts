const TOKEN_KEY = 'aether_auth_token';

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `/api/proxy/${cleanPath}`;

  const extraHeaders: Record<string, string> = {};
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      extraHeaders['Authorization'] = `Bearer ${token}`;
    }
  } catch { /* noop */ }

  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
      ...(opts.headers ?? {}),
    },
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = text;
    try { detail = JSON.parse(text)?.detail ?? text; } catch { /* noop */ }
    const err = new Error(detail || `HTTP ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const GOOGLE_CLIENT_ID =
  '206665134027-80oiqn378dq1jo49lgtmaueu0p30mf9a.apps.googleusercontent.com';

export const DAY_MODELS = [
  'Ani', 'Aura', 'Evo', 'Flux1 D', 'Fur', 'FurXL Classic', 'Gen', 'Glitch', 'Gothic',
  'Hyper CGI', 'HyperX', 'Muse', 'Nai', 'Neo', 'Noob', 'Pixel', 'Pony', 'Rend',
  'Retro', 'Supra', 'Synth', 'Toon', 'Volt', 'Wassie',
];

export const STAR_MODELS = [
  'Gen', 'Ani', 'Synth', 'Fur', 'Noob', 'Aura', 'Pixel', 'Hyper CGI',
  'Volt', 'Muse', 'Rend', 'Pony', 'Neo', 'Nai', 'Retro', 'Supra',
  'Evo', 'Toon', 'HyperX', 'FurXL Classic', 'Illustrious', 'Real Amateurs',
  'RealX', 'Real Classic',
];

export const ASPECT_CHOICES = ['1:1', '16:9', '5:2', '4:5', '4:7'];
export const QUALITY_CHOICES = ['Fast', 'High Quality'];

// Social API helpers
export const social = {
  like: (rid: string) => apiFetch<{ liked: boolean }>(`gallery/like/${rid}`, { method: 'POST' }),
  comment: (rid: string, content: string) => apiFetch<{ status: string; comment: any }>(`gallery/comment/${rid}`, { method: 'POST', body: JSON.stringify({ content }) }),
  getComments: (rid: string) => apiFetch<{ comments: any[] }>(`gallery/comments/${rid}`),
  follow: (uid: string) => apiFetch<{ followed: boolean }>(`user/follow/${uid}`, { method: 'POST' }),
  getProfile: (uid: string) => apiFetch<{ profile: any }>(`user/profile/${uid}`),
  getPublicGallery: (params: { limit?: number; before?: string; realm?: string; search?: string; sort?: string; target_uid?: string; signal?: AbortSignal }) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.before) q.set('before', params.before);
    if (params.realm) q.set('realm', params.realm);
    if (params.search) q.set('search', params.search);
    if (params.sort) q.set('sort', params.sort);
    if (params.target_uid) q.set('target_uid', params.target_uid);
    return apiFetch<any>(`public-gallery?${q.toString()}`, { signal: params.signal });
  }
};
