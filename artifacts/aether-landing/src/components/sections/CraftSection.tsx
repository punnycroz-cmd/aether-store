import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export function CraftSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.4 });

  return (
    <section
      id="craft"
      data-section="4"
      ref={ref}
      className="relative w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ height: '100svh', minHeight: 600 }}
    >
      {/* Split background: day left → night right */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={inView
          ? { background: 'linear-gradient(100deg,#f1f7f4 0%,#0f172a 60%)' }
          : { background: 'linear-gradient(100deg,#f1f7f4 0%,#e8f5ee 100%)' }}
        transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Day glow */}
      <motion.div
        className="absolute rounded-full blur-[80px] pointer-events-none"
        style={{
          width: '50vw', height: '50vw',
          left: '-10%', top: '10%',
          background: 'radial-gradient(circle,rgba(16,185,129,0.2),transparent 70%)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Night glow */}
      <motion.div
        className="absolute rounded-full blur-[80px] pointer-events-none"
        style={{
          width: '50vw', height: '50vw',
          right: '-10%', top: '10%',
          background: 'radial-gradient(circle,rgba(139,92,246,0.2),transparent 70%)',
        }}
        animate={{ opacity: inView ? 1 : 0 }}
        transition={{ duration: 2 }}
      />

      {/* Center divider line */}
      <motion.div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: '50%',
          width: 2,
          background: 'linear-gradient(180deg,transparent,rgba(255,255,255,0.28),transparent)',
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={inView ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Panels row */}
      <div className="relative z-10 w-full px-[5vw] flex items-center gap-[3vw]">
        {/* Day panel */}
        <motion.div
          className="flex-1 min-w-0 rounded-2xl p-[2vw]"
          style={{
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(16,185,129,0.28)',
          }}
          initial={{ opacity: 0, x: -40 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(16,36,58,0.7)' }}
            >
              Day Mode
            </span>
          </div>
          <div
            className="font-bold leading-tight"
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(1.2rem, 2vw, 2.2rem)',
              color: '#10243a',
            }}
          >
            The Forge
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 rounded-full w-full" style={{ background: 'rgba(16,185,129,0.28)' }} />
            <div className="h-2 rounded-full w-4/5" style={{ background: 'rgba(16,185,129,0.18)' }} />
            <div className="h-2 rounded-full w-3/5" style={{ background: 'rgba(16,185,129,0.10)' }} />
          </div>
          <div
            className="mt-5 h-9 rounded-lg flex items-center justify-center text-white font-bold uppercase tracking-widest"
            style={{ background: '#10b981', fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem' }}
          >
            Generate
          </div>
        </motion.div>

        {/* Night panel */}
        <motion.div
          className="flex-1 min-w-0 rounded-2xl p-[2vw]"
          style={{
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139,92,246,0.22)',
          }}
          initial={{ opacity: 0, x: 40 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ background: '#8b5cf6' }} />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(248,250,252,0.55)' }}
            >
              Star Mode
            </span>
          </div>
          <div
            className="font-bold leading-tight"
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(1.2rem, 2vw, 2.2rem)',
              color: '#f8fafc',
            }}
          >
            The Grimoire
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 rounded-full w-full" style={{ background: 'rgba(139,92,246,0.28)' }} />
            <div className="h-2 rounded-full w-4/5" style={{ background: 'rgba(139,92,246,0.18)' }} />
            <div className="h-2 rounded-full w-2/3" style={{ background: 'rgba(139,92,246,0.10)' }} />
          </div>
          <div
            className="mt-5 h-9 rounded-lg flex items-center justify-center text-white font-bold uppercase tracking-widest"
            style={{ background: '#8b5cf6', fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem' }}
          >
            Conjure
          </div>
        </motion.div>
      </div>

      {/* Center badge */}
      <motion.div
        className="absolute bottom-[12vh] left-0 right-0 text-center z-20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.8, ease: [0.175, 0.885, 0.32, 1.275], delay: 0.4 }}
      >
        <h2
          className="font-bold leading-none"
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(1.5rem, 3vw, 3.2rem)',
            color: '#fff',
          }}
        >
          One Studio.{' '}
          <span style={{ color: '#F6E3BA' }}>Two Realms.</span>
        </h2>
      </motion.div>
    </section>
  );
}
