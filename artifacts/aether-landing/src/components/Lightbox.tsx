import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

export interface LbImage {
  src: string;
  title: string;
  prompt?: string;
  date?: string;
  realm?: 'day' | 'star';
  model?: string;
  creator?: string;
}

interface LightboxProps {
  images: LbImage[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
  onHide?: (i: number) => void;
  onBanish?: (i: number) => void;
}

export function Lightbox({ images, index, onClose, onNavigate, onHide, onBanish }: LightboxProps) {
  const img = images[index];
  const [, navigate] = useLocation();
  const accent = img.realm === 'star' ? '#8b5cf6' : '#10b981';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft'  && index > 0)                 onNavigate(index - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1);
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [index, images.length, onClose, onNavigate]);

  function cloneToForge() {
    if (img.prompt) sessionStorage.setItem('forgePrompt', img.prompt);
    onClose();
    navigate('/forge');
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-6xl flex flex-col md:flex-row gap-4"
          initial={{ scale: 0.9, y: 32 }} animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: '90vh' }}
        >
          {/* ── IMAGE ── */}
          <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ minHeight: 300, maxHeight: '85vh' }}>
            <img
              src={`${import.meta.env.BASE_URL}assets/${img.src}`}
              className="w-full h-full object-cover"
              alt={img.title}
            />

            {/* Corner ornaments */}
            {(['top-3 left-3 border-t-2 border-l-2', 'top-3 right-3 border-t-2 border-r-2',
               'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'] as const
            ).map((cls, ci) => (
              <div key={ci} className={`absolute w-6 h-6 pointer-events-none ${cls}`} style={{ borderColor: accent }} />
            ))}

            {/* Batch navigation */}
            {index > 0 && (
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
                onClick={() => onNavigate(index - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
              </button>
            )}
            {index < images.length - 1 && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
                onClick={() => onNavigate(index + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            )}

            {/* Batch counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => onNavigate(i)}
                  className="rounded-full transition-all"
                  style={{ width: i === index ? 20 : 6, height: 6, background: i === index ? accent : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          </div>

          {/* ── METADATA PANEL ── */}
          <div className="md:w-72 flex-shrink-0 flex flex-col gap-3" style={{ maxHeight: '85vh' }}>
            {/* Close */}
            <div className="flex justify-end">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                onClick={onClose}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 rounded-2xl p-5 overflow-y-auto"
              style={{ background: 'rgba(8,12,24,0.96)', border: `1px solid ${accent}28`, boxShadow: `0 0 32px ${accent}18` }}>

              {/* Realm badge */}
              {img.realm && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4"
                  style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: accent, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    {img.realm === 'star' ? 'Star Realm' : 'Day Realm'}
                  </span>
                </div>
              )}

              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.05rem', color: '#F6E3BA', fontWeight: 700, letterSpacing: '0.1em', lineHeight: 1.3 }}>
                {img.title}
              </h2>

              {img.creator && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 5, letterSpacing: '0.08em' }}>
                  by <span style={{ color: accent }}>{img.creator}</span>
                </p>
              )}
              {img.date && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: 2, letterSpacing: '0.1em' }}>
                  {img.date}
                </p>
              )}

              {img.model && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 5 }}>Casting Engine</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>{img.model}</p>
                </div>
              )}

              {img.prompt && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 6 }}>The Incantation</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: 'rgba(248,250,252,0.52)', lineHeight: 1.7, fontStyle: 'italic' }}>"{img.prompt}"</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 flex-shrink-0">
              {img.prompt && (
                <motion.button onClick={cloneToForge}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold uppercase tracking-widest text-white"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 0 24px rgba(139,92,246,0.4)' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" /></svg>
                  Clone Incantation
                </motion.button>
              )}
              {onHide && (
                <button onClick={() => { onHide(index); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-widest transition-all hover:bg-white/10"
                  style={{ fontFamily: 'Outfit, sans-serif', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  Archive Vision
                </button>
              )}
              {onBanish && (
                <button onClick={() => { onBanish(index); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-widest transition-all"
                  style={{ fontFamily: 'Outfit, sans-serif', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(248,113,113,0.55)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                  Banish Forever
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
