import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { apiFetch } from '../lib/api';
import { extractTags, proxyImg } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useLocalStore } from '../hooks/useLocalStore';

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

type DiscoverTab = 'explore' | 'trending' | 'following';

export function DiscoverPage() {
  const { user } = useAuth();
  const { getFollowing, unfollowUser } = useLocalStore();
  const [activeChar, setActiveChar] = useState(0);
  const [tab, setTab] = useState<DiscoverTab>('explore');
  const [feed, setFeed] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [lightboxItem, setLightboxItem] = useState<{ item: GalleryItem; imgIdx: number } | null>(null);
  const [cloneToast, setCloneToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [realmFilter, setRealmFilter] = useState<'all' | 'day' | 'star'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const loaderRef = useRef<HTMLDivElement>(null);
  
  const char = CHARS[activeChar];
  const following = getFollowing();

  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of feed) {
      for (const tag of extractTags(item.prompt)) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag, count]) => ({ tag, count }));
  }, [feed]);

  const loadFeed = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '24' });
      const cur = reset ? null : cursor;
      if (cur) params.set('before', String(cur));
      
      // If trending, we might want a different endpoint later, for now we shuffle
      const data = await apiFetch<GalleryResponse>(`/public-gallery?${params}`);
      const items = (data.items ?? []).filter(item => {
        const imgs = item.images ?? [];
        return imgs.some(img => img.status !== 'hidden' && img.status !== 'deleting');
      });

      setFeed(prev => {
        const merged = reset ? items : [...prev, ...items];
        // Deduplicate
        const seen = new Set<string>();
        return merged.filter(it => seen.has(it.request_id) ? false : (seen.add(it.request_id), true));
      });
      setHasMore(data.has_more ?? false);
      setCursor(data.next_cursor ?? null);
    } catch (e) {
      console.error('Gallery load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // Reset and load when tab changes
  useEffect(() => {
    setFeed([]);
    setCursor(null);
    setHasMore(true);
    loadFeed(true);
  }, [tab]);

  // Infinite Scroll Observer
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadFeed();
    }, { rootMargin: '400px' });
    if (loaderRef.current) io.observe(loaderRef.current);
    return () => io.disconnect();
  }, [hasMore, loading, loadFeed]);

  function cloneItem(item: GalleryItem) {
    if (item.prompt) sessionStorage.setItem('forgePrompt', item.prompt);
    setCloneToast(item.prompt?.slice(0, 40) ?? 'vision');
    setTimeout(() => { setCloneToast(null); navigate('/forge'); }, 900);
  }

  function getThumbUrl(item: GalleryItem): string | null {
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

  const filteredFeed = useMemo(() => {
    let list = feed;
    
    // Tab filtering
    if (tab === 'following') {
      list = list.filter(it => following.includes(it.user_name ?? ''));
    } else if (tab === 'trending') {
      // Fake trending sort for now
      list = [...list].sort((a, b) => (b.image_id_seq ?? 0) % 50 - (a.image_id_seq ?? 0) % 50);
    }

    return list
      .filter(item => getThumbUrl(item))
      .filter(item => realmFilter === 'all' || item.realm === realmFilter)
      .filter(item => !searchQuery.trim() || (item.prompt ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (item.user_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(item => !tagFilter || (item.prompt ?? '').toLowerCase().includes(tagFilter));
  }, [feed, tab, following, realmFilter, searchQuery, tagFilter]);

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
        {/* ── HERO SECTION ── */}
        <div className="max-w-7xl mx-auto px-8 py-10">
          <motion.div className="text-center mb-8"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#fff', fontWeight: 700 }}>
              The <span style={{ color: '#8b5cf6' }}>Aether</span> Gallery
            </h1>
            <p className="mt-2 uppercase tracking-widest" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(248,250,252,0.3)' }}>
              Explore communal visions &bull; forge your own fate
            </p>
          </motion.div>

          <div className="flex items-end justify-center gap-2 mb-10 overflow-x-auto pb-4 px-4 no-scrollbar">
            {CHARS.map((c, i) => {
              const active = activeChar === i;
              return (
                <motion.div key={c.name} onClick={() => setActiveChar(i)}
                  className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    width: active ? 'clamp(140px, 15vw, 200px)' : 'clamp(90px, 10vw, 130px)',
                    aspectRatio: '3/4',
                    border: `${active ? 2 : 1}px solid ${active ? c.accent : c.accent + '33'}`,
                    boxShadow: active ? `0 0 32px ${c.glow}` : 'none',
                    background: 'linear-gradient(160deg,rgba(10,15,30,0.95),rgba(5,8,18,0.98))',
                    transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1), border 0.4s',
                  }}>
                  <img src={`${import.meta.env.BASE_URL}assets/${c.img}`} alt={c.name}
                    className="relative z-10 w-full h-full object-contain object-bottom transition-opacity duration-500" 
                    style={{ padding: '6% 8% 0', opacity: active ? 1 : 0.4 }} />
                  <div className="absolute bottom-3 left-0 right-0 z-30 text-center">
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: active ? '0.65rem' : '0.5rem', color: active ? c.accent : 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>
                      {c.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div key={activeChar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto text-center mb-4 px-4">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', color: 'rgba(248,250,252,0.45)', lineHeight: 1.6 }}>
              {char.lore}
            </p>
          </motion.div>
        </div>

        {/* ── UNIFIED GALLERY SECTION ── */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(139,92,246,0.08)' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            
            {/* Top Row: Main Tabs */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
              <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {(['explore', 'trending', 'following'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="px-6 py-2 rounded-xl text-[0.65rem] font-bold uppercase tracking-widest transition-all duration-300"
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      background: tab === t ? 'rgba(139,92,246,0.15)' : 'transparent',
                      color: tab === t ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                      border: tab === t ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
                    }}>
                    {t}
                    {t === 'following' && following.length > 0 && (
                      <span className="ml-2 opacity-40">({following.length})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search + Realm Filter */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="relative w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Aether..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl outline-none"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
                </div>

                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {(['all','day','star'] as const).map(r => (
                    <button key={r} onClick={() => setRealmFilter(r)}
                      className="px-3 py-1.5 rounded-lg text-[0.6rem] font-bold uppercase tracking-tighter transition-all"
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        background: realmFilter === r ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: realmFilter === r ? '#fff' : 'rgba(255,255,255,0.3)',
                      }}>
                      {r === 'all' ? 'All' : r === 'day' ? 'Day' : 'Star'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sub Row: Trending Widgets / Spotlight */}
            {tab === 'following' && following.length > 0 && (
              <CreatorSpotlight following={following} feed={feed} onUnfollow={unfollowUser} />
            )}

            {/* Tag Cloud */}
            {topTags.length > 0 && tab === 'explore' && (
              <div className="flex flex-wrap items-center gap-2 mb-8 justify-center">
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 8 }}>Trending Tags:</span>
                {topTags.map(({ tag }) => (
                  <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className="px-3 py-1 rounded-full text-[0.62rem] transition-all"
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      background: tagFilter === tag ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${tagFilter === tag ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: tagFilter === tag ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                    }}>
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Masonry Gallery Grid */}
            {filteredFeed.length === 0 && !loading ? (
              <div className="text-center py-32 opacity-20">
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', letterSpacing: '0.2em' }}>No Visions Found</p>
              </div>
            ) : (
              <div className="columns-2 lg:columns-3 xl:columns-4 gap-5">
                {filteredFeed.map((item, i) => {
                  const accent = item.realm === 'day' ? '#10b981' : '#8b5cf6';
                  const thumb = getThumbUrl(item);
                  const initials = getInitials(item.user_name);
                  
                  return (
                    <motion.div key={item.request_id}
                      className="break-inside-avoid mb-5 relative rounded-2xl overflow-hidden cursor-pointer group"
                      style={{ border: `1px solid ${accent}18`, background: '#0a0f1e' }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
                      onClick={() => setLightboxItem({ item, imgIdx: 0 })}>
                      
                      <img src={thumb!} className="w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Clone Button (Hover) */}
                      <button className="absolute top-3 right-3 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"
                        style={{ background: 'rgba(139,92,246,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
                        onClick={(e) => { e.stopPropagation(); cloneItem(item); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 12h14M12 5v14"/></svg>
                      </button>

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <p className="line-clamp-2" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: 10 }}>
                          {item.prompt}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
                            <span style={{ fontSize: '0.45rem', color: accent, fontWeight: 700 }}>{initials}</span>
                          </div>
                          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', flex: 1 }}>{item.user_name}</span>
                          <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>
                            {item.realm === 'day' ? '☀️' : '✨'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={loaderRef} className="h-20 flex items-center justify-center">
              {loading && (
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#8b5cf6 transparent transparent transparent' }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxItem && (
          <DiscoverLightbox
            item={lightboxItem.item}
            imgIdx={lightboxItem.imgIdx}
            onClose={() => setLightboxItem(null)}
            onClone={() => cloneItem(lightboxItem.item)}
            onImgChange={(idx) => setLightboxItem(prev => prev ? { ...prev, imgIdx: idx } : null)}
            getThumbUrl={getThumbUrl}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── HELPER COMPONENTS ──

function CreatorSpotlight({ following, feed, onUnfollow }: { following: string[], feed: GalleryItem[], onUnfollow: (n: string) => void }) {
  const creators = following.map(name => {
    const item = feed.find(it => it.user_name === name);
    return { name, picture: item?.user_picture ?? null };
  });

  return (
    <div className="mb-8 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
      {creators.map(c => (
        <div key={c.name} className="flex flex-col items-center gap-2 flex-shrink-0 group relative">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-purple-500/10 flex items-center justify-center">
            {c.picture ? <img src={c.picture} className="w-full h-full object-cover" /> : <span className="text-purple-400 font-bold">{c.name[0]}</span>}
          </div>
          <span className="text-[0.55rem] text-white/40 uppercase tracking-tighter">{c.name}</span>
          <button onClick={() => onUnfollow(c.name)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-white">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function DiscoverLightbox({ item, imgIdx, onClose, onClone, onImgChange, getThumbUrl }: any) {
  const accent = item.realm === 'day' ? '#10b981' : '#8b5cf6';
  const visImgs = (item.images ?? []).filter((img: any) => img.status !== 'hidden' && img.status !== 'deleting');
  const currentUrl = proxyImg(visImgs[imgIdx]?.r2_url ?? visImgs[imgIdx]?.url) ?? getThumbUrl(item);

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}>
        
        {/* Main Image */}
        <div className="relative max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <img src={currentUrl} className="max-h-[85vh] w-auto object-contain" alt="" />
          
          {/* Controls */}
          <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center border border-white/20 hover:bg-black/60">
             <span className="text-white text-xl">×</span>
          </button>
        </div>

        {/* Info overlay below */}
        <div className="mt-6 text-center max-w-2xl px-6">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>"{item.prompt}"</p>
          <div className="mt-4 flex items-center justify-center gap-4">
             <button onClick={onClone} className="px-6 py-2 rounded-full bg-purple-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-purple-500 transition-colors">
               Clone Manifestation
             </button>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}
