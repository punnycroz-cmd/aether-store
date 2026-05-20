import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SiteNav } from '../components/SiteNav';
import { useAuth } from '../hooks/useAuth';
import { MasonryGrid } from '../components/MasonryGrid';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { apiFetch } from '../lib/api';
import { proxyImg } from '../lib/utils';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../components/ui/alert-dialog';

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
  const [isSharing, setIsSharing] = useState(false);
  const [lightboxEntry, setLightboxEntry] = useState<{ entry: VaultEntry; imgIdx: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  // ── Improvement #1 & #2: Archive with toast ──
  async function hideBatch(requestId: string) {
    await apiFetch(`/history/batch/${requestId}/hide`, { method: 'POST' }).catch(() => {});
    setEntries(prev => prev.map(e => e.request_id === requestId ? { ...e, is_hidden: true } : e));
    if (lightboxEntry?.entry.request_id === requestId) setLightboxEntry(null);
    toast.success('Vision archived to the sealed vault');
  }

  async function showBatch(requestId: string) {
    await apiFetch(`/history/batch/${requestId}/show`, { method: 'POST' }).catch(() => {});
    setEntries(prev => prev.map(e => e.request_id === requestId ? { ...e, is_hidden: false } : e));
    toast.success('Vision restored to the main grid');
  }

  // ── Improvement #4: Glassmorphic delete (no more confirm()) ──
  async function confirmDeleteBatch() {
    if (!deleteTarget) return;
    const requestId = deleteTarget;
    setDeleteTarget(null);
    await apiFetch(`/history/batch/${requestId}`, { method: 'DELETE' }).catch(() => {});
    setEntries(prev => prev.filter(e => e.request_id !== requestId));
    if (lightboxEntry?.entry.request_id === requestId) setLightboxEntry(null);
    toast.success('Vision dissolved into the void');
  }

  // ── Improvement #2: Optimistic share toggle with toast ──
  async function togglePublic(entry: VaultEntry) {
    if (isSharing) return;
    setIsSharing(true);

    const nextIsPublic = !entry.is_public;

    // Optimistic update
    setEntries(prev => prev.map(e => e.request_id === entry.request_id ? { ...e, is_public: nextIsPublic } : e));
    if (lightboxEntry?.entry.request_id === entry.request_id) {
      setLightboxEntry(prev => prev ? { ...prev, entry: { ...prev.entry, is_public: nextIsPublic } } : null);
    }
    toast.success(nextIsPublic ? 'Vision cast onto the Discovery Stream' : 'Vision withdrawn to private vault');

    try {
      await apiFetch(`/history/batch/${entry.request_id}/public`, {
        method: 'POST',
        body: JSON.stringify({ is_public: nextIsPublic }),
      });
    } catch (e) {
      // Rollback
      setEntries(prev => prev.map(e2 => e2.request_id === entry.request_id ? { ...e2, is_public: !nextIsPublic } : e2));
      if (lightboxEntry?.entry.request_id === entry.request_id) {
        setLightboxEntry(prev => prev ? { ...prev, entry: { ...prev.entry, is_public: !nextIsPublic } } : null);
      }
      toast.error('The Aether network rejected the manifestation. Please try again.');
      console.error('Failed to toggle public:', e);
    } finally {
      setIsSharing(false);
    }
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

              {/* Grid */}
              <MasonryGrid>
                  {visible.map((entry, i) => {
                    const col = entry.realm === 'day' ? dayAccent : starAccent;
                    const visImgs = entry.images.filter(img => showHidden || (img.status !== 'hidden' && img.status !== 'deleting'));
                    const thumb = proxyImg(visImgs[0]?.r2_url ?? visImgs[0]?.url ?? null);
                    if (!thumb) return null;
                    return (
                      <motion.div key={entry.request_id}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.04 }}
                        className="break-inside-avoid w-full relative rounded-2xl overflow-hidden cursor-pointer group"
                        style={{ border: `1px solid ${col}28` }}
                        onClick={() => !entry.is_hidden && setLightboxEntry({ entry, imgIdx: 0 })}
                        whileHover={!entry.is_hidden ? { scale: 1.02, boxShadow: `0 0 36px ${col}28` } : {}}>

                        <img src={thumb} className="w-full h-auto block transition-transform duration-700 group-hover:scale-105" alt="" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,8,20,0.85) 0%, transparent 50%)' }} />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-250"
                          style={{ background: `linear-gradient(160deg,${col}0a,rgba(0,0,0,0.4))` }} />

                        {/* ── Improvement #1: Archived Shield Overlay ── */}
                        {entry.is_hidden && (
                          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                            <span className="text-xs tracking-widest uppercase font-semibold px-3 py-1 rounded-full border shadow-lg backdrop-blur-md"
                              style={{ fontFamily: 'Cinzel, serif', color: 'rgba(246,196,67,0.8)', background: 'rgba(120,80,20,0.25)', borderColor: 'rgba(246,196,67,0.2)' }}>
                              Archived Seal
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); showBatch(entry.request_id); }}
                              className="mt-3 text-[11px] underline transition-colors hover:text-white"
                              style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.4)' }}>
                              Restore to Main Grid
                            </button>
                          </div>
                        )}

                        {/* Realm badge */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full"
                          style={{ background: `${col}22`, border: `1px solid ${col}44` }}>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: col, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                            {entry.realm === 'day' ? 'Day' : 'Star'}
                          </span>
                        </div>

                        {entry.is_public && !entry.is_hidden && (
                          <div className="absolute top-3 right-14 px-2 py-1 rounded-full"
                            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Shared</span>
                          </div>
                        )}

                        {/* Action buttons (only when not hidden) */}
                        {!entry.is_hidden && (
                          <div className="absolute top-3 right-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                            <button onClick={(e) => { e.stopPropagation(); hideBatch(entry.request_id); }}
                              className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.25)' }}
                              title="Archive">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                          </div>
                        )}

                        {/* ── Improvement #3: Multi-image strip with isolated hitbox ── */}
                        {visImgs.length > 1 && !entry.is_hidden && (
                          <div className="absolute bottom-12 left-3 flex gap-2 z-30">
                            {visImgs.slice(1, 4).map((img, ii) => (
                              <button key={ii}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxEntry({ entry, imgIdx: ii + 1 }); }}
                                className="relative w-10 h-10 rounded-lg overflow-hidden border transition-all duration-200 hover:scale-105 active:scale-95 hover:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500 p-0"
                                style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                <img src={proxyImg(img.r2_url ?? img.url) ?? undefined} className="w-full h-full object-cover" alt="" />
                              </button>
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

                {visible.length === 0 && !loading && (
                  <div className="text-center py-24" style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.15em' }}>The Grimoire is empty</p>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.1)', marginTop: 8, letterSpacing: '0.1em' }}>No visions match this realm filter</p>
                  </div>
                )}
              </MasonryGrid>

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

      {/* Vault Lightbox – Improvement #6 & #7 */}
      <AnimatePresence>
        {lightboxEntry && (
          <VaultLightbox
            entry={lightboxEntry.entry}
            imgIdx={lightboxEntry.imgIdx}
            showHidden={showHidden}
            onClose={() => setLightboxEntry(null)}
            onHide={() => hideBatch(lightboxEntry.entry.request_id)}
            onSetDeleteTarget={() => setDeleteTarget(lightboxEntry.entry.request_id)}
            onTogglePublic={() => togglePublic(lightboxEntry.entry)}
            isSharing={isSharing}
            onImgChange={(idx) => setLightboxEntry(prev => prev ? { ...prev, imgIdx: idx } : null)}
            visibleEntries={visible}
            onNavigateEntry={(e, idx) => setLightboxEntry({ entry: e, imgIdx: idx })}
          />
        )}
      </AnimatePresence>

      {/* ── Improvement #4: Glassmorphic Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-neutral-950/80 backdrop-blur-xl border border-white/10 rounded-2xl max-w-md shadow-2xl shadow-black/80">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }} className="text-xl text-white">
              Banish Vision to Void?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'Outfit, sans-serif' }} className="text-neutral-400 text-sm leading-relaxed">
              This operation permanently dissolves the manifestation. The composition cannot be restored once forgotten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="bg-transparent border border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white rounded-xl">
              Maintain Echo
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBatch}
              className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-200 rounded-xl shadow-lg shadow-red-950/20"
            >
              Banish Manifestation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VaultLightbox — Improvements #5, #6, #7 applied
   ═══════════════════════════════════════════════════════════════ */
function VaultLightbox({ entry, imgIdx, showHidden, isSharing, onClose, onHide, onSetDeleteTarget, onTogglePublic, onImgChange, visibleEntries, onNavigateEntry }: {
  entry: VaultEntry;
  imgIdx: number;
  showHidden: boolean;
  isSharing: boolean;
  onClose: () => void;
  onHide: () => void;
  onSetDeleteTarget: () => void;
  onTogglePublic: () => void;
  onImgChange: (i: number) => void;
  visibleEntries: VaultEntry[];
  onNavigateEntry: (entry: VaultEntry, imgIdx: number) => void;
}) {
  const accent = entry.realm === 'day' ? '#10b981' : '#8b5cf6';
  const visImgs = entry.images.filter(img => showHidden || (img.status !== 'hidden' && img.status !== 'deleting'));
  const currentUrl = proxyImg(visImgs[imgIdx]?.r2_url ?? visImgs[imgIdx]?.url ?? null);

  const feedIdx = visibleEntries.findIndex(ve => ve.request_id === entry.request_id);
  const isFirstInFeed = feedIdx <= 0 && imgIdx === 0;
  const isLastInFeed = feedIdx >= visibleEntries.length - 1 && imgIdx >= visImgs.length - 1;

  // ── Improvement #6: Feed-aware keyboard navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        if (imgIdx < visImgs.length - 1) {
          onImgChange(imgIdx + 1);
        } else if (feedIdx >= 0 && feedIdx < visibleEntries.length - 1) {
          onNavigateEntry(visibleEntries[feedIdx + 1], 0);
        }
      }
      if (e.key === 'ArrowLeft') {
        if (imgIdx > 0) {
          onImgChange(imgIdx - 1);
        } else if (feedIdx > 0) {
          const prevEntry = visibleEntries[feedIdx - 1];
          const prevImgs = prevEntry.images.filter(img => showHidden || (img.status !== 'hidden' && img.status !== 'deleting'));
          onNavigateEntry(prevEntry, Math.max(0, prevImgs.length - 1));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [imgIdx, visImgs.length, onClose, onImgChange, feedIdx, visibleEntries, onNavigateEntry, showHidden]);

  // ── Improvement #5: Blob download engine ──
  async function triggerDownload() {
    if (!currentUrl) return;
    try {
      toast.info('Extracting vision blueprint...');
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const localBlobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localBlobUrl;
      a.download = `Aether_${entry.request_id}_${imgIdx}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(localBlobUrl);
      toast.success('Vision blueprint extracted');
    } catch {
      toast.error('Download blocked by cross-origin security walls.');
    }
  }

  if (!currentUrl) return null;

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className="relative w-full max-w-6xl flex flex-col lg:flex-row gap-4"
        initial={{ scale: 0.9, y: 32 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}>

        {/* ── Improvement #7: Left Panel — Image + Prompt Tray ── */}
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          {/* Image viewport */}
          <div className="flex-1 min-h-0 relative rounded-lg flex items-center justify-center">
            <img src={currentUrl} className="max-w-full max-h-[70vh] lg:max-h-[72vh] object-contain rounded-md shadow-2xl" alt="" />

            {/* Corner ornaments */}
            {(['top-0 left-0 border-t-2 border-l-2 rounded-tl-lg','top-0 right-0 border-t-2 border-r-2 rounded-tr-lg','bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg','bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg'] as const).map((cls, ci) => (
              <div key={ci} className={`absolute w-6 h-6 pointer-events-none ${cls}`} style={{ borderColor: accent }} />
            ))}

            {/* Left arrow (feed-aware) */}
            {!isFirstInFeed && (
              <button className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
                onClick={() => {
                  if (imgIdx > 0) { onImgChange(imgIdx - 1); }
                  else if (feedIdx > 0) {
                    const prevEntry = visibleEntries[feedIdx - 1];
                    const prevImgs = prevEntry.images.filter(img => showHidden || (img.status !== 'hidden' && img.status !== 'deleting'));
                    onNavigateEntry(prevEntry, Math.max(0, prevImgs.length - 1));
                  }
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}

            {/* Right arrow (feed-aware) */}
            {!isLastInFeed && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
                onClick={() => {
                  if (imgIdx < visImgs.length - 1) { onImgChange(imgIdx + 1); }
                  else if (feedIdx < visibleEntries.length - 1) {
                    onNavigateEntry(visibleEntries[feedIdx + 1], 0);
                  }
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            )}

            {/* Variant dots */}
            {visImgs.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {visImgs.map((_, i) => (
                  <button key={i} onClick={() => onImgChange(i)} className="rounded-full transition-all"
                    style={{ width: i === imgIdx ? 20 : 6, height: 6, background: i === imgIdx ? accent : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            )}
          </div>

          {/* Prompt Tray (wide, below image) */}
          {entry.prompt && (
            <div className="rounded-2xl p-5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(139,92,246,0.7)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 8, fontWeight: 600 }}>
                The Incantation Blueprint
              </p>
              <p className="pr-2" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', color: 'rgba(248,250,252,0.6)', lineHeight: 1.7, fontStyle: 'italic', maxHeight: '6rem', overflowY: 'auto' }}>
                "{entry.prompt}"
              </p>
            </div>
          )}
        </div>

        {/* ── Improvement #7: Right Sidebar — Metadata + Actions ── */}
        <div className="lg:w-72 flex-shrink-0 flex flex-col gap-3" style={{ maxHeight: '90vh' }}>
          {/* Close */}
          <div className="flex justify-end">
            <button className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              onClick={onClose}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Metadata Panel (structured data only — prompt moved to tray) */}
          <div className="flex-1 rounded-2xl p-5 overflow-y-auto" style={{ background: 'rgba(8,12,24,0.96)', border: `1px solid ${accent}28`, boxShadow: `0 0 32px ${accent}18` }}>
            {/* Realm badge */}
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

            {/* Manifestation Analytics */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 10 }}>
                Manifestation Analytics
              </p>
              <div className="flex flex-col gap-2.5">
                {entry.aspect && (
                  <div className="flex justify-between text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>Aether Aspect</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: '0.7rem' }}>{entry.aspect}</span>
                  </div>
                )}
                {entry.quality && (
                  <div className="flex justify-between text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>Quality Tier</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: '0.7rem' }}>{entry.quality}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Variants</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: '0.7rem' }}>{visImgs.length}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Status</span>
                  <span style={{ color: entry.is_public ? '#10b981' : 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    {entry.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>

            {/* Feed position indicator */}
            {visibleEntries.length > 1 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textAlign: 'center' }}>
                  {feedIdx + 1} / {visibleEntries.length} in grid · variant {imgIdx + 1} / {visImgs.length}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 flex-shrink-0">
            <motion.button onClick={onTogglePublic} disabled={isSharing}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 font-bold uppercase tracking-widest"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.62rem',
                background: isSharing ? 'rgba(255,255,255,0.02)' : (entry.is_public ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)'),
                border: `1px solid ${isSharing ? 'rgba(255,255,255,0.1)' : (entry.is_public ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)')}`,
                color: isSharing ? 'rgba(255,255,255,0.2)' : (entry.is_public ? '#10b981' : 'rgba(255,255,255,0.6)'),
                cursor: isSharing ? 'not-allowed' : 'pointer'
              }}
              whileHover={!isSharing ? { scale: 1.02 } : {}} whileTap={!isSharing ? { scale: 0.97 } : {}}>
              {isSharing ? (
                <>
                  <motion.div className="w-3 h-3 border-2 rounded-full" style={{ borderColor: 'rgba(255,255,255,0.4) transparent transparent transparent' }} animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
                  Updating...
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {entry.is_public ? 'Unshare from Discovery' : 'Share to Discovery'}
                </>
              )}
            </motion.button>

            {/* ── Improvement #5: Blob download button ── */}
            <button onClick={triggerDownload}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold uppercase tracking-widest transition-all hover:bg-white/[0.06]"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Vision
            </button>

            <button onClick={() => { onHide(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold uppercase tracking-widest transition-all hover:bg-white/[0.06]"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              Archive Vision
            </button>

            <button onClick={() => { onSetDeleteTarget(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold uppercase tracking-widest transition-all hover:bg-red-950/30"
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
