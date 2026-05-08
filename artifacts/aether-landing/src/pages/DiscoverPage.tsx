import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { PromptCard } from '../components/PromptCard';
import { apiFetch, social } from '../lib/api';
import { extractTags, getThumb } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useLocalStore } from '../hooks/useLocalStore';

const REALMS = [
  { id: 'all',  label: 'Explore All', icon: '🌌' },
  { id: 'day',  label: 'Radiant Day', icon: '☀️' },
  { id: 'star', label: 'Midnight Star', icon: '✨' },
];

const ACTIVE_REALM: Record<string, { title: string; desc: string; img: string; color: string; glow: string }> = {
  all: {
    title: 'The Unified Aether',
    desc: 'The complete stream of all manifestations. A confluence of every soul’s imagination, unfiltered and infinite.',
    img: `${import.meta.env.BASE_URL}assets/archetypes/day.png`,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.4)'
  },
  day: {
    title: 'The Radiant Arcanist',
    desc: 'The realm of pure creation and heroic light. High-fantasy visions of magic, nature, and sacred chronicles. (SFW)',
    img: `${import.meta.env.BASE_URL}assets/archetypes/day.png`,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.35)'
  },
  star: {
    title: 'The Midnight Weaver',
    desc: 'The alluring realm of shadows and celestial mysteries. For those who seek the deeper, provocative secrets of the night. (NSFW)',
    img: `${import.meta.env.BASE_URL}assets/archetypes/star.png`,
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.35)'
  }
};

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
  likes_count?: number;
}

interface GalleryResponse {
  items: GalleryItem[];
  has_more: boolean;
  next_cursor: number | null;
}

type DiscoverTab = 'explore' | 'trending' | 'following';

interface RealmCardProps {
  active: boolean;
  onClick: () => void;
  img: string;
  name: string;
  role: string;
  accent: string;
  glow: string;
  lore: string;
}

function RealmCard({ active, onClick, img, name, role, accent, glow, lore }: RealmCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className="group relative flex-shrink-0 w-64 h-80 rounded-3xl overflow-hidden cursor-pointer"
      style={{
        background: 'rgba(10,15,30,0.4)',
        border: `1px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
        boxShadow: active ? `0 0 40px ${glow}` : 'none',
        isolation: 'isolate'
      }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 z-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 100%, ${accent}25, transparent 70%)`,
          opacity: active ? 1 : 0
        }} />
      
      <img src={img} alt={name} className="relative z-10 w-full h-full object-contain object-bottom pt-8 transition-all duration-500"
        style={{ 
          opacity: active ? 1 : 0.4, 
          transform: active ? 'scale(1.12)' : 'scale(1.05)',
          mixBlendMode: 'screen',
          maskImage: 'linear-gradient(to top, transparent 5%, black 35%)',
          WebkitMaskImage: 'linear-gradient(to top, transparent 5%, black 35%)'
        }} />

      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pt-12"
        style={{ background: 'linear-gradient(to top, rgba(8,12,24,0.95), transparent)' }}>
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: active ? accent : 'rgba(255,255,255,0.3)' }}>{role}</div>
        <div className="text-sm font-bold uppercase tracking-widest mb-2" style={{ fontFamily: 'Cinzel, serif', color: '#fff' }}>{name}</div>
        <AnimatePresence>
          {active && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}
            >
              {lore}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function DiscoverPage() {
  const { user } = useAuth();
  const { getFollowing, unfollowUser, getRatingsSortable } = useLocalStore();
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
  
  const char = ACTIVE_REALM[realmFilter] || ACTIVE_REALM.all;
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadFeed = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    
    // Abort previous request if resetting
    if (reset && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const data = await social.getPublicGallery({
        limit: 24,
        before: reset ? undefined : (cursor ? String(cursor) : undefined),
        realm: realmFilter === 'all' ? undefined : realmFilter,
        search: searchQuery.trim() || undefined,
        sort: tab === 'trending' ? 'trending' : 'newest',
        following_only: tab === 'following',
        signal: controller.signal
      });
      
      if (controller.signal.aborted) return;

      const items = (data.items ?? []).filter((item: any) => {
        const imgs = item.images ?? [];
        return imgs.some((img: any) => img.status !== 'hidden' && img.status !== 'deleting');
      });

      setFeed(prev => {
        const merged = reset ? items : [...prev, ...items];
        const seen = new Set<string>();
        return merged.filter(it => seen.has(it.request_id) ? false : (seen.add(it.request_id), true));
      });
      setHasMore(data.has_more ?? false);
      setCursor(data.next_cursor ?? null);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Gallery load failed:', e);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [cursor, loading, realmFilter, searchQuery, tab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFeed([]);
      setCursor(null);
      setHasMore(true);
      loadFeed(true);
    }, searchQuery ? 500 : 0);
    return () => clearTimeout(timer);
  }, [tab, realmFilter, searchQuery]);

  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadFeed();
    }, { rootMargin: '400px' });
    if (loaderRef.current) io.observe(loaderRef.current);
    return () => io.disconnect();
  }, [hasMore, loading, loadFeed]);

  const filteredFeed = useMemo(() => {
    let list = feed;
    
    // Backend now handles 'following' filter if tab === 'following'
    // but we can still keep frontend filter as a secondary check if needed
    // though it's better to trust the backend.

    return list
      .filter(item => getThumb(item))
      .filter(item => !tagFilter || (item.prompt ?? '').toLowerCase().includes(tagFilter));
  }, [feed, tagFilter]);

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
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', color: '#fff', fontWeight: 700 }}>
              The <span style={{ color: '#8b5cf6' }}>Aether</span> Hub
            </h1>
            <p className="mt-2 uppercase tracking-widest" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(248,250,252,0.3)' }}>
              Unified Vision Stream &bull; discovery &bull; social &bull; forge
            </p>
          </motion.div>

          <div className="relative flex flex-wrap justify-center gap-6 md:gap-10 mb-8 px-4">
            {[REALMS[1], REALMS[2]].map((r) => {
              const data = ACTIVE_REALM[r.id];
              const isActive = realmFilter === r.id;
              return (
                <RealmCard
                  key={r.id}
                  active={isActive}
                  onClick={() => setRealmFilter(r.id)}
                  img={data.img}
                  name={data.title}
                  role={r.id === 'day' ? 'SFW • Radiant Light' : 'NSFW • Alluring Dark'}
                  accent={data.color}
                  glow={`${data.color}40`}
                  lore={data.desc}
                />
              );
            })}
          </div>
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
                    <PromptCard item={item} baseLikes={item.likes_count ?? 0} />
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
