import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { PromptCard } from '../components/PromptCard';
import { getThumb, proxyImg } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useLocalStore } from '../hooks/useLocalStore';
import { apiFetch } from '../lib/api';
import type { GalleryItem, GalleryResponse } from '../lib/types';

type FeedTab = 'for_you' | 'trending' | 'following';

interface LightboxState { item: GalleryItem; imgIdx: number }

function CreatorSpotlight({ following, feed, onUnfollow }: {
  following: string[];
  feed: GalleryItem[];
  onUnfollow: (name: string) => void;
}) {
  const [, navigate] = useLocation();
  if (following.length === 0) return null;

  const creators = following.map(name => {
    const item = feed.find(it => it.user_name === name);
    return { name, picture: item?.user_picture ?? null };
  });

  return (
    <motion.div
      className="mb-6 rounded-2xl p-4"
      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="flex items-center gap-2 mb-3">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(139,92,246,0.7)' }}>
          Creator Spotlight
        </span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {creators.map((c, i) => (
          <motion.div key={c.name}
            className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => navigate(`/profile/${encodeURIComponent(c.name)}`)}>
            <div className="relative">
              {c.picture ? (
                <img src={c.picture} alt="" className="w-10 h-10 rounded-xl object-cover"
                  style={{ border: '2px solid rgba(139,92,246,0.4)' }} />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '2px solid rgba(139,92,246,0.3)' }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#8b5cf6' }}>{c.name[0].toUpperCase()}</span>
                </div>
              )}
              <motion.button
                onClick={e => { e.stopPropagation(); onUnfollow(c.name); }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                style={{ background: 'rgba(239,68,68,0.7)', border: '1px solid rgba(255,255,255,0.2)', transition: 'opacity 0.2s' }}
                whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </motion.button>
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
              {c.name}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
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

  const medals = ['🥇', '🥈', '🥉'];
  const rankColors = ['#f6c043', '#9ca3af', '#b45309', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)'];

  return (
    <motion.div className="mb-6 rounded-2xl overflow-hidden"
      style={{ background: 'rgba(244,114,182,0.04)', border: '1px solid rgba(244,114,182,0.15)' }}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(244,114,182,0.1)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: '#f472b6', fontSize: '0.85rem' }}>⚡</span>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(244,114,182,0.7)' }}>
            Trending Creators This Week
          </span>
        </div>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>
          By total likes
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {leaderboard.map((c, i) => (
          <motion.div key={c.name}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
            style={{ background: 'transparent' }}
            whileHover={{ background: 'rgba(244,114,182,0.05)' }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.05 }}
            onClick={() => navigate(`/profile/${encodeURIComponent(c.name)}`)}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: i < 3 ? '1rem' : '0.6rem', width: 24, textAlign: 'center', color: rankColors[i] }}>
              {i < 3 ? medals[i] : `#${i + 1}`}
            </span>
            {c.picture ? (
              <img src={c.picture} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                style={{ border: `1px solid ${rankColors[i]}40` }} />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${rankColors[i]}18`, border: `1px solid ${rankColors[i]}35` }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: rankColors[i] }}>{c.name[0].toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)' }}>
                {c.count} vision{c.count !== 1 ? 's' : ''} this week
              </div>
            </div>
            <div className="flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill={rankColors[i]} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: rankColors[i] }}>{c.totalLikes.toLocaleString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function BestOfWeek({ feed, ratings }: { feed: GalleryItem[]; ratings: Record<string, { sum: number; count: number; mine: number }> }) {
  const [, navigate] = useLocation();
  const ratedItems = feed
    .filter(it => ratings[it.request_id]?.count > 0)
    .map(it => ({ item: it, avg: ratings[it.request_id].sum / ratings[it.request_id].count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  if (ratedItems.length === 0) return null;

  return (
    <motion.div className="mb-6 rounded-2xl overflow-hidden"
      style={{ background: 'rgba(246,192,67,0.04)', border: '1px solid rgba(246,192,67,0.15)' }}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(246,192,67,0.1)' }}>
        <span style={{ color: '#f6c043', fontSize: '0.85rem' }}>★</span>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(246,192,67,0.7)' }}>
          Best Rated This Week
        </span>
      </div>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {ratedItems.map(({ item, avg }, i) => {
          const thumb = getThumb(item);
          return (
            <motion.div key={item.request_id}
              className="flex-shrink-0 rounded-xl overflow-hidden cursor-pointer relative group"
              style={{ width: 100, height: 80, background: 'rgba(0,0,0,0.4)' }}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => {}}>
              {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                  <span style={{ color: '#f6c043', fontSize: '0.6rem' }}>★</span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: '#f6c043' }}>{avg.toFixed(1)}</span>
                </div>
              </div>
              {i < 3 && (
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: i === 0 ? '#f6c043' : i === 1 ? '#9ca3af' : '#b45309', fontFamily: 'Cinzel, serif', fontSize: '0.45rem', color: '#0a1120' }}>
                  {i + 1}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function FeedPage() {
  const { user } = useAuth();
  const { getFollowing, unfollowUser, getRatingsSortable } = useLocalStore();
  const [tab, setTab] = useState<FeedTab>('for_you');
  const [feed, setFeed] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const following = getFollowing();
  const ratings = getRatingsSortable();

  const loadFeed = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '24' });
      const cur = reset ? null : cursor;
      if (cur) params.set('before', String(cur));
      const data = await apiFetch<GalleryResponse>(`/public-gallery?${params}`);
      const items = (data.items ?? []).filter(item =>
        (item.images ?? []).some(img => img.status !== 'hidden' && img.status !== 'deleting')
      );
      const sorted = tab === 'trending'
        ? [...items].sort(() => Math.random() - 0.5)
        : items;
      setFeed(prev => {
        const merged = reset ? sorted : [...prev, ...sorted];
        const seen = new Set<string>();
        return merged.filter(it => seen.has(it.request_id) ? false : (seen.add(it.request_id), true));
      });
      setHasMore(data.has_more ?? false);
      setCursor(data.next_cursor ?? null);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [cursor, loading, tab]);

  useEffect(() => {
    setFeed([]);
    setCursor(null);
    setHasMore(true);
    loadFeed(true);
  }, [tab]);

  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) loadFeed();
    }, { rootMargin: '200px' });
    if (loaderRef.current) io.observe(loaderRef.current);
    return () => io.disconnect();
  }, [hasMore, loading, loadFeed]);

  const displayed = tab === 'following'
    ? feed.filter(it => following.includes(it.user_name ?? ''))
    : feed;

  const TABS: { key: FeedTab; label: string; accent: string }[] = [
    { key: 'for_you',  label: 'For You',   accent: '#10b981' },
    { key: 'trending', label: 'Trending',  accent: '#f472b6' },
    { key: 'following',label: 'Following', accent: '#8b5cf6' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#07101c' }}>
      <SiteNav />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 30% at 50% 0%, rgba(16,185,129,0.07), transparent 60%)' }} />

      <div className="pt-[80px] max-w-7xl mx-auto px-4 md:px-8 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between mt-6 mb-6">
          <div>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: '#f8fafc', letterSpacing: '0.1em', marginBottom: 3 }}>
              The Feed
            </h1>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Live visions from the Aether community
            </p>
          </div>
          {user && !user.isGuest && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {user.picture ? (
                <img src={user.picture} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: '#10b981' }}>{(user.name ?? '?')[0]}</span>
                </div>
              )}
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{user.name}</span>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TABS.map(t => (
            <motion.button key={t.key}
              onClick={() => setTab(t.key)}
              className="relative px-5 py-2 rounded-xl"
              style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                background: tab === t.key ? `${t.accent}16` : 'transparent',
                color: tab === t.key ? t.accent : 'rgba(255,255,255,0.3)',
                border: tab === t.key ? `1px solid ${t.accent}40` : '1px solid transparent',
                cursor: 'pointer',
              }}
              whileHover={{ background: tab !== t.key ? 'rgba(255,255,255,0.04)' : undefined }}
              whileTap={{ scale: 0.96 }}>
              {t.label}
              {t.key === 'following' && following.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', fontSize: '0.5rem' }}>
                  {following.length}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Creator Spotlight — only on Following tab */}
        {tab === 'following' && (
          <CreatorSpotlight
            following={following}
            feed={feed}
            onUnfollow={name => unfollowUser(name)}
          />
        )}

        {/* Best of Week — only on For You tab */}
        {tab === 'for_you' && (
          <BestOfWeek feed={feed} ratings={ratings} />
        )}

        {/* Trending Creators — only on Trending tab */}
        {tab === 'trending' && (
          <TrendingCreators feed={feed} />
        )}

        {/* Grid */}
        {tab === 'following' && following.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-3xl mb-4 opacity-30">👥</div>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
              Follow creators to see their visions here
            </p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', marginTop: 8 }}>
              Hover over any creator's name on a card to follow them
            </p>
          </div>
        ) : displayed.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>No visions found</p>
          </div>
        ) : (
          <motion.div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            <AnimatePresence mode="popLayout">
              {displayed.map((item, i) => (
                <motion.div key={item.request_id}
                  layout
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.04, 0.5) }}>
                  <PromptCard item={item} baseLikes={item.image_id_seq ? (item.image_id_seq % 120) : 0} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Loader sentinel */}
        <div ref={loaderRef} className="h-16 flex items-center justify-center mt-4">
          {loading && (
            <motion.div className="flex items-center gap-2">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
              <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
              <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (() => {
          const imgs = lightbox.item.images?.filter(img => img.status !== 'hidden' && img.status !== 'deleting') ?? [];
          const src = proxyImg(imgs[lightbox.imgIdx]?.r2_url ?? imgs[lightbox.imgIdx]?.url) ?? getThumb(lightbox.item);
          return (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}>
              {src && <img src={src} alt="" className="max-w-full max-h-full rounded-2xl object-contain" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }} />}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
