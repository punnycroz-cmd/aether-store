import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';
import { useLocalStore } from '../hooks/useLocalStore';
import { NotificationsPanel } from './NotificationsPanel';

const mascotImg = `${import.meta.env.BASE_URL}assets/mascot.png`;

const NAV_ITEMS = [
  { label: 'Discover',   path: '/discover',   accent: '#8b5cf6', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' },
  { label: 'Store',      path: '/store',      accent: '#f6c043', icon: 'M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M20 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' },
  { label: 'Challenges', path: '/challenges', accent: '#f472b6', icon: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34 M8 2h8v7a4 4 0 0 1-8 0V2z' },
  { label: 'Cage',       path: '/cage',       accent: '#ef4444', icon: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4' },
  { label: 'The Forge',  path: '/forge',      accent: '#10b981', icon: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z' },
  { label: 'Vault',      path: '/vault',      accent: '#f6e3ba', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z' },
];

export function SiteNav({ activeSection = 0 }: { activeSection?: number }) {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const { credits, unreadCount: localUnread, streak, recordStreak } = useLocalStore();
  const [backendUnread, setBackendUnread] = useState(0);
  const [dropOpen, setDropOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropRef  = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLDivElement>(null);

  const isLanding  = location === '/';
  const dark       = !isLanding || (activeSection !== 2 && activeSection !== 4);
  const textBase   = dark ? 'rgba(248,250,252,0.75)' : 'rgba(16,36,58,0.85)';
  const brandColor = dark ? '#F6E3BA' : '#6D542F';

  useEffect(() => {
    const sync = () => {
      import('../lib/api').then(({ social }) => {
        social.getNotifications().then(res => {
          const unread = res.notifications.filter((n: any) => !n.is_read).length;
          setBackendUnread(unread);
        }).catch(() => {});
      });
    };
    sync();
    const timer = setInterval(sync, 30000);
    return () => clearInterval(timer);
  }, [showNotifs]);

  const totalUnread = localUnread + backendUnread;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => { recordStreak(); }, [recordStreak]);

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 md:px-8 h-16 md:h-20"
        style={{
          background: dark ? 'rgba(8,12,24,0.72)' : 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px)',
          borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
        }}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>

        {/* --- BRAND --- */}
        <Link href="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
          <img src={mascotImg} alt="Aether" className="w-7 h-7 md:w-8 md:h-8 object-contain" />
          <span className="hidden sm:block text-[0.65rem] md:text-xs font-bold tracking-[0.25em] uppercase"
            style={{ fontFamily: 'Cinzel, serif', color: brandColor }}>
            Aether
          </span>
        </Link>

        {/* --- UNIFIED PREMIUM NAVIGATION CONTAINER --- */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
           {/* NAV ITEMS */}
           <div className="flex items-center gap-0.5 md:gap-1">
              {NAV_ITEMS.map(item => {
                 const active = location === item.path;
                 const isForge = item.label === 'The Forge';
                 
                 // Accent and styles
                 const borderStyle = isForge 
                    ? `1px solid ${active ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.15)'}`
                    : 'none';
                 const bgStyle = active 
                    ? `${item.accent}12`
                    : isForge 
                       ? 'rgba(16,185,129,0.05)'
                       : 'transparent';

                 return (
                   <Link key={item.path} href={item.path}>
                     <motion.div className="relative px-2.5 md:px-3.5 py-1.5 md:py-2 rounded-lg cursor-pointer group flex items-center gap-1.5 transition-all"
                       style={{ 
                         background: bgStyle,
                         border: borderStyle
                       }}
                       whileHover={{ background: isForge ? 'rgba(16,185,129,0.15)' : `${item.accent}08` }}>
                        
                        {/* Icon */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" 
                          stroke={active ? item.accent : isForge ? '#10b981' : 'rgba(255,255,255,0.45)'} 
                          strokeWidth="2">
                           <path d={item.icon} />
                        </svg>

                        {/* Label (Responsive: hidden below lg breakpoint) */}
                        <span className="hidden lg:inline text-[0.62rem] md:text-[0.68rem] font-bold uppercase tracking-widest transition-colors duration-300"
                          style={{ fontFamily: 'Outfit, sans-serif', color: active ? item.accent : isForge ? '#10b981' : textBase }}>
                          {item.label}
                        </span>
                     </motion.div>
                   </Link>
                 );
              })}
           </div>

           {/* Vertical Separator */}
           <div className="h-6 w-px bg-white/10 mx-1" />

           {/* ACTIONS */}
           <div className="flex items-center gap-1.5 pr-0.5">
              {/* Status Indicators */}
              {user && !user.isGuest && (
                <div className="hidden lg:flex items-center gap-1.5 pr-1">
                   {streak.count > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/5 border border-orange-500/10">
                        <span className="text-[0.6rem]">🔥</span>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: '#f97316' }}>{streak.count}</span>
                      </div>
                   )}
                   <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: '#f6c043' }}>{credits}</span>
                   </div>
                </div>
              )}

              {/* Notifications */}
              <div className="relative" ref={bellRef}>
                <motion.button onClick={() => setShowNotifs(!showNotifs)}
                  className="w-8.5 h-8.5 rounded-lg flex items-center justify-center transition-all"
                  style={{ 
                    background: showNotifs ? 'rgba(139,92,246,0.12)' : 'transparent', 
                    border: showNotifs ? '1px solid rgba(139,92,246,0.25)' : 'none' 
                  }}
                  whileHover={{ background: 'rgba(255,255,255,0.04)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={showNotifs ? '#a78bfa' : 'rgba(255,255,255,0.55)'} strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {totalUnread > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-violet-500 border border-black/50 text-[0.45rem] font-bold text-white flex items-center justify-center px-0.5">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </div>
                  )}
                </motion.button>
                <AnimatePresence>
                  {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
                </AnimatePresence>
              </div>

              {/* User Profile / Menu */}
              {user && !user.isGuest ? (
                <div className="relative" ref={dropRef}>
                  <motion.button onClick={() => setDropOpen(!dropOpen)}
                    className="flex items-center gap-1.5 p-0.5 rounded-lg border border-white/5 bg-white/[0.02]"
                    whileHover={{ background: 'rgba(255,255,255,0.06)' }}>
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-6.5 h-6.5 rounded-lg object-cover" />
                    ) : (
                      <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[0.58rem] font-bold text-emerald-400">
                        {user.name?.[0].toUpperCase()}
                      </div>
                    )}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"
                      className={`transition-transform duration-300 ${dropOpen ? 'rotate-180' : ''}`}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </motion.button>

                  <AnimatePresence>
                    {dropOpen && (
                      <motion.div className="absolute right-0 top-full mt-3 w-56 rounded-2xl bg-[#080c16] border border-white/10 shadow-2xl overflow-hidden z-[70]"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}>
                        <div className="p-4 border-b border-white/5">
                          <p className="text-[0.75rem] font-bold text-white truncate">{user.name}</p>
                          <p className="text-[0.58rem] text-white/30 truncate mt-0.5 font-medium">{user.email}</p>
                        </div>
                        
                        {/* Compact Credits for Menu */}
                        <div className="p-3 bg-yellow-500/[0.03] border-b border-white/5 flex items-center justify-between">
                           <span className="text-[0.62rem] text-white/40 uppercase tracking-widest font-bold">Aether Credits</span>
                           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-yellow-500/10">
                              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: '#f6c043' }}>{credits}</span>
                           </div>
                        </div>

                        <div className="p-1.5">
                          {[
                            { label: 'Store', icon: 'M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M20 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6', path: '/store' },
                            { label: 'Challenges', icon: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34 M8 2h8v7a4 4 0 0 1-8 0V2z', path: '/challenges' },
                            { label: 'The Cage', icon: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4', path: '/cage' },
                            { label: 'My Vault', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z', path: '/vault' },
                            { label: 'The Forge', icon: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z', path: '/forge' },
                          ].map(item => (
                            <button key={item.path} onClick={() => { setDropOpen(false); navigate(item.path); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d={item.icon}/></svg>
                              <span className="text-[0.72rem] font-medium text-white/60">{item.label}</span>
                            </button>
                          ))}
                        </div>
                        
                        <button onClick={async () => { setDropOpen(false); await signOut(); navigate('/'); }}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/5 hover:bg-red-500/10 transition-colors border-t border-white/5 text-left">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                          <span className="text-[0.72rem] font-bold text-red-500/80 uppercase tracking-widest">Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link href="/forge">
                  <motion.button className="px-3.5 py-1.5 rounded-lg text-[0.6rem] font-bold uppercase tracking-widest bg-emerald-500 text-white"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    {user?.isGuest ? 'Sign In' : 'Begin'}
                  </motion.button>
                </Link>
              )}
           </div>
        </div>

          {/* Mobile menu toggle (Visible on Small Only) */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50">
            {mobileOpen 
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            }
          </button>
      </motion.nav>

      {/* --- MOBILE FULL-SCREEN MENU --- */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-50 sm:hidden bg-[#050810]/95 backdrop-blur-2xl flex flex-col pt-24 px-6"
            initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
            
            <p className="text-[0.55rem] font-bold text-white/20 uppercase tracking-[0.3em] mb-6">Navigation</p>
            <div className="space-y-2">
              {NAV_ITEMS.map(tab => (
                <button key={tab.path} onClick={() => { setMobileOpen(false); navigate(tab.path); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all"
                  style={{ 
                    background: location === tab.path ? `${tab.accent}08` : 'rgba(255,255,255,0.02)',
                    borderColor: location === tab.path ? `${tab.accent}30` : 'rgba(255,255,255,0.05)',
                  }}>
                  <span className="text-sm font-bold uppercase tracking-widest" style={{ color: location === tab.path ? tab.accent : 'rgba(255,255,255,0.4)' }}>
                    {tab.label.replace('🔒 ', '')}
                  </span>
                  {location === tab.path && <div className="w-1.5 h-1.5 rounded-full" style={{ background: tab.accent }} />}
                </button>
              ))}
            </div>

            <div className="mt-auto mb-10 space-y-4">
               {user && !user.isGuest && (
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <img src={user.picture} alt="" className="w-8 h-8 rounded-lg" />
                       <div>
                          <p className="text-xs font-bold text-white">{user.name}</p>
                          <p className="text-[0.6rem] text-white/30 font-medium">Verified Visionary</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-yellow-500/10">
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: '#f6c043' }}>{credits}</span>
                       </div>
                       <p className="text-[0.5rem] text-white/20 uppercase tracking-widest font-bold">Credits</p>
                    </div>
                 </div>
               )}
               <button onClick={() => { setMobileOpen(false); navigate(user ? '/profile' : '/forge'); }}
                 className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[0.7rem] font-bold uppercase tracking-widest text-white/50">
                 {user ? 'View Profile' : 'Get Started'}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOBILE FLOATING BOTTOM DOCK (Clean sm-only) --- */}
      {!mobileOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] sm:hidden w-[90%] max-w-[340px]">
           <div className="bg-[#0a1322]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-1.5 flex items-center justify-between shadow-2xl shadow-black/50">
            {[
              { label: 'Discover', path: '/discover', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { label: 'Forge', path: '/forge', icon: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83' },
              { label: 'Vault', path: '/vault', icon: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' }
            ].map(item => {
               const active = location === item.path;
               const accent = item.label === 'Forge' ? '#10b981' : item.label === 'Vault' ? '#f6c043' : '#8b5cf6';
               return (
                 <button key={item.path} onClick={() => navigate(item.path)}
                   className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all"
                   style={{ background: active ? `${accent}12` : 'transparent' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? accent : 'rgba(255,255,255,0.35)'} strokeWidth="2">
                       <path d={item.icon} />
                    </svg>
                    <span className="text-[0.55rem] font-bold uppercase tracking-widest" style={{ color: active ? accent : 'rgba(255,255,255,0.25)' }}>{item.label}</span>
                 </button>
               );
            })}
         </div>
      </div>
      )}
    </>
  );
}
