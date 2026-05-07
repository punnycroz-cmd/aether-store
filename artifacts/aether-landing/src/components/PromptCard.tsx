import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { toPng } from 'html-to-image';
import { useLocalStore } from '../hooks/useLocalStore';
import { CommentsModal } from './CommentsModal';
import { RemixTreeModal } from './RemixTreeModal';
import { SaveToBoardModal } from './SaveToBoardModal';
import { getThumb, timeAgo, extractTags } from '../lib/utils';
import { apiFetch } from '../lib/api';
import type { GalleryItem } from '../lib/types';

const QUICK_REACTIONS = ['✨', '🔥', '💎'];

interface PromptCardProps {
  item: GalleryItem;
  onClick?: () => void;
  baseLikes?: number;
}

export function PromptCard({ item, onClick, baseLikes = 0 }: PromptCardProps) {
  const {
    toggleLike, getLikes, isLiked,
    toggleSave, isSaved,
    toggleReaction, getReactions, getMyReaction,
    getCommentCount,
    followUser, unfollowUser, isFollowing,
    setRemixParent, getRemixAncestors,
    getRating,
    addNotification,
  } = useLocalStore();

  const [, navigate] = useLocation();
  const [showComments, setShowComments] = useState(false);
  const [showRemixTree, setShowRemixTree] = useState(false);
  const [showSaveBoard, setShowSaveBoard] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareLinkFlash, setShareLinkFlash] = useState(false);
  const [followFlash, setFollowFlash] = useState<'followed' | 'unfollowed' | null>(null);
  const [authorHover, setAuthorHover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const thumb = getThumb(item);
  const accent = item.realm === 'star' ? '#8b5cf6' : '#10b981';
  const liked = isLiked(item.request_id);
  const likeCount = getLikes(item.request_id, baseLikes);
  const savedItem = isSaved(item.request_id);
  const commentCount = getCommentCount(item.request_id);
  const reactionCounts = getReactions(item.request_id);
  const myReaction = getMyReaction(item.request_id);
  const topReaction = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const ancestors = getRemixAncestors(item.request_id);
  const rating = getRating(item.request_id);
  const tags = extractTags(item.prompt).slice(0, 3);

  function remix(e: React.MouseEvent) {
    e.stopPropagation();
    if (item.prompt) {
      sessionStorage.setItem('forgePrompt', item.prompt);
      setRemixParent(`remix-${Date.now()}`, {
        parentId: item.request_id,
        parentPrompt: item.prompt,
        parentThumb: thumb,
        parentAuthor: item.user_name ?? 'Arcanist',
      });
    }
    navigate('/forge');
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    toggleLike(item.request_id);
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    toggleSave(item.request_id);
  }

  function handleReaction(e: React.MouseEvent, emoji: string) {
    e.stopPropagation();
    toggleReaction(item.request_id, emoji);
  }

  function handleComment(e: React.MouseEvent) {
    e.stopPropagation();
    setShowComments(true);
  }

  function copyPrompt(e: React.MouseEvent) {
    e.stopPropagation();
    if (item.prompt) {
      navigator.clipboard.writeText(item.prompt).catch(() => {});
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 1400);
    }
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (!cardRef.current || shareLoading) return;
    setShareLoading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { backgroundColor: '#07101c', quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `aether-${item.request_id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      addNotification({ type: 'milestone', message: 'Vision card saved as PNG!' });
    } catch {
      navigator.clipboard.writeText(item.prompt ?? '').catch(() => {});
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCreateDirectLink(e: React.MouseEvent) {
    e.stopPropagation();
    if (shareLinkLoading) return;
    setShareLinkLoading(true);
    try {
      // 1. Call backend to create short link
      // image_index is 0 because manifestations usually represent the first image
      // or the batch itself in this UI.
      const res = await apiFetch<{ share_url: string }>('api/share', {
        method: 'POST',
        body: JSON.stringify({ 
          request_id: item.request_id, 
          image_index: 0 
        })
      });

      // 2. Copy to clipboard
      await navigator.clipboard.writeText(res.share_url);
      setShareLinkFlash(true);
      addNotification({ type: 'milestone', message: 'Direct link copied to clipboard!' });
      setTimeout(() => setShareLinkFlash(false), 2000);
    } catch (err: any) {
      addNotification({ type: 'milestone', message: 'Failed to create link: ' + err.message });
    } finally {
      setShareLinkLoading(false);
    }
  }

  function handleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    const name = item.user_name ?? 'Arcanist';
    if (isFollowing(name)) {
      unfollowUser(name);
      setFollowFlash('unfollowed');
    } else {
      followUser(name);
      setFollowFlash('followed');
      addNotification({ type: 'follow', message: `You're now following ${name}` });
    }
    setTimeout(() => setFollowFlash(null), 1600);
  }

  function handleRemixTree(e: React.MouseEvent) {
    e.stopPropagation();
    setShowRemixTree(true);
  }

  function handleSaveToBoard(e: React.MouseEvent) {
    e.stopPropagation();
    setShowSaveBoard(true);
  }

  function handleCreatorClick(e: React.MouseEvent) {
    e.stopPropagation();
    const name = item.user_name;
    if (name) navigate(`/profile/${encodeURIComponent(name)}`);
  }

  return (
    <>
      <motion.div
        ref={cardRef}
        onClick={onClick}
        className="group relative rounded-2xl overflow-hidden cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
        whileHover={{ borderColor: `${accent}44`, y: -2 }}
        transition={{ duration: 0.2 }}>

        {/* Image area */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: 'rgba(0,0,0,0.4)' }}>
          {thumb ? (
            <img src={thumb} alt="" crossOrigin="anonymous"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 9 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/>
              </svg>
            </div>
          )}

          {/* Realm badge */}
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full backdrop-blur-sm"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', background: `${accent}22`, color: accent, border: `1px solid ${accent}40` }}>
              {item.realm === 'star' ? '★ Star' : '☀ Day'}
            </span>
          </div>

          {/* Top reaction badge */}
          {topReaction && (
            <div className="absolute top-2 right-2">
              <span className="text-sm leading-none">{topReaction}</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'linear-gradient(to top, rgba(7,10,24,0.9) 0%, rgba(7,10,24,0.1) 50%, transparent 100%)' }}>

            {/* Quick reactions */}
            <div className="absolute top-2 right-2 flex gap-1">
              {QUICK_REACTIONS.map(emoji => (
                <motion.button key={emoji} onClick={e => handleReaction(e, emoji)}
                  className="w-7 h-7 rounded-lg backdrop-blur-sm flex items-center justify-center text-sm leading-none"
                  style={{
                    background: myReaction === emoji ? `${accent}30` : 'rgba(0,0,0,0.45)',
                    border: myReaction === emoji ? `1px solid ${accent}50` : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: myReaction === emoji ? `0 0 10px ${accent}40` : 'none',
                  }}
                  whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}>
                  {emoji}
                </motion.button>
              ))}
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex gap-1.5">
              <motion.button onClick={remix}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg backdrop-blur-sm"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: `${accent}22`, color: accent, border: `1px solid ${accent}40` }}
                whileHover={{ background: `${accent}38` }} whileTap={{ scale: 0.95 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                Remix
              </motion.button>
              <motion.button onClick={copyPrompt}
                className="px-2.5 py-1.5 rounded-lg backdrop-blur-sm relative"
                style={{ background: copyFlash ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)', border: `1px solid ${copyFlash ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`, color: copyFlash ? '#10b981' : 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}
                whileHover={{ background: 'rgba(255,255,255,0.18)' }} whileTap={{ scale: 0.95 }}>
                {copyFlash
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </motion.button>
              <motion.button onClick={handleShare}
                className="px-2.5 py-1.5 rounded-lg backdrop-blur-sm"
                style={{ background: shareLoading ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: shareLoading ? '#a78bfa' : 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}
                whileHover={{ background: 'rgba(255,255,255,0.18)' }} whileTap={{ scale: 0.95 }}
                title="Save as PNG">
                {shareLoading
                  ? <motion.div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: '#a78bfa transparent transparent transparent' }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                }
              </motion.button>
              <motion.button onClick={handleCreateDirectLink}
                className="px-2.5 py-1.5 rounded-lg backdrop-blur-sm"
                style={{ 
                  background: shareLinkFlash ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)', 
                  border: `1px solid ${shareLinkFlash ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`, 
                  color: shareLinkFlash ? '#10b981' : 'rgba(255,255,255,0.6)', 
                  transition: 'all 0.2s' 
                }}
                whileHover={{ background: 'rgba(255,255,255,0.18)' }} whileTap={{ scale: 0.95 }}
                title="Copy Direct Link">
                {shareLinkLoading
                  ? <motion.div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: '#a78bfa transparent transparent transparent' }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                  : shareLinkFlash 
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                    : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                }
              </motion.button>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-3">
          {item.prompt && (
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(248,250,252,0.65)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6 }}>
              {item.prompt}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 rounded-md"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.48rem', letterSpacing: '0.1em', color: `${accent}99`, background: `${accent}0a`, border: `1px solid ${accent}20` }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Author + actions row */}
          <div className="flex items-center justify-between gap-2">
            {/* Author */}
            <div className="flex items-center gap-2 min-w-0 cursor-pointer select-none"
              onMouseEnter={() => setAuthorHover(true)}
              onMouseLeave={() => setAuthorHover(false)}
              onClick={handleCreatorClick}
              title={`View ${item.user_name ?? 'Arcanist'}'s profile`}>
              {item.user_picture ? (
                <img src={item.user_picture} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                  style={{ border: `1px solid ${accent}40` }} />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.5rem', color: accent }}>
                    {(item.user_name ?? '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex items-center gap-1.5">
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: authorHover ? accent : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                  {item.user_name ?? 'Arcanist'}
                </div>
                {!authorHover && (
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>
                    {timeAgo(item.created_at)}
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {followFlash ? (
                    <motion.button key="flash" onClick={e => { e.stopPropagation(); handleFollow(e); }}
                      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.48rem', letterSpacing: '0.1em', padding: '1px 5px', borderRadius: 4, background: followFlash === 'followed' ? `${accent}20` : 'rgba(255,255,255,0.06)', color: followFlash === 'followed' ? accent : 'rgba(255,255,255,0.35)', border: `1px solid ${followFlash === 'followed' ? accent + '40' : 'rgba(255,255,255,0.1)'}`, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      {followFlash === 'followed' ? '✓ Following' : 'Unfollowed'}
                    </motion.button>
                  ) : authorHover ? (
                    <motion.button key="btn" onClick={e => { e.stopPropagation(); handleFollow(e); }}
                      initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.48rem', letterSpacing: '0.1em', padding: '1px 5px', borderRadius: 4, background: isFollowing(item.user_name ?? 'Arcanist') ? 'rgba(255,255,255,0.06)' : `${accent}18`, color: isFollowing(item.user_name ?? 'Arcanist') ? 'rgba(255,255,255,0.4)' : accent, border: `1px solid ${isFollowing(item.user_name ?? 'Arcanist') ? 'rgba(255,255,255,0.1)' : accent + '40'}`, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      {isFollowing(item.user_name ?? 'Arcanist') ? 'Unfollow' : '+ Follow'}
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Rating badge */}
              {rating && (
                <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg"
                  style={{ background: 'rgba(246,192,67,0.08)', border: '1px solid rgba(246,192,67,0.18)' }}>
                  <span style={{ color: '#f6c043', fontSize: '0.6rem' }}>★</span>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: '#f6c043' }}>{rating.avg.toFixed(1)}</span>
                </div>
              )}

              {/* Remix tree (only if ancestors exist) */}
              {ancestors.length > 0 && (
                <motion.button onClick={handleRemixTree}
                  className="p-1 rounded-lg"
                  style={{ color: 'rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                  title={`Remix lineage (${ancestors.length} deep)`}
                  whileTap={{ scale: 0.85 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </motion.button>
              )}

              {/* Comment */}
              <motion.button onClick={handleComment}
                className="flex items-center gap-1 px-1.5 py-1 rounded-lg"
                style={{ color: commentCount > 0 ? accent : 'rgba(255,255,255,0.2)', background: commentCount > 0 ? `${accent}0e` : 'transparent' }}
                whileTap={{ scale: 0.85 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {commentCount > 0 && <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem' }}>{commentCount}</span>}
              </motion.button>

              {/* Save / Board */}
              <motion.button onClick={handleSaveToBoard}
                className="p-1 rounded-lg"
                style={{ color: savedItem ? '#f6c043' : 'rgba(255,255,255,0.2)', background: savedItem ? 'rgba(246,192,67,0.1)' : 'transparent' }}
                whileTap={{ scale: 0.85 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={savedItem ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </motion.button>

              {/* Like */}
              <motion.button onClick={handleLike}
                className="flex items-center gap-1 px-1.5 py-1 rounded-lg"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: liked ? '#f06292' : 'rgba(255,255,255,0.25)', background: liked ? 'rgba(240,98,146,0.1)' : 'transparent', border: liked ? '1px solid rgba(240,98,146,0.25)' : '1px solid transparent' }}
                whileTap={{ scale: 0.85 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {likeCount > 0 && likeCount}
              </motion.button>
            </div>
          </div>

          {/* Reaction summary */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {Object.entries(reactionCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([emoji, count]) => (
                <motion.button key={emoji} onClick={e => handleReaction(e, emoji)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg"
                  style={{ background: myReaction === emoji ? `${accent}14` : 'rgba(255,255,255,0.04)', border: `1px solid ${myReaction === emoji ? accent + '35' : 'rgba(255,255,255,0.06)'}` }}
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <span className="text-xs leading-none">{emoji}</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: myReaction === emoji ? accent : 'rgba(255,255,255,0.35)' }}>{count}</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showComments && <CommentsModal item={item} onClose={() => setShowComments(false)} />}
        {showRemixTree && (
          <RemixTreeModal
            item={item} ancestors={ancestors}
            onClose={() => setShowRemixTree(false)}
            onRemixAncestor={prompt => { sessionStorage.setItem('forgePrompt', prompt); navigate('/forge'); }}
          />
        )}
        {showSaveBoard && <SaveToBoardModal promptId={item.request_id} onClose={() => setShowSaveBoard(false)} />}
      </AnimatePresence>
    </>
  );
}
