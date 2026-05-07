import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStore } from '../hooks/useLocalStore';
import { useAuth } from '../hooks/useAuth';
import { getThumb } from '../lib/utils';
import { social } from '../lib/api';
import type { GalleryItem } from '../lib/types';

const REACTIONS = [
  { emoji: '✨', label: 'Magic'     },
  { emoji: '🔥', label: 'Fire'      },
  { emoji: '👁️', label: 'Mesmerize' },
  { emoji: '💎', label: 'Rare'      },
  { emoji: '🌙', label: 'Ethereal'  },
];

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StarRating({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <motion.button key={s}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.9 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '1rem', lineHeight: 1 }}>
          <span style={{ color: s <= (hover || value) ? '#f6c043' : 'rgba(255,255,255,0.15)', transition: 'color 0.12s' }}>★</span>
        </motion.button>
      ))}
      {value > 0 && (
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: '#f6c043', marginLeft: 4 }}>
          {value}/5
        </span>
      )}
    </div>
  );
}

interface CommentsModalProps {
  item: GalleryItem;
  onClose: () => void;
}

export function CommentsModal({ item, onClose }: CommentsModalProps) {
  const { user } = useAuth();
  const {
    toggleReaction, getReactions, getMyReaction,
    addComment, getComments,
    toggleLike, getLikes, isLiked,
    ratePrompt, getRating, getMyRating,
    addNotification,
  } = useLocalStore();

  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState(user?.name ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [backendComments, setBackendComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const localComments = getComments(item.request_id);
  const reactionCounts = getReactions(item.request_id);
  const myReaction = getMyReaction(item.request_id);
  const thumb = getThumb(item);
  const accent = item.realm === 'star' ? '#8b5cf6' : '#10b981';
  const liked = isLiked(item.request_id);
  const likeCount = getLikes(item.request_id, 0);
  const rating = getRating(item.request_id);
  const myRating = getMyRating(item.request_id);

  // Sync with backend
  useEffect(() => {
    let mounted = true;
    social.getComments(item.request_id).then(res => {
      if (mounted) {
        setBackendComments(res.comments);
        setLoading(false);
      }
    }).catch(() => setLoading(false));
    return () => { mounted = false; };
  }, [item.request_id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (submitted && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setSubmitted(false);
    }
  }, [submitted, backendComments.length, localComments.length]);

  async function handleSubmit() {
    if (!text.trim()) return;
    const name = authorName.trim() || 'Anonymous Arcanist';
    
    // 1. Optimistic local update
    addComment(item.request_id, text, name, user?.picture ?? undefined);
    addNotification({ type: 'comment', message: `You commented on "${(item.prompt ?? 'a vision').slice(0, 40)}…"` });
    
    const commentText = text;
    setText('');
    setSubmitted(true);

    // 2. Sync to backend
    try {
      await social.comment(item.request_id, commentText);
      // Refresh backend list
      const res = await social.getComments(item.request_id);
      setBackendComments(res.comments);
    } catch (err) {
      console.error("Failed to post comment to server", err);
    }
  }

  // Merge comments for display (Backend priority, then local ones that might not be synced yet)
  const allComments = [...backendComments];
  localComments.forEach(lc => {
    // Basic deduplication by content+author if we want, but usually backend refresh handles it
    if (!backendComments.find(bc => bc.content === lc.text && bc.author_name === lc.authorName)) {
      allComments.push({
        id: lc.id,
        content: lc.text,
        author_name: lc.authorName,
        author_picture: lc.authorPicture,
        created_at: lc.createdAt
      });
    }
  });

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  }

  function handleRate(stars: number) {
    ratePrompt(item.request_id, stars);
    addNotification({ type: 'reaction', message: `You rated this vision ${stars} star${stars > 1 ? 's' : ''}` });
  }

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div
        className="relative w-full md:max-w-2xl flex flex-col rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0c1627 0%, #080f1d 100%)',
          border: `1px solid ${accent}22`,
          boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)`,
          maxHeight: '90vh',
        }}
        initial={{ y: 60, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 60, scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}>

        <div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />

        {/* Header */}
        <div className="flex items-start gap-4 p-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {thumb && (
            <img src={thumb} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              style={{ border: `1px solid ${accent}30` }} />
          )}
          <div className="flex-1 min-w-0">
            {item.prompt && (
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', color: 'rgba(248,250,252,0.65)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6 }}>
                {item.prompt}
              </p>
            )}
            <div className="flex items-center gap-2">
              {item.user_picture ? (
                <img src={item.user_picture} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: `${accent}20` }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.4rem', color: accent }}>{(item.user_name ?? '?')[0]}</span>
                </div>
              )}
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>
                {item.user_name ?? 'Arcanist'} · {item.model ?? 'Unknown model'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button onClick={() => toggleLike(item.request_id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: liked ? '#f06292' : 'rgba(255,255,255,0.3)', background: liked ? 'rgba(240,98,146,0.1)' : 'rgba(255,255,255,0.04)', border: liked ? '1px solid rgba(240,98,146,0.25)' : '1px solid rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.88 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {likeCount > 0 && <span>{likeCount}</span>}
            </motion.button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Rating stars */}
        <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(246,192,67,0.02)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Rate this vision
            </span>
            <StarRating value={myRating} onChange={handleRate} accent={accent} />
          </div>
          {rating && (
            <div className="flex items-center gap-1">
              <span style={{ color: '#f6c043', fontSize: '0.75rem' }}>★</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: '#f6c043' }}>
                {rating.avg.toFixed(1)}
              </span>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>
                ({rating.count})
              </span>
            </div>
          )}
        </div>

        {/* Reactions row */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Reactions {totalReactions > 0 && `· ${totalReactions}`}
            </span>
            {myReaction && (
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: accent }}>You reacted {myReaction}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {REACTIONS.map(r => {
              const count = reactionCounts[r.emoji] ?? 0;
              const mine = myReaction === r.emoji;
              return (
                <motion.button key={r.emoji}
                  onClick={() => toggleReaction(item.request_id, r.emoji)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{
                    background: mine ? `${accent}18` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${mine ? accent + '45' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: mine ? `0 0 12px ${accent}25` : 'none',
                  }}
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }}>
                  <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{r.emoji}</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: mine ? accent : 'rgba(255,255,255,0.4)' }}>
                    {count > 0 ? count : r.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Comments list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: 0 }}>
          {allComments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>💬</span>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
                {loading ? 'Consulting the Aether...' : 'No threads yet — start the conversation'}
              </p>
            </div>
          ) : (
            allComments.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3">
                {c.author_picture ? (
                  <img src={c.author_picture} alt="" className="w-7 h-7 rounded-xl object-cover flex-shrink-0" style={{ border: `1px solid ${accent}30` }} />
                ) : (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: accent }}>{(c.author_name || 'A')[0].toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: accent, fontWeight: 600 }}>{c.author_name}</span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: 'rgba(248,250,252,0.65)', lineHeight: 1.55 }}>
                    {c.content}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
          {!user?.name && (
            <input
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              placeholder="Your name…"
              className="w-full px-3 py-2 rounded-xl outline-none mb-2"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc' }}
            />
          )}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your thoughts on this vision…"
              rows={2}
              className="w-full px-3 py-2.5 pr-12 rounded-xl outline-none resize-none"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${accent}28`, color: '#f8fafc', lineHeight: 1.5 }}
            />
            <motion.button onClick={handleSubmit}
              disabled={!text.trim()}
              className="absolute right-2 bottom-2 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: text.trim() ? `${accent}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${text.trim() ? accent + '40' : 'rgba(255,255,255,0.08)'}`, cursor: text.trim() ? 'pointer' : 'default' }}
              whileHover={text.trim() ? { scale: 1.1 } : {}} whileTap={text.trim() ? { scale: 0.9 } : {}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? accent : 'rgba(255,255,255,0.2)'} strokeWidth="2.5">
                <path d="m22 2-7 20-4-9-9-4 20-7z"/>
              </svg>
            </motion.button>
          </div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.18)', marginTop: 5, letterSpacing: '0.08em' }}>
            ⌘↵ to submit
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
