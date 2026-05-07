import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { useLocalStore } from '../hooks/useLocalStore';
import { getThumb, timeAgo } from '../lib/utils';
import { social } from '../lib/api';
import type { GalleryItem, GalleryResponse } from '../lib/types';

export function CreatorProfilePage({ params }: { params?: { username?: string } }) {
  const username = decodeURIComponent(params?.username ?? '');
  const [, navigate] = useLocation();
  const { followUser, unfollowUser, isFollowing, addNotification } = useLocalStore();
  const [feed, setFeed] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const following = isFollowing(username);
  const [profile, setProfile] = useState<any>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const profRes = await social.getProfile(username);
      setProfile(profRes.profile);
      
      const data = await social.getPublicGallery({ 
        limit: 50, 
        target_uid: profRes.profile.uid 
      });
      
      const items = (data.items ?? [])
        .filter((it: any) => (it.images ?? []).some((img: any) => img.status !== 'hidden' && img.status !== 'deleting'));
      
      const seen = new Set<string>();
      setFeed(items.filter((it: any) => seen.has(it.request_id) ? false : (seen.add(it.request_id), true)));
    } catch (err) {
      console.error("Failed to load creator", err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function handleFollow() {
    if (following) {
      unfollowUser(username);
    } else {
      followUser(username);
      addNotification({ type: 'follow', message: `You're now following ${username}`, link: `/profile/${encodeURIComponent(username)}` });
    }
  }

  const accent = '#8b5cf6';
  const avatar = feed.find(it => it.user_picture)?.user_picture;
  const creatorInitial = username ? username[0].toUpperCase() : '?';

  return (
    <div className="min-h-screen" style={{ background: '#07101c' }}>
      <SiteNav />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 60% 35% at 50% 0%, ${accent}10, transparent 65%)`,
      }} />

      <div className="pt-[80px] max-w-4xl mx-auto px-4 md:px-8 pb-24">

        {/* Back */}
        <motion.button onClick={() => navigate('/feed')}
          className="flex items-center gap-2 mt-6 mb-8"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', letterSpacing: '0.1em' }}
          whileHover={{ color: 'rgba(255,255,255,0.6)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          Back to Feed
        </motion.button>

        {/* Profile header */}
        <motion.div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Avatar */}
          {avatar ? (
            <img src={avatar} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
              style={{ border: `2px solid ${accent}50`, boxShadow: `0 0 24px ${accent}20` }} />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}18`, border: `2px solid ${accent}35`, boxShadow: `0 0 24px ${accent}15` }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '2rem', color: accent }}>{creatorInitial}</span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', color: '#f8fafc', letterSpacing: '0.1em', marginBottom: 6 }}>
              {profile?.name || username || 'Unknown Creator'}
            </h1>
            <div className="flex flex-wrap gap-4 mb-6">
              {[
                { label: 'Visions',   value: profile?.manifestation_count ?? feed.length },
                { label: 'Followers', value: profile?.follower_count ?? 0 },
                { label: 'Following', value: profile?.following_count ?? 0 },
              ].map(s => (
                <div key={s.label} className="text-center px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#f8fafc' }}>
                    {s.value}
                  </div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <motion.button onClick={handleFollow}
              className="px-5 py-2 rounded-xl"
              style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase',
                background: following ? 'rgba(255,255,255,0.06)' : `${accent}20`,
                border: `1px solid ${following ? 'rgba(255,255,255,0.12)' : accent + '50'}`,
                color: following ? 'rgba(255,255,255,0.45)' : accent, cursor: 'pointer',
              }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {following ? '✓ Following' : '+ Follow Creator'}
            </motion.button>
          </div>
        </motion.div>

        {/* Gallery */}
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div className="w-6 h-6 rounded-full border-2"
              style={{ borderColor: `${accent} transparent transparent transparent` }}
              animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-20">
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
              No public visions found for this creator
            </p>
          </div>
        ) : (
          <motion.div className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {feed.map((item, i) => {
              const thumb = getThumb(item);
              const itemAccent = item.realm === 'star' ? '#8b5cf6' : '#10b981';
              return (
                <motion.div key={item.request_id}
                  className="relative group rounded-xl overflow-hidden cursor-pointer"
                  style={{ aspectRatio: '1/1', background: 'rgba(0,0,0,0.4)', border: `1px solid ${itemAccent}20` }}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => thumb && setLightbox(thumb)}>
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </div>
                  )}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'linear-gradient(to top, rgba(7,10,24,0.85) 0%, transparent 60%)' }}>
                    <div className="absolute bottom-2 left-2 right-2">
                      {item.prompt && (
                        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.prompt}
                        </p>
                      )}
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                        {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl object-contain"
              style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
