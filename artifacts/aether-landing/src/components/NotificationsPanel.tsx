import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStore } from '../hooks/useLocalStore';
import type { AetherNotification } from '../hooks/useLocalStore';

const TYPE_ICONS: Record<AetherNotification['type'], { icon: string; color: string }> = {
  follow:    { icon: '👤', color: '#8b5cf6' },
  reaction:  { icon: '✨', color: '#f6c043' },
  comment:   { icon: '💬', color: '#10b981' },
  challenge: { icon: '⚡', color: '#f472b6' },
  streak:    { icon: '🔥', color: '#f97316' },
  milestone: { icon: '★',  color: '#f6c043' },
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Props {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: Props) {
  const { notifications, markAllRead, clearNotifications, unreadCount } = useLocalStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markAllRead();
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handle), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handle); };
  }, [onClose, markAllRead]);

  return (
    <motion.div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
      style={{ background: '#0a1322', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.18 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#f8fafc', letterSpacing: '0.12em' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs"
              style={{ background: 'rgba(139,92,246,0.25)', color: '#a78bfa', fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button onClick={clearNotifications}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
            Clear all
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <span style={{ fontSize: '1.5rem' }}>🔮</span>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((n, i) => {
            const meta = TYPE_ICONS[n.type];
            return (
              <motion.div key={n.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: n.read ? 'transparent' : 'rgba(139,92,246,0.04)' }}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(248,250,252,0.75)', lineHeight: 1.45 }}>
                    {n.message}
                  </p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>
                    {timeAgo(n.time)} ago
                  </p>
                </div>
                {!n.read && (
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                    style={{ background: meta.color }} />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
