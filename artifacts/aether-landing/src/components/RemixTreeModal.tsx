import { motion, AnimatePresence } from 'framer-motion';
import type { RemixParent } from '../hooks/useLocalStore';
import type { GalleryItem } from '../lib/types';
import { getThumb } from '../lib/utils';

interface Props {
  item: GalleryItem;
  ancestors: RemixParent[];
  onClose: () => void;
  onRemixAncestor: (prompt: string) => void;
}

export function RemixTreeModal({ item, ancestors, onClose, onRemixAncestor }: Props) {
  const accent = item.realm === 'star' ? '#8b5cf6' : '#10b981';
  const thumb = getThumb(item);

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>

      <motion.div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#080f1e', border: `1px solid ${accent}25`, boxShadow: `0 0 60px ${accent}12` }}
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
          <div className="flex items-center gap-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: '#f8fafc', letterSpacing: '0.12em' }}>
              Remix Lineage
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Current item — bottom of the tree */}
          <TreeNode
            label="This Vision"
            prompt={item.prompt}
            author={item.user_name}
            thumb={thumb}
            accent={accent}
            isCurrent
            onRemix={() => {}}
          />

          {ancestors.length === 0 ? (
            <div className="text-center py-6">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
                This is an original — no remix ancestors found.
              </p>
            </div>
          ) : (
            ancestors.map((anc, i) => (
              <div key={anc.parentId}>
                {/* Connector line */}
                <div className="flex justify-center py-1">
                  <div style={{ width: 1, height: 20, background: `linear-gradient(to bottom, ${accent}60, ${accent}20)` }} />
                </div>
                <TreeNode
                  label={`Origin ${ancestors.length - i > 1 ? `(${i + 1} remix${i > 0 ? 'es' : ''} back)` : '(Original)'}`}
                  prompt={anc.parentPrompt}
                  author={anc.parentAuthor}
                  thumb={anc.parentThumb}
                  accent={accent}
                  isCurrent={false}
                  onRemix={() => { onRemixAncestor(anc.parentPrompt); onClose(); }}
                />
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TreeNode({ label, prompt, author, thumb, accent, isCurrent, onRemix }: {
  label: string;
  prompt?: string;
  author?: string;
  thumb: string | null;
  accent: string;
  isCurrent: boolean;
  onRemix: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: isCurrent ? `${accent}08` : 'rgba(255,255,255,0.03)', border: `1px solid ${isCurrent ? accent + '30' : 'rgba(255,255,255,0.07)'}` }}>
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: isCurrent ? accent : 'rgba(255,255,255,0.3)' }}>
              {label}
            </span>
            {!isCurrent && (
              <button onClick={onRemix}
                style={{ background: `${accent}18`, border: `1px solid ${accent}35`, borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>
                Remix
              </button>
            )}
          </div>
          {prompt && (
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', color: 'rgba(248,250,252,0.6)', lineHeight: 1.45,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {prompt}
            </p>
          )}
          {author && (
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
              by {author}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
