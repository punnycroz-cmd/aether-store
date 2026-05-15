import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiteNav } from '../components/SiteNav';
import { useAuth } from '../hooks/useAuth';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { apiFetch } from '../lib/api';
import { proxyImg } from '../lib/utils';

type Realm = 'all' | 'day' | 'star';

interface VaultImage {
  url?: string;
  r2_url?: string;
  thumbnail_url?: string;
  status: string;
}

interface VaultEntry {
  request_id: string;
  realm: 'day' | 'star';
  prompt: string;
  model: string;
  quality?: string;
  aspect?: string;
  images: VaultImage[];
  is_hidden: boolean;
  is_public?: boolean;
  created_at: string;
  image_id_seq?: number;
}

interface VaultResponse {
  items: VaultEntry[];
  has_more: boolean;
  next_cursor: number | null;
}

const FILTERS: { label: string; value: Realm }[] = [
  { label: 'All Visions', value: 'all' },
  { label: 'Day Realm',   value: 'day' },
  { label: 'Star Realm',  value: 'star' },
];

export function VaultPage() {
  const { user, loading: authLoading, continueAsGuest } = useAuth();
  const [filter, setFilter]       = useState<Realm>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [entries, setEntries]     = useState<VaultEntry[]>([]);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [cursor, setCursor]       = useState<number | null>(null);
  const [lightboxEntry, setLightboxEntry] = useState<{ entry: VaultEntry; imgIdx: number } | null>(null);

  const dayAccent  = '#10b981';
  const starAccent = '#8b5cf6';

  const loadMore = useCallback(async (reset = false) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', include_hidden: String(showHidden) });
      if (filter !== 'all') params.set('realm', filter);
      const cur = reset ? null : cursor;
      if (cur) params.set('before', String(cur));

      const data = await apiFetch<VaultResponse>(`/history?${params}`);
      const items = (data.items ?? []).filter(e =>
        e.images && e.images.some(img => img.status !== 'deleting')
      );

      setEntries(prev => reset ? items : [...prev, ...items]);
      setHasMore(data.has_more ?? false);
      setCursor(data.next_cursor ?? null);
    } catch (e) {
      console.error('Vault load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [user, filter, showHidden, cursor, loading]);

  useEffect(() => {
    if (!user) return;
    setEntries([]);
    setCursor(null);
    setHasMore(true);
    loadMore(true);
  }, [user, filter, showHidden]);

  async function hideBatch(requestId: string) {
    await apiFetch(`/history/batch/${requestId}/hide`, { method: 'POST' }).catch(() => {});
    setEntries(prev => prev.map(e => e.request_id === requestId ? { ...e, is_hidden: true } : e));
    if (lightboxEntry?.entry.request_id === requestId) setLightboxEntry(null);
  }

  async function showBatch(requestId: string) {
    await apiFetch(`/history/batch/${requestId}/show`, { method: 'POST' }).catch(() => {});
    setEntries(prev => prev.map(e => e.request_id === requestId ? { ...e, is_hidden: false } : e));
  }

  async function deleteBatch(requestId: string) {
    if (!confirm('Permanently banish this vision? This cannot be undone.')) return;
    await apiFetch(`/history/batch/${requestId}`, { method: 'DELETE' }).catch(() => {});
    setEntries(prev => prev.filter(e => e.request_id !== requestId));
    if (lightboxEntry?.entry.request_id === requestId) setLightboxEntry(null);
  }

  async function togglePublic(entry: VaultEntry) {
    await apiFetch(`/history/batch/${entry.request_id}/public`, {
      method: 'POST',
      body: JSON.stringify({ is_public: !entry.is_public }),
    }).catch(() => {});
    setEntries(prev => prev.map(e => e.request_id === entry.request_id ? { ...e, is_public: !e.is_public } : e));
  }

  const visible = entries.filter(e => showHidden || !e.is_hidden);
  const hiddenCount = entries.filter(e => e.is_hidden).length;

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div className="min-h-screen" style={{ background: '#080f1c' }}>
      <SiteNav />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(246,227,186,0.06), transparent 55%)',
      }} />

      <div className="pt-[72px]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">

          {/* Header */}
          <motion.div className="text-center mb-10"
            initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#6D542F', fontWeight: 700 }}>
              Your Grimoire
            </h1>
            <p className="mt-3 uppercase tracking-widest" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(246,196,67,0.85)' }}>
              {visible.length} visions preserved · {hiddenCount} archived
            </p>
            <div className="flex items-center justify-center gap-4 mt-5">
              <div style={{ height: 1, width: '8vw', background: 'linear-gradient(90deg,transparent,rgba(246,227,186,0.3))' }} />
              <div style={{ width: 7, height: 7, background: 'rgba(246,196,67,0.55)', transform: 'rotate(45deg)' }} />
              <div style={{ height: 1, width: '8vw', background: 'linear-gradient(270deg,transparent,rgba(246,227,186,0.3))' }} />
            </div>
          </motion.div>

          {/* Not logged in */}
          {!authLoading && !user && (
            <motion.div className="flex flex-col items-center gap-5 py-24"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>
                The Grimoire awaits your presence
              </p>
              <GoogleSignInButton
                theme="filled_black"
                size="large"
                text="signin_with"
                width={280}
              />
              <div className="flex items-center gap-3" style={{ width: 280 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <motion.button onClick={continueAsGuest}
                style={{ width: 280, fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 0', cursor: 'pointer' }}
                whileHover={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.97 }}>
                Browse as Guest
              </motion.button>
            </motion.div>
          )}

          {user && (
            <>
              {/* Filters */}
              <motion.div className="flex items-center justify-between gap-4 mb-10 flex-wrap"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12 }}>
                <div className="flex p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {FILTERS.map((f) => {
                    const on = filter === f.value;
                    const col = f.value === 'star' ? starAccent : f.value === 'day' ? dayAccent : '#F6E3BA';
                    return (
                      <button key={f.value} onClick={() => setFilter(f.value)}
                        className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300"
                        style={{ fontFamily: 'Outfit, sans-serif', background: on ? `${col}1c` : 'transparent', color: on ? col : 'rgba(255,255,255,0.6)', border: on ? `1px solid ${col}44` : '1px solid transparent' }}>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                {hiddenCount > 0 && (
                  <button onClick={() => setShowHidden(s => !s)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: showHidden ? '#F6E3BA' : 'rgba(255,255,255,0.6)', background: showHidden ? 'rgba(246,227,186,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showHidden ? 'rgba(246,227,186,0.3)' : 'rgba(255,255,255,0.12)'}`, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showHidden ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>}
                    </svg>
                    {showHidden ? 'Hide Archived' : `Show Archived (${hiddenCount})`}
                  </button>
                )}
              </motion.div>

              {/* Masonry */}
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
                <AnimatePresence>
                  {visible.map((entry, i) => {
                    const col = entry.realm === 'day' ? dayAccent : starAccent;
                    const visImgs = entry.images.filter(img => showHidden || (img.status !== 'hidden' && img.status !== 'deleting'));
                    const thumb = proxyImg(visImgs[0]?.r2_url ?? visImgs[0]?.url ?? null);
                    if (!thumb) return null;
                    return (
                      <motion.div key={entry.request_id}
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: entry.is_hidden ? 0.35 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        transition={{ duration: 0.5, delay: i * 0.04 }}
                        className="break-inside-avoid mb-5 relative rounded-2xl overflow-hidden cursor-pointer group"
                        style={{ border: `1px solid ${col}28` }}
                        onClick={() => setLightboxEntry({ entry, imgIdx: 0 })}
                        whileHover={!entry.is_hidden ? { scale: 1.02, boxShadow: `0 0 36px ${col}28` } : {}}>

                        <img src={thumb} className="w-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,8,20,0.85) 0%, transparent 50%)' }} />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                          style={{ background: `linear-gradient(160deg,${col}0a,rgba(0,0,0,0.4))` }} />

                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full"
                          style={{ background: `${col}22`, border: `1px solid ${col}44` }}>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: col, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                            {entry.realm === 'day' ? 'Day' : 'Star'}
                          </span>
                        </div>

                        {entry.is_hidden && (
                          <div className="absolute top-3 right-14 px-2 py-1 rounded-full"
                            style={{ background: 'rgba(246,196,67,0.12)', border: '1px solid rgba(246,196,67,0.25)' }}>
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: 'rgba(246,196,67,0.6)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Archived</span>
                          </div>
                        )}
                        {entry.is_public && !entry.is_hidden && (
                          <div className="absolute top-3 right-14 px-2 py-1 rounded-full"
                            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Shared</span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="absolute top-3 right-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                          {entry.is_hidden ? (
                            <button onClick={(e) => { e.stopPropagation(); showBatch(entry.request_id); }}
                              className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.25)' }}
                              title="Unarchive">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); hideBatch(entry.request_id); }}
                              className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.25)' }}
                              title="Archive">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                          )}
                        </div>

                        {/* Multi-image strip */}
                        {visImgs.length > 1 && (
                          <div className="absolute bottom-12 left-3 flex gap-1">
                            {visImgs.slice(1, 4).map((img, ii) => (
                              <div key={ii} className="w-8 h-8 rounded-lg overflow-hidden border border-white/10"
                                onClick={(e) => { e.stopPropagation(); setLightboxEntry({ entry, imgIdx: ii + 1 }); }}>
                                <img src={proxyImg(img.r2_url ?? img.url) ?? undefined} className="w-full h-full object-cover" alt="" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#F6E3BA', fontWeight: 600, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.model || 'Unknown Engine'}
                          </p>
                          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(248,250,252,0.75)', marginTop: 2, letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatDate(entry.created_at)} · {visImgs.length} vision{visImgs.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {visible.length === 0 && !loading && (
                  <div className="col-span-full text-center py-24">
                    <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.15em' }}>The Grimoire is empty</p>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.1)', marginTop: 8, letterSpacing: '0.1em' }}>No visions match this realm filter</p>
                  </div>
                )}
              </div>

              {/* Load more / loading */}
              {loading && (
                <div className="flex justify-center py-10">
                  <motion.div className="w-6 h-6 border-2 rounded-full"
                    style={{ borderColor: 'rgba(246,196,67,0.5) transparent transparent transparent' }}
                    animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                </div>
              )}
              {hasMore && !loading && entries.length > 0 && (
                <div className="flex justify-center mt-8">
                  <motion.button onClick={() => loadMore()}
                    className="px-8 py-3 rounded-lg font-bold uppercase tracking-widest"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', background: 'rgba(246,196,67,0.06)', border: '1px solid rgba(246,196,67,0.25)', color: 'rgba(246,196,67,0.75)', cursor: 'pointer' }}
                    whileHover={{ background: 'rgba(246,196,67,0.1)' }}>
                    Summon More Visions
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Vault Lightbox */}
      <AnimatePresence>
        {lightboxEntry && (
          <VaultLightbox
            entry={lightboxEntry.entry}
            imgIdx={lightboxEntry.imgIdx}
            showHidden={showHidden}
            onClose={() => setLightboxEntry(null)}
            onHide={() => hideBatch(lightboxEntry.entry.request_id)}
            onDelete={() => deleteBatch(lightboxEntry.entry.request_id)}
            onTogglePublic={() => togglePublic(lightboxEntry.entry)}
            onImgChange={(idx) => setLightboxEntry(prev => prev ? { ...prev, imgIdx: idx } : null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VaultLightbox({ entry, imgIdx, showHidden, onClose, onHide, onDelete, onTogglePublic, onImgChange }: {
  entry: VaultEntry;
  imgIdx: number;
  showHidden: boolean;
  onClose: () => void;
  onHide: () => void;
  onDelete: () => void;
  onTogglePublic: () => void;
  onImgChange: (i: number) => void;
}) {
  const accent = entry.realm === 'day' ? '#10b981' : '#8b5cf6';
  const visImgs = entry.images.filter(img => showHidden || (img.status !== 'hidden' && img.status !== 'deleting'));
  const currentUrl = proxyImg(visImgs[imgIdx]?.r2_url ?? visImgs[imgIdx]?.url ?? null);

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
      <motion.div className="relative w-full max-w-5xl flex flex-col lg:flex-row gap-4"
        initial={{ scale: 0.9, y: 32 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}>

        <div className="flex-1 relative rounded-lg overflow-hidden" style={{ minHeight: 300, maxHeight: '85vh' }}>
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

        <div className="lg:w-64 flex-shrink-0 flex flex-col gap-3" style={{ maxHeight: '85vh' }}>
          <div className="flex justify-end">
            <button className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              onClick={onClose}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 rounded-lg p-5 overflow-y-auto"
            style={{ background: 'rgba(8,12,24,0.96)', border: `1px solid ${accent}28` }}>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
              style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: accent, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                {entry.realm === 'star' ? 'Star Realm' : 'Day Realm'}
              </span>
            </div>

            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.95rem', color: '#F6E3BA', fontWeight: 700, letterSpacing: '0.1em', lineHeight: 1.3 }}>
              {entry.model || 'Unknown Engine'}
            </h2>

            {entry.created_at && (
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: 4, letterSpacing: '0.1em' }}>
                {new Date(entry.created_at).toLocaleString()}
              </p>
            )}

            {entry.prompt && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 6 }}>The Incantation</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(248,250,252,0.52)', lineHeight: 1.7, fontStyle: 'italic' }}>"{entry.prompt}"</p>
              </div>
            )}

            {entry.aspect && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 4 }}>Aspect · Quality</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{entry.aspect} · {entry.quality ?? 'Fast'}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 flex-shrink-0">
            <motion.button onClick={onTogglePublic}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold uppercase tracking-widest"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', background: entry.is_public ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${entry.is_public ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`, color: entry.is_public ? '#c4b5fd' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {entry.is_public ? 'Unshare from Discovery' : 'Share to Discovery'}
            </motion.button>
            <a href={currentUrl} download target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold uppercase tracking-widest"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', display: 'flex', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Vision
            </a>
            <button onClick={() => { onHide(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold uppercase tracking-widest"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              Archive Vision
            </button>
            <button onClick={() => { onDelete(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold uppercase tracking-widest"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(248,113,113,0.55)', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              Banish Forever
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
