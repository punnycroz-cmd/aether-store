import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { PromptCard } from '../components/PromptCard';
import { apiFetch } from '../lib/api';
import { extractTags, getThumb } from '../lib/utils';
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
  const { getFollowing, unfollowUser, getRatingsSortable } = useLocalStore();
  const [activeChar, setActiveChar] = useState(0);
  const [tab, setTab] = useState<DiscoverTab>('explore');
  const [feed, setFeed] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [realmFilter, setRealmFilter] = useState<'all' | 'day' | 'star'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const loaderRef = useRef<HTMLDivElement>(null);
  
  const char = CHARS[activeChar];
  const following = getFollowing();
  const ratings = getRatingsSortable();

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
      
      const data = await apiFetch<GalleryResponse>(`/public-gallery?${params}`);
      const items = (data.items ?? []).filter(item => {
        const imgs = item.images ?? [];
        return imgs.some(img => img.status !== 'hidden' && img.status !== 'deleting');
      });

      setFeed(prev => {
        const merged = reset ? items : [...prev, ...items];
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

  useEffect(() => {
    setFeed([]);
    setCursor(null);
    setHasMore(true);
    loadFeed(true);
  }, [tab]);

  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadFeed();
    }, { rootMargin: '400px' });
    if (loaderRef.current) io.observe(loaderRef.current);
    return () => io.disconnect();
  }, [hasMore, loading, loadFeed]);

  const filteredFeed = useMemo(() => {
    let list = feed;
    
    if (tab === 'following') {
      list = list.filter(it => following.includes(it.user_name ?? ''));
    } else if (tab === 'trending') {
      list = [...list].sort((a, b) => {
        const rA = ratings[a.request_id]?.sum || 0;
        const rB = ratings[b.request_id]?.sum || 0;
        return rB - rA || (Math.random() - 0.5);
      });
    }

    return list
      .filter(item => getThumb(item))
      .filter(item => realmFilter === 'all' || item.realm === realmFilter)
      .filter(item => !searchQuery.trim() || (item.prompt ?? '').toLowerCase().includes(searchQuery.toLowerCase()) || (item.user_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(item => !tagFilter || (item.prompt ?? '').toLowerCase().includes(tagFilter));
  }, [feed, tab, following, realmFilter, searchQuery, tagFilter, ratings]);

  return (
    <div className="min-h-screen" style={{ background: '#080c1a' }}>
      <SiteNav />

      <div className="fixed inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 70% 55% at 50% 18%, ${char.glow.replace(/[\d.]+\)$/, '0.07)')}, transparent 65%)`,
        transition: 'background 0.8s',
      }} />

      <div className="pt-[72px]">
        {/* ── HERO SECTION ── */}
        <div className="max-w-7xl mx-auto px-8 py-10">
          <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#fff', fontWeight: 700 }}>
              The <span style={{ color: '#8b5cf6' }}>Aether</span> Hub
            </h1>
            <p className="mt-2 uppercase tracking-widest" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(248,250,252,0.3)' }}>
              Unified Vision Stream &bull; discovery &bull; social &bull; forge
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
                  }}>
                  <img src={`${import.meta.env.BASE_URL}assets/${c.img}`} alt={c.name}
                    className="relative z-10 w-full h-full object-contain object-bottom" 
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

          <motion.div key={activeChar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto text-center mb-4 px-4">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', color: 'rgba(248,250,252,0.45)', lineHeight: 1.6 }}>{char.lore}</p>
          </motion.div>
        </div>

        {/* ── UNIFIED GALLERY SECTION ── */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(139,92,246,0.08)' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            
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
                    {t} {t === 'following' && following.length > 0 && <span className="ml-1 opacity-40">({following.length})</span>}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="relative w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search visions..."
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

            {/* Tab-specific Widgets */}
            {tab === 'following' && following.length > 0 && (
              <CreatorSpotlight following={following} feed={feed} onUnfollow={unfollowUser} />
            )}
            
            {tab === 'explore' && feed.length > 0 && (
              <BestOfWeek feed={feed} ratings={ratings} />
            )}

            {tab === 'trending' && feed.length > 0 && (
              <TrendingCreators feed={feed} />
            )}

            {/* Masonry Gallery Grid using PromptCard */}
            {filteredFeed.length === 0 && !loading ? (
              <div className="text-center py-32 opacity-20">
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', letterSpacing: '0.2em' }}>The Void Awaits</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
                {filteredFeed.map((item, i) => (
                  <motion.div key={item.request_id} className="break-inside-avoid mb-5"
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: (i % 8) * 0.05 }}>
                    <PromptCard item={item} baseLikes={item.image_id_seq ? (item.image_id_seq % 120) : 0} />
                  </motion.div>
                ))}
              </div>
            )}

            <div ref={loaderRef} className="h-20 flex items-center justify-center">
              {loading && <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#8b5cf6 transparent transparent transparent' }} />}
            </div>
          </div>
        </div>
      </div>
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

function TrendingCreators({ feed }: { feed: GalleryItem[] }) {
  const [, navigate] = useLocation();
  const leaderboard = Object.values(
    feed.reduce<Record<string, { name: string; picture: string | null; totalLikes: number; count: number }>>((acc, item) => {
      const name = item.user_name;
      if (!name) return acc;
      const likes = item.image_id_seq ? (item.image_id_seq % 120) : 0;
      if (!acc[name]) acc[name] = { name, picture: item.user_picture ?? null, totalLikes: 0, count: 0 };
      acc[name].totalLikes += likes;
      acc[name].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 5);

  if (leaderboard.length === 0) return null;

  return (
    <div className="mb-10 rounded-2xl overflow-hidden border border-pink-500/20 bg-pink-500/5">
      <div className="px-4 py-3 border-b border-pink-500/10 flex items-center justify-between">
         <span className="text-[0.6rem] text-pink-400 uppercase tracking-widest font-bold">⚡ Trending Creators This Week</span>
      </div>
      <div className="flex flex-wrap gap-4 p-4">
        {leaderboard.map((c, i) => (
          <div key={c.name} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${encodeURIComponent(c.name)}`)}>
            <span className="text-xs text-pink-400 font-bold">#{i+1}</span>
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-pink-500/30">
              {c.picture ? <img src={c.picture} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-pink-500/20 flex items-center justify-center text-[0.6rem] text-pink-400">{c.name[0]}</div>}
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] text-white/80 font-bold">{c.name}</span>
              <span className="text-[0.5rem] text-white/30">{c.totalLikes} sparks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BestOfWeek({ feed, ratings }: any) {
  const ratedItems = feed
    .filter((it: any) => ratings[it.request_id]?.count > 0)
    .map((it: any) => ({ item: it, avg: ratings[it.request_id].sum / ratings[it.request_id].count }))
    .sort((a: any, b: any) => b.avg - a.avg)
    .slice(0, 5);

  if (ratedItems.length === 0) return null;

  return (
    <div className="mb-10 rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5">
      <div className="px-4 py-3 border-b border-amber-500/10">
         <span className="text-[0.6rem] text-amber-400 uppercase tracking-widest font-bold">★ Hall of Fame (Weekly)</span>
      </div>
      <div className="flex gap-4 p-4 overflow-x-auto no-scrollbar">
        {ratedItems.map(({ item, avg }: any) => (
          <div key={item.request_id} className="flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border border-amber-500/30 relative">
             <img src={getThumb(item)} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-[0.6rem] text-amber-400 font-bold">{avg.toFixed(1)} ★</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
