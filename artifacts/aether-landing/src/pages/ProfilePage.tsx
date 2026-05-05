import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { useAuth } from '../hooks/useAuth';
import { useLocalStore } from '../hooks/useLocalStore';
import { apiFetch } from '../lib/api';
import { proxyImg } from '../lib/utils';
import type { GalleryItem } from '../lib/types';

type ProfileTab = 'gallery' | 'saved' | 'history' | 'boards' | 'following';

interface VaultEntry {
  request_id: string;
  prompt?: string;
  model?: string;
  realm?: string;
  created_at?: string;
  is_public?: boolean;
  images?: { url?: string; r2_url?: string; thumbnail_url?: string; status?: string }[];
}

export function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    credits, saved, earnCredits, recordStreak, streak,
    boards, createBoard, deleteBoard,
    getFollowing, unfollowUser,
    addNotification,
  } = useLocalStore();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<ProfileTab>('gallery');
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [promptHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aether_prompt_history') ?? '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    if (!user || user.isGuest || tab !== 'gallery') return;
    setLoading(true);
    apiFetch<{ entries: VaultEntry[] }>('/history?limit=30')
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, tab]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07101c' }}>
        <SiteNav />
        <div className="text-center">
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>
            Sign in to view your profile
          </p>
          <motion.button onClick={() => navigate('/forge')}
            className="mt-5 px-6 py-2.5 rounded-xl"
            style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', cursor: 'pointer' }}
            whileHover={{ background: 'rgba(16,185,129,0.2)' }}>
            Go to Forge
          </motion.button>
        </div>
      </div>
    );
  }

  function getThumb(entry: VaultEntry): string | null {
    const imgs = entry.images ?? [];
    const v = imgs.find(i => i.status !== 'hidden' && i.status !== 'deleting');
    return proxyImg(v?.thumbnail_url ?? v?.r2_url ?? v?.url ?? null);
  }

  const publicCount = entries.filter(e => e.is_public).length;
  const savedCount = saved.size;
  const following = getFollowing();

  function handleClaimCredits() {
    earnCredits(25);
    recordStreak();
    addNotification({ type: 'milestone', message: 'Claimed 25 Daily Credits! 🌟' });
  }

  function handleCreateBoard() {
    if (!newBoardName.trim()) return;
    createBoard(newBoardName.trim(), '✨');
    setNewBoardName('');
    setCreatingBoard(false);
  }

  const TABS: { id: ProfileTab; label: string; count?: number }[] = [
    { id: 'gallery',   label: 'Gallery',     count: entries.length },
    { id: 'saved',     label: 'Saved',       count: savedCount },
    { id: 'history',   label: 'Incantations',count: promptHistory.length },
    { id: 'boards',    label: 'Boards',      count: boards.length },
    { id: 'following', label: 'Following',   count: following.length },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#07101c' }}>
      <SiteNav />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 30% at 50% 0%, rgba(16,185,129,0.06), transparent 60%)',
      }} />

      <div className="pt-[80px] max-w-5xl mx-auto px-4 md:px-8 pb-20">

        {/* Profile header */}
        <motion.div className="pt-10 pb-8 flex flex-col md:flex-row items-start md:items-center gap-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Avatar */}
          <div className="relative">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-20 h-20 rounded-2xl object-cover"
                style={{ border: '2px solid rgba(16,185,129,0.4)', boxShadow: '0 0 24px rgba(16,185,129,0.15)' }} />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.35)', boxShadow: '0 0 24px rgba(16,185,129,0.12)' }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '2rem', color: '#10b981' }}>
                  {(user?.name ?? '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2"
              style={{ borderColor: '#07101c' }} />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: '#f8fafc', letterSpacing: '0.1em', marginBottom: 4 }}>
              {user?.name ?? 'Arcanist'}
            </h1>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
              {user?.email}
            </p>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Visions',   value: entries.length },
                { label: 'Public',    value: publicCount },
                { label: 'Saved',     value: savedCount },
                { label: 'Following', value: following.length },
                { label: 'Streak',    value: streak.count, icon: '🔥', color: '#f97316' },
                { label: 'Credits',   value: credits, icon: '★', color: '#f6c043' },
              ].map(s => (
                <div key={s.label} className="text-center px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: s.color ?? '#f8fafc' }}>
                    {s.icon && <span>{s.icon} </span>}{s.value}
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <motion.button onClick={handleClaimCredits}
              className="px-5 py-2 rounded-xl text-center"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(246,192,67,0.08)', border: '1px solid rgba(246,192,67,0.25)', color: 'rgba(246,192,67,0.7)', cursor: 'pointer' }}
              whileHover={{ background: 'rgba(246,192,67,0.15)' }} whileTap={{ scale: 0.96 }}>
              + Claim Daily Credits
            </motion.button>
            <motion.button onClick={async () => { await signOut(); navigate('/'); }}
              className="px-5 py-2 rounded-xl"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
              whileHover={{ background: 'rgba(255,255,255,0.08)' }} whileTap={{ scale: 0.96 }}>
              Sign Out
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 p-1 rounded-xl mb-7"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-200"
              style={{
                fontFamily: 'Outfit, sans-serif',
                background: tab === t.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: tab === t.id ? '#10b981' : 'rgba(255,255,255,0.3)',
                border: tab === t.id ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', background: tab === t.id ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)', color: tab === t.id ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Gallery tab */}
        {tab === 'gallery' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading && (
              <div className="flex justify-center py-12">
                <motion.div className="w-5 h-5 rounded-full border-2"
                  style={{ borderColor: '#10b981 transparent transparent transparent' }}
                  animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              </div>
            )}
            {!loading && entries.length === 0 && (
              <div className="text-center py-16">
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>No visions forged yet</p>
                <motion.button onClick={() => navigate('/forge')}
                  className="mt-4 px-5 py-2 rounded-xl"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(16,185,129,0.18)' }}>
                  Open the Forge
                </motion.button>
              </div>
            )}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {entries.map((entry, i) => {
                const thumb = getThumb(entry);
                return (
                  <motion.div key={entry.request_id}
                    className="relative group rounded-xl overflow-hidden cursor-pointer"
                    style={{ aspectRatio: '1/1', background: 'rgba(0,0,0,0.3)' }}
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => thumb && setLightboxSrc(thumb)}>
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      </div>
                    )}
                    {entry.is_public && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.8)' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Saved tab */}
        {tab === 'saved' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {savedCount === 0 ? (
              <div className="text-center py-16">
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
                  Bookmark visions in the Feed to save them here
                </p>
              </div>
            ) : (
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                {savedCount} saved vision{savedCount !== 1 ? 's' : ''} — view them in the Feed
              </p>
            )}
          </motion.div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {promptHistory.length === 0 ? (
              <div className="text-center py-16">
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
                  No incantations yet — visit the Forge
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {promptHistory.slice(0, 30).map((p, i) => (
                  <motion.div key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl group cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => { sessionStorage.setItem('forgePrompt', p); navigate('/forge'); }}
                    whileHover={{ background: 'rgba(255,255,255,0.06)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(248,250,252,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p}
                    </p>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Boards tab */}
        {tab === 'boards' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-5">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Your Collections
              </p>
              <motion.button onClick={() => setCreatingBoard(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: creatingBoard ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', cursor: 'pointer' }}
                whileHover={{ background: 'rgba(16,185,129,0.18)' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                New Board
              </motion.button>
            </div>

            <AnimatePresence>
              {creatingBoard && (
                <motion.div className="mb-4 p-4 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <input autoFocus value={newBoardName} onChange={e => setNewBoardName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateBoard(); if (e.key === 'Escape') setCreatingBoard(false); }}
                    placeholder="Board name…"
                    className="flex-1 px-3 py-2 rounded-xl outline-none"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc' }}
                  />
                  <motion.button onClick={handleCreateBoard}
                    className="px-3 py-2 rounded-xl"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981', cursor: 'pointer' }}
                    whileHover={{ background: 'rgba(16,185,129,0.3)' }}>
                    Create
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {boards.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-3xl mb-4 opacity-30">✨</div>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
                  No boards yet
                </p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', marginTop: 8 }}>
                  Save visions to boards from any prompt card in the Feed
                </p>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {boards.map((board, i) => (
                  <motion.div key={board.id}
                    className="group relative p-4 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <span style={{ fontSize: '1.5rem' }}>{board.icon}</span>
                      <motion.button
                        onClick={() => deleteBoard(board.id)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.6)', transition: 'opacity 0.2s', cursor: 'pointer' }}
                        whileHover={{ background: 'rgba(239,68,68,0.25)' }} whileTap={{ scale: 0.9 }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </motion.button>
                    </div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', color: 'rgba(248,250,252,0.7)', marginBottom: 4 }}>{board.name}</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)' }}>
                      {board.promptIds.length} item{board.promptIds.length !== 1 ? 's' : ''}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Following tab */}
        {tab === 'following' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {following.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-3xl mb-4 opacity-30">👥</div>
                <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
                  Not following anyone yet
                </p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', marginTop: 8 }}>
                  Hover over any creator's name in the Feed to follow them
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {following.map((name, i) => (
                  <motion.div key={name}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: '#8b5cf6' }}>{name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: 'rgba(248,250,252,0.7)' }}>{name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button onClick={() => navigate(`/profile/${encodeURIComponent(name)}`)}
                        className="px-3 py-1.5 rounded-lg"
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8b5cf6', cursor: 'pointer' }}
                        whileHover={{ background: 'rgba(139,92,246,0.18)' }}>
                        View
                      </motion.button>
                      <motion.button onClick={() => unfollowUser(name)}
                        className="px-3 py-1.5 rounded-lg"
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
                        whileHover={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)' }}>
                        Unfollow
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxSrc(null)}>
            <img src={lightboxSrc} alt="" className="max-w-full max-h-full rounded-2xl object-contain" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
