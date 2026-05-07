import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { useLocalStore } from '../hooks/useLocalStore';
import { NotificationsPanel } from './NotificationsPanel';

const mascotImg = `${import.meta.env.BASE_URL}assets/mascot.png`;

const TABS = [
  { label: 'Discover',   path: '/discover',   accent: '#8b5cf6' },
  { label: 'Store',      path: '/store',      accent: '#f6c043' },
  { label: 'Challenges', path: '/challenges', accent: '#f472b6' },
  { label: '🔒 Cage',   path: '/cage',       accent: '#ef4444' },
];

export function SiteNav({ activeSection = 0 }: { activeSection?: number }) {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const { credits, unreadCount, streak, recordStreak } = useLocalStore();
  const [dropOpen, setDropOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLDivElement>(null);

  const isLanding  = location === '/';
  const dark       = !isLanding || (activeSection !== 2 && activeSection !== 4);
  const textBase   = dark ? 'rgba(248,250,252,0.45)' : 'rgba(16,36,58,0.5)';
  const brandColor = dark ? '#F6E3BA' : '#6D542F';

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Record streak on each page load
  useEffect(() => { recordStreak(); }, [recordStreak]);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 md:px-8 py-3"
      style={{
        background: dark ? 'rgba(8,12,24,0.72)' : 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(18px)',
        borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
      }}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}>

      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
        <img src={mascotImg} alt="Aether Studio" className="w-7 h-7 object-contain" />
        <span className="hidden sm:block text-xs font-semibold tracking-[0.22em] uppercase"
          style={{ fontFamily: 'Cinzel, serif', color: brandColor }}>
          Aether
        </span>
      </Link>

      {/* Desktop tabs */}
      <div className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl"
        style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
        {TABS.map(tab => {
          const active = location === tab.path;
          return (
            <Link key={tab.path} href={tab.path}>
              <motion.div className="relative px-4 py-1.5 rounded-xl cursor-pointer"
                style={{ background: active ? `${tab.accent}16` : 'transparent', border: active ? `1px solid ${tab.accent}40` : '1px solid transparent' }}
                whileHover={{ background: `${tab.accent}10` }}>
                <span className="text-xs font-bold uppercase tracking-widest"
                  style={{ fontFamily: 'Outfit, sans-serif', color: active ? tab.accent : textBase, transition: 'color 0.3s' }}>
                  {tab.label}
                </span>
                {active && (
                  <motion.div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] rounded-full"
                    style={{ background: tab.accent, width: '40%' }}
                    layoutId="tab-underline"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                )}
              </motion.div>
            </Link>
          );
        })}
        <Link href="/forge">
          <motion.div className="relative px-4 py-1.5 rounded-xl cursor-pointer ml-0.5"
            style={{ background: location === '/forge' ? 'rgba(16,185,129,0.16)' : 'rgba(16,185,129,0.08)', border: location === '/forge' ? '1px solid rgba(16,185,129,0.45)' : '1px solid rgba(16,185,129,0.2)' }}
            whileHover={{ background: 'rgba(16,185,129,0.2)' }}>
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
              style={{ fontFamily: 'Outfit, sans-serif', color: '#10b981' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>
              Forge
            </span>
          </motion.div>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Streak badge */}
        {streak.count > 0 && (
          <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}
            title={`${streak.count}-day forge streak`}>
            <span style={{ fontSize: '0.75rem' }}>🔥</span>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: '#f97316' }}>{streak.count}</span>
          </div>
        )}

        {/* Vault link */}
        <Link href="/vault">
          <motion.div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer"
            style={{ background: location === '/vault' ? 'rgba(246,224,186,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            whileHover={{ background: 'rgba(246,224,186,0.1)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(246,224,186,0.55)" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(246,224,186,0.55)' }}>Vault</span>
          </motion.div>
        </Link>

        {/* Notifications bell */}
        <div className="relative hidden md:block" ref={bellRef}>
          <motion.button
            onClick={() => setShowNotifs(o => !o)}
            className="relative w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: showNotifs ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showNotifs ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}` }}
            whileHover={{ background: 'rgba(139,92,246,0.12)' }}
            whileTap={{ scale: 0.92 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={showNotifs ? '#a78bfa' : 'rgba(255,255,255,0.4)'} strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <motion.div
                className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center px-1"
                style={{ background: '#8b5cf6', fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: '#fff' }}
                initial={{ scale: 0 }} animate={{ scale: 1 }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.div>
            )}
          </motion.button>
          <AnimatePresence>
            {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
          </AnimatePresence>
        </div>

        {/* User menu or sign in */}
        {user && !user.isGuest ? (
          <div className="relative" ref={dropRef}>
            <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl mr-1"
              style={{ background: 'rgba(246,192,67,0.08)', border: '1px solid rgba(246,192,67,0.18)' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: '#f6c043' }}>{credits}</span>
            </div>
            <motion.button onClick={() => setDropOpen(o => !o)}
              className="flex items-center gap-2 p-1.5 rounded-xl cursor-pointer"
              style={{ background: dropOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              whileHover={{ background: 'rgba(255,255,255,0.08)' }}>
              {user.picture ? (
                <img src={user.picture} alt="" className="w-6 h-6 rounded-lg object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.25)' }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: '#10b981' }}>{(user.name ?? '?')[0].toUpperCase()}</span>
                </div>
              )}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"
                style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </motion.button>

            <AnimatePresence>
              {dropOpen && (
                <motion.div className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden"
                  style={{ background: '#0a1322', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.18 }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', color: '#f8fafc', marginBottom: 2 }}>{user.name}</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>{user.email}</div>
                  </div>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                      <span style={{ color: '#f6c043', fontFamily: 'Cinzel, serif' }}>{credits}</span> Aether Credits
                    </span>
                  </div>
                  {streak.count > 0 && (
                    <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <span style={{ fontSize: '0.85rem' }}>🔥</span>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ color: '#f97316' }}>{streak.count}</span>-day streak
                      </span>
                    </div>
                  )}
                  {[
                    { label: 'My Profile',   icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', path: '/profile' },
                    { label: 'My Vault',     icon: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z', path: '/vault' },
                    { label: 'The Forge',    icon: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83', path: '/forge' },
                  ].map(item => (
                    <button key={item.path}
                      onClick={() => { setDropOpen(false); navigate(item.path); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d={item.icon}/></svg>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button onClick={async () => { setDropOpen(false); await signOut(); navigate('/'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(239,68,68,0.7)' }}>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : user?.isGuest ? (
          <Link href="/forge">
            <motion.div className="text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-full text-white cursor-pointer"
              style={{ fontFamily: 'Outfit, sans-serif', background: 'rgba(139,92,246,0.8)', boxShadow: '0 0 16px rgba(139,92,246,0.35)' }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>Sign In</motion.div>
          </Link>
        ) : (
          <Link href="/forge">
            <motion.div className="text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-full text-white cursor-pointer"
              style={{ fontFamily: 'Outfit, sans-serif', background: '#10b981', boxShadow: '0 0 16px rgba(16,185,129,0.35)' }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>Begin</motion.div>
          </Link>
        )}

        {/* Mobile menu toggle */}
        <button onClick={() => setMobileOpen(o => !o)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          {mobileOpen
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          }
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="absolute top-full left-0 right-0 md:hidden"
            style={{ background: 'rgba(8,12,24,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="px-5 py-4 space-y-1">
              {[...TABS, { label: 'Forge', path: '/forge', accent: '#10b981' }, { label: 'Vault', path: '/vault', accent: '#F6E3BA' }].map(tab => (
                <button key={tab.path}
                  onClick={() => { setMobileOpen(false); navigate(tab.path); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left"
                  style={{ background: location === tab.path ? `${tab.accent}12` : 'transparent', border: `1px solid ${location === tab.path ? `${tab.accent}30` : 'transparent'}`, color: location === tab.path ? tab.accent : 'rgba(255,255,255,0.45)', fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {tab.label}
                </button>
              ))}
              {user && !user.isGuest && (
                <button onClick={() => { setMobileOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.45)', fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Profile
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
