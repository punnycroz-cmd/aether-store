import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { apiFetch } from '../lib/api';
import { extractTags, proxyImg } from '../lib/utils';

const CHARS = [
  { img: 'char-mage.png',    name: 'The Arcanist',    role: 'Conjures visions from raw thought',  accent: '#10b981', glow: 'rgba(16,185,129,0.35)',  lore: 'Master of the emerald arts, the Arcanist channels pure creative energy into form. Her grimoire holds a thousand spells yet uncast.' },
  { img: 'char-star.png',    name: 'The Star-Weaver', role: 'Threads constellations into art',     accent: '#8b5cf6', glow: 'rgba(139,92,246,0.4)',   lore: 'Born of starlight and shadow, she maps the cosmos onto every canvas. Each creation is a new constellation in the Aether.' },
  { img: 'char-lantern.png', name: 'The Keeper',      role: 'Preserves light across the Aether',  accent: '#f6c043', glow: 'rgba(246,192,67,0.35)',  lore: 'Guardian of the golden lantern, the Keeper ensures no vision fades. Her warmth illuminates paths through the darkest realms.' },
  { img: 'char-dream.png',   name: 'The Dreamwright', role: 'Sculpts worlds from sleeping minds',  accent: '#67e8f9', glow: 'rgba(103,232,249,0.35)', lore: 'She walks between waking and dreaming, gathering fragments of imagination. Her crystal orb holds visions yet to be dreamed.' },
];

interface GalleryItem {
  request_id: string;
  realm: 'day' | 'star';
  prompt?: string;
  model?: string;
  images?: { url?: string; r2_url?: string; thumbnail_url?: string; status?: string }[];
  result?: { image_urls?: string[] };
  first_thumbnail?: string;
  user_name?: string;
  user_picture?: string;
  created_at?: string;
  image_id_seq?: number;
}

interface GalleryResponse {
  items: GalleryItem[];
  has_more: boolean;
  next_cursor: number | null;
}

