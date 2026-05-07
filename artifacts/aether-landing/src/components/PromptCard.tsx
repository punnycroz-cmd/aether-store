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
      const res = await apiFetch<{ share_url: string }>('api/share', {
        method: 'POST',
        body: JSON.stringify({ request_id: item.request_id, image_index: 0 })
      });
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
            <img src={thumb} alt="" crossOrigin="anonymous" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 9 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>
            </div>
          )}

          {/* Realm badge */}
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full backdrop-blur-sm"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', background: `${accent}22`, color: accent, border: `1px solid ${accent}40` }}>
              {item.realm === 'star' ? '★ Star' : '☀ Day'}
            </span>
          </div>

          {/* Desktop Hover Overlay (Hidden on mobile) */}
          <div className="hidden md:block absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'linear-gradient(to top, rgba(7,10,24,0.9) 0%, rgba(7,10,24,0.1) 50%, transparent 100%)' }}>
            
            <div className="absolute top-2 right-2 flex gap-1">
              {QUICK_REACTIONS.map(emoji => (
                <motion.button key={emoji} onClick={e => handleReaction(e, emoji)} className="w-7 h-7 rounded-lg backdrop-blur-sm flex items-center justify-center text-sm leading-none"
                  style={{ background: myReaction === emoji ? `${accent}30` : 'rgba(0,0,0,0.45)', border: myReaction === emoji ? `1px solid ${accent}50` : '1px solid rgba(255,255,255,0.12)', boxShadow: myReaction === emoji ? `0 0 10px ${accent}40` : 'none' }}
                  whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}>{emoji}</motion.button>
              ))}
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex gap-1.5">
              <motion.button onClick={remix} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg backdrop-blur-sm"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: `${accent}22`, color: accent, border: `1px solid ${accent}40` }}
                whileHover={{ background: `${accent}38` }} whileTap={{ scale: 0.95 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
                Remix
              </motion.button>
              <motion.button onClick={handleCreateDirectLink} className="px-2.5 py-1.5 rounded-lg backdrop-blur-sm"
                style={{ background: shareLinkFlash ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)', border: `1px solid ${shareLinkFlash ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`, color: shareLinkFlash ? '#10b981' : 'rgba(255,255,255,0.6)' }}
                whileHover={{ background: 'rgba(255,255,255,0.18)' }} whileTap={{ scale: 0.95 }}>
                {shareLinkFlash ? '✓' : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-3">
          {/* Mobile-Only Action Row */}
          <div className="flex md:hidden items-center justify-between gap-2 mb-3 pb-3 border-b border-white/5">
             <button onClick={remix} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.6rem] font-bold uppercase tracking-widest"
               style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
               Remix
             </button>
             <div className="flex gap-1.5">
               <button onClick={handleCreateDirectLink} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: shareLinkFlash ? accent : 'white' }}>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
               </button>
               <button onClick={copyPrompt} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: copyFlash ? accent : 'white' }}>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
               </button>
             </div>
          </div>

          {item.prompt && (
            <p className="line-clamp-2 text-[0.7rem] leading-relaxed mb-3 text-white/60 font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {item.prompt}
            </p>
          )}

          {/* Author + Likes Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" onClick={handleCreatorClick}>
              {item.user_picture ? <img src={item.user_picture} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[0.5rem]">{item.user_name?.[0]}</div>}
              <span className="text-[0.6rem] text-white/40 font-bold uppercase tracking-tight">{item.user_name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={handleLike} className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? '#f06292' : 'none'} stroke={liked ? '#f06292' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></button>
                {likeCount > 0 && <span className="text-[0.6rem] text-white/30 font-bold">{likeCount}</span>}
              </button>
              <button onClick={handleSaveToBoard}><svg width="12" height="12" viewBox="0 0 24 24" fill={savedItem ? '#f6c043' : 'none'} stroke={savedItem ? '#f6c043' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showComments && <CommentsModal item={item} onClose={() => setShowComments(false)} />}
        {showRemixTree && <RemixTreeModal item={item} ancestors={ancestors} onClose={() => setShowRemixTree(false)} onRemixAncestor={p => { sessionStorage.setItem('forgePrompt', p); navigate('/forge'); }} />}
        {showSaveBoard && <SaveToBoardModal promptId={item.request_id} onClose={() => setShowSaveBoard(false)} />}
      </AnimatePresence>
    </>
  );
}