export function DiscoverPage() {
  const [activeChar, setActiveChar] = useState(0);
  const [feed, setFeed]             = useState<GalleryItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [cursor, setCursor]         = useState<number | null>(null);
  const [lightboxItem, setLightboxItem] = useState<{ item: GalleryItem; imgIdx: number } | null>(null);
  const [cloneToast, setCloneToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [realmFilter, setRealmFilter] = useState<'all' | 'day' | 'star'>('all');
  const [sortMode, setSortMode] = useState<'recent' | 'trending'>('recent');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const char = CHARS[activeChar];

  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of feed) {
      for (const tag of extractTags(item.prompt)) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([tag, count]) => ({ tag, count }));
  }, [feed]);

  const loadFeed = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      const cur = reset ? null : cursor;
      if (cur) params.set('before', String(cur));

      const data = await apiFetch<GalleryResponse>(`/public-gallery?${params}`);
      const items = (data.items ?? []).filter(item => {
        const imgs = item.images ?? [];
        return imgs.some(img => img.status !== 'hidden' && img.status !== 'deleting');
      });

      setFeed(prev => reset ? items : [...prev, ...items]);
      setHasMore(data.has_more ?? false);
      setCursor(data.next_cursor ?? null);
    } catch (e) {
      console.error('Gallery load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    loadFeed(true);
  }, []);

  function cloneItem(item: GalleryItem) {
    if (item.prompt) sessionStorage.setItem('forgePrompt', item.prompt);
    setCloneToast(item.prompt?.slice(0, 40) ?? 'vision');
    setTimeout(() => { setCloneToast(null); navigate('/forge'); }, 900);
  }

  function getThumb(item: GalleryItem): string | null {
    const imgs = item.images ?? [];
    const visible = imgs.filter(img => img.status !== 'hidden' && img.status !== 'deleting');
    if (visible.length > 0) return proxyImg(visible[0].r2_url ?? visible[0].url ?? null);
    if (item.first_thumbnail) return proxyImg(item.first_thumbnail);
    if (item.result?.image_urls?.[0]) return proxyImg(item.result.image_urls[0]);
    return null;
  }

  function getInitials(name?: string) {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const feedWithThumbs = feed
    .filter(item => getThumb(item))
    .filter(item => realmFilter === 'all' || item.realm === realmFilter)
    .filter(item => !searchQuery.trim() || (item.prompt ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (item.user_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(item => !tagFilter || (item.prompt ?? '').toLowerCase().includes(tagFilter))
    .sort(() => sortMode === 'trending' ? Math.random() - 0.5 : 0);

  return (
    <div className="min-h-screen" style={{ background: '#080c1a' }}>
      <SiteNav />

      <div className="fixed inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 70% 55% at 50% 18%, ${char.glow.replace(/[\d.]+\)$/, '0.07)')}, transparent 65%)`,
        transition: 'background 0.8s',
      }} />

      {/* Clone toast */}
      <AnimatePresence>
        {cloneToast && (
          <motion.div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.4 }}>
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: '#c4b5fd', letterSpacing: '0.1em' }}>
              Incantation cloned — opening the Forge…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-[72px]">
        {/* ── CHARACTERS ── */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          <motion.div className="text-center mb-10"
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#fff', fontWeight: 700 }}>
              Explore the <span style={{ color: '#8b5cf6' }}>Aether</span>
            </h1>
            <p className="mt-3 uppercase tracking-widest" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(248,250,252,0.32)' }}>
              Discover public visions from the community · clone incantations · forge your own
            </p>
          </motion.div>

          <div className="flex items-end justify-center gap-3 mb-8">
            {CHARS.map((c, i) => {
              const active = activeChar === i;
              return (
                <motion.div key={c.name} onClick={() => setActiveChar(i)}
                  className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    width: active ? 'clamp(160px, 18vw, 240px)' : 'clamp(110px, 12vw, 155px)',
                    aspectRatio: '3/4',
                    border: `${active ? 2 : 1}px solid ${active ? c.accent : c.accent + '33'}`,
                    boxShadow: active ? `0 0 48px ${c.glow}` : 'none',
                    background: 'linear-gradient(160deg,rgba(10,15,30,0.95),rgba(5,8,18,0.98))',
                    transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s, border 0.4s',
                  }}
                  whileHover={{ scale: active ? 1 : 1.04 }}>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-1/3 blur-2xl rounded-full pointer-events-none"
                    style={{ background: c.glow, opacity: active ? 0.6 : 0.25, transition: 'opacity 0.4s' }} />
                  <img src={`${import.meta.env.BASE_URL}assets/${c.img}`} alt={c.name}
                    className="relative z-10 w-full h-full object-contain object-bottom" style={{ padding: '6% 8% 0' }} />
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 z-20 pointer-events-none"
                    style={{ background: 'linear-gradient(to top,rgba(5,8,18,0.95),transparent)' }} />
                  <div className="absolute top-0 left-0 right-0 h-[2px] z-30"
                    style={{ background: `linear-gradient(90deg,transparent,${c.accent},transparent)`, opacity: active ? 1 : 0.3, transition: 'opacity 0.4s' }} />
                  <div className="absolute bottom-3 left-0 right-0 z-30 text-center">
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: active ? '0.72rem' : '0.58rem', color: active ? c.accent : 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', transition: 'all 0.4s' }}>
                      {c.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div key={activeChar} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto text-center mb-4 px-4">
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)', color: char.accent, fontWeight: 700, letterSpacing: '0.1em' }}>
              {char.name}
            </h2>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 5 }}>
              {char.role}
            </p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.88rem', color: 'rgba(248,250,252,0.5)', lineHeight: 1.7, marginTop: 10 }}>
              {char.lore}
            </p>
          </motion.div>

          <div className="mx-auto mb-12" style={{ height: 1, background: `linear-gradient(90deg,transparent,${char.accent}44,transparent)`, maxWidth: '40%', transition: 'background 0.5s' }} />
        </div>

        {/* ── COMMUNITY FEED ── */}
        <div style={{ background: 'rgba(0,0,0,0.35)', borderTop: '1px solid rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg,rgba(139,92,246,0.35),transparent)' }} />
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.28em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Global Discovery
              </h2>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(270deg,rgba(139,92,246,0.35),transparent)' }} />
            </div>

            {/* Search + Filter bar */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search prompts, creators…"
                  className="w-full pl-9 pr-4 py-2 rounded-xl outline-none"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#f8fafc' }}
                />
              </div>

              {/* Realm filter */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {(['all','day','star'] as const).map(r => (
                  <button key={r} onClick={() => setRealmFilter(r)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200"
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      background: realmFilter === r ? (r === 'day' ? 'rgba(16,185,129,0.18)' : r === 'star' ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.08)') : 'transparent',
                      color: realmFilter === r ? (r === 'day' ? '#10b981' : r === 'star' ? '#8b5cf6' : '#f8fafc') : 'rgba(255,255,255,0.3)',
                      border: realmFilter === r ? `1px solid ${r === 'day' ? 'rgba(16,185,129,0.35)' : r === 'star' ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.15)'}` : '1px solid transparent',
                    }}>
                    {r === 'all' ? 'All' : r === 'day' ? '☀ Day' : '★ Star'}
                  </button>
                ))}
              </div>

              {/* Sort toggle */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {(['recent','trending'] as const).map(s => (
                  <button key={s} onClick={() => setSortMode(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200"
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      background: sortMode === s ? 'rgba(139,92,246,0.15)' : 'transparent',
                      color: sortMode === s ? '#8b5cf6' : 'rgba(255,255,255,0.3)',
                      border: sortMode === s ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                    }}>
                    {s === 'recent' ? '⏱ Recent' : '🔥 Trending'}
                  </button>
                ))}
              </div>

              {/* Result count */}
              {(searchQuery || realmFilter !== 'all' || tagFilter) && (
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
                    {feedWithThumbs.length} results
                  </span>
                  {tagFilter && (
                    <button onClick={() => setTagFilter(null)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', cursor: 'pointer' }}>
                      #{tagFilter}
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tag Cloud */}
            {topTags.length > 0 && (
              <motion.div className="mb-6"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(139,92,246,0.55)' }}>
                    Top Tags
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(139,92,246,0.12)' }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topTags.map(({ tag, count }) => {
                    const active = tagFilter === tag;
                    const size = count > 5 ? '0.7rem' : count > 3 ? '0.65rem' : '0.6rem';
                    return (
                      <motion.button key={tag} onClick={() => setTagFilter(active ? null : tag)}
                        className="px-2.5 py-1 rounded-xl"
                        style={{
                          fontFamily: 'Outfit, sans-serif', fontSize: size, letterSpacing: '0.08em',
                          background: active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? 'rgba(139,92,246,0.45)' : 'rgba(255,255,255,0.08)'}`,
                          color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                          cursor: 'pointer', boxShadow: active ? '0 0 12px rgba(139,92,246,0.2)' : 'none',
                        }}
                        whileHover={{ background: active ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.08)', scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}>
                        #{tag}
                        {count > 1 && (
                          <span style={{ marginLeft: 4, opacity: 0.45, fontSize: '0.5rem' }}>{count}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Feed loading skeleton */}
            {loading && feedWithThumbs.length === 0 && (
              <div className="columns-2 lg:columns-3 gap-5">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className="break-inside-avoid mb-5 rounded-2xl overflow-hidden"
                    style={{ aspectRatio: i % 4 === 1 ? '3/4' : '4/3', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <motion.div className="w-full h-full"
                      style={{ background: 'linear-gradient(110deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 100%)' }}
                      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && feedWithThumbs.length === 0 && (
              <div className="text-center py-20">
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', marginBottom: 8 }}>
                  The Gallery Awaits Its First Vision
                </p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.1em' }}>
                  Share your generations from the Grimoire to populate the community gallery
                </p>
              </div>
            )}

            {feedWithThumbs.length > 0 && (
              <div className="columns-2 lg:columns-3 gap-5">
                {feedWithThumbs.map((item, i) => {
                  const col = item.realm === 'day' ? '#10b981' : '#8b5cf6';
                  const thumb = getThumb(item)!;
                  const initials = getInitials(item.user_name);
                  const formatDate = (d?: string) => {
                    if (!d) return '';
                    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
                    catch { return ''; }
                  };

                  return (
                    <motion.div key={item.request_id}
                      className="break-inside-avoid mb-5 relative rounded-2xl overflow-hidden cursor-pointer group"
                      style={{ border: `1px solid ${col}22` }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.55, delay: (i % 6) * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ scale: 1.02, boxShadow: `0 0 36px ${col}28` }}
                      onClick={() => setLightboxItem({ item, imgIdx: 0 })}>

                      <img src={thumb} className="w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(5,8,20,0.9) 0%,rgba(5,8,20,0.1) 55%,transparent 100%)' }} />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `linear-gradient(160deg,${col}0c,transparent)` }} />

                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full"
                        style={{ background: `${col}20`, border: `1px solid ${col}44` }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: col, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                          {item.realm === 'day' ? 'Day' : 'Star'}
                        </span>
                      </div>

                      {item.prompt && (
                        <motion.button
                          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: '#fff', background: 'rgba(139,92,246,0.65)', border: '1px solid rgba(139,92,246,0.5)', letterSpacing: '0.1em', backdropFilter: 'blur(6px)' }}
                          whileHover={{ scale: 1.08, background: 'rgba(139,92,246,0.85)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); cloneItem(item); }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                          </svg>
                          Clone
                        </motion.button>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#F6E3BA', fontWeight: 600, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.model ?? 'Unknown Engine'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {item.user_picture ? (
                            <img src={item.user_picture} className="w-5 h-5 rounded-full flex-shrink-0" alt="" />
                          ) : (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: `${col}30`, border: `1px solid ${col}55` }}>
                              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.42rem', color: col, fontWeight: 700 }}>{initials}</span>
                            </div>
                          )}
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: col, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {item.user_name ?? 'Aether Wanderer'}
                          </span>
                          {item.created_at && (
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                              {formatDate(item.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Load more */}
            {hasMore && !loading && feedWithThumbs.length > 0 && (
              <div className="flex justify-center mt-8">
                <motion.button onClick={() => loadFeed()}
                  className="px-8 py-3 rounded-2xl font-bold uppercase tracking-widest"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(139,92,246,0.6)', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(139,92,246,0.1)' }}>
                  Reveal More Visions
                </motion.button>
              </div>
            )}
            {loading && feedWithThumbs.length > 0 && (
              <div className="flex justify-center py-8">
                <motion.div className="w-5 h-5 border-2 rounded-full"
                  style={{ borderColor: 'rgba(139,92,246,0.5) transparent transparent transparent' }}
                  animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discovery Lightbox */}
      <AnimatePresence>
        {lightboxItem && (
          <DiscoverLightbox
            item={lightboxItem.item}
            imgIdx={lightboxItem.imgIdx}
            onClose={() => setLightboxItem(null)}
            onClone={() => cloneItem(lightboxItem.item)}
            onImgChange={(idx) => setLightboxItem(prev => prev ? { ...prev, imgIdx: idx } : null)}
            getThumb={getThumb}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DiscoverLightbox({ item, imgIdx, onClose, onClone, onImgChange, getThumb }: {
  item: GalleryItem;
  imgIdx: number;
  onClose: () => void;
  onClone: () => void;
  onImgChange: (i: number) => void;
  getThumb: (item: GalleryItem) => string | null;
}) {
  const accent = item.realm === 'day' ? '#10b981' : '#8b5cf6';
  const visImgs = (item.images ?? []).filter(img => img.status !== 'hidden' && img.status !== 'deleting');
  const currentUrl = proxyImg(visImgs[imgIdx]?.r2_url ?? visImgs[imgIdx]?.url) ?? getThumb(item);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && imgIdx > 0) onImgChange(imgIdx - 1);
      if (e.key === 'ArrowRight' && imgIdx < visImgs.length - 1) onImgChange(imgIdx + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [imgIdx, visImgs.length, onClose, onImgChange]);

  if (!currentUrl) return null;

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="relative w-full max-w-5xl flex flex-col md:flex-row gap-4"
        initial={{ scale: 0.9, y: 32 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}>

        <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ minHeight: 300, maxHeight: '85vh' }}>
          <img src={currentUrl} className="w-full h-full object-cover" alt="" />
          {(['top-3 left-3 border-t-2 border-l-2','top-3 right-3 border-t-2 border-r-2','bottom-3 left-3 border-b-2 border-l-2','bottom-3 right-3 border-b-2 border-r-2'] as const).map((cls, ci) => (
            <div key={ci} className={`absolute w-6 h-6 pointer-events-none ${cls}`} style={{ borderColor: accent }} />
          ))}
          {imgIdx > 0 && (
            <button className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
              onClick={() => onImgChange(imgIdx - 1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          {imgIdx < visImgs.length - 1 && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
              onClick={() => onImgChange(imgIdx + 1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )}
          {visImgs.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {visImgs.map((_, i) => (
                <button key={i} onClick={() => onImgChange(i)} className="rounded-full transition-all"
                  style={{ width: i === imgIdx ? 20 : 6, height: 6, background: i === imgIdx ? accent : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          )}
        </div>

        <div className="md:w-64 flex-shrink-0 flex flex-col gap-3" style={{ maxHeight: '85vh' }}>
          <div className="flex justify-end">
            <button className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              onClick={onClose}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 rounded-2xl p-5 overflow-y-auto"
            style={{ background: 'rgba(8,12,24,0.96)', border: `1px solid ${accent}28` }}>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
              style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: accent, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                {item.realm === 'star' ? 'Star Realm' : 'Day Realm'}
              </span>
            </div>

            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.95rem', color: '#F6E3BA', fontWeight: 700, letterSpacing: '0.1em' }}>
              {item.model ?? 'Unknown Engine'}
            </h2>

            {item.user_name && (
              <div className="flex items-center gap-2 mt-3">
                {item.user_picture ? (
                  <img src={item.user_picture} className="w-6 h-6 rounded-full" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: `${accent}25`, border: `1px solid ${accent}44` }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: accent, fontWeight: 700 }}>
                      {item.user_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                )}
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', color: accent }}>{item.user_name}</span>
              </div>
            )}

            {item.created_at && (
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>
                {new Date(item.created_at).toLocaleString()}
              </p>
            )}

            {item.prompt && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 6 }}>The Incantation</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(248,250,252,0.52)', lineHeight: 1.7, fontStyle: 'italic' }}>"{item.prompt}"</p>
              </div>
            )}
          </div>

          <div className="space-y-2 flex-shrink-0">
            {item.prompt && (
              <motion.button onClick={onClone}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold uppercase tracking-widest text-white"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 0 24px rgba(139,92,246,0.4)' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                Clone Incantation
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
