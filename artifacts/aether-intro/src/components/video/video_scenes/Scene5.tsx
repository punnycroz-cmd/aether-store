import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-10 overflow-hidden"
      initial={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
      animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
      exit={{ scale: 1.06, opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Split bg — day left / night right, transitions with phase */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background:
            phase >= 4
              ? 'linear-gradient(100deg, #0f172a 0%, #0f172a 100%)'
              : phase >= 3
              ? 'linear-gradient(100deg, #f1f7f4 0%, #0f172a 65%)'
              : 'linear-gradient(100deg, #f1f7f4 0%, #e8f5ee 100%)',
        }}
        transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Day glow (emerald) */}
      <motion.div
        className="absolute w-[50vw] h-[50vw] rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)', left: '-10%', top: '10%' }}
        animate={{ opacity: phase >= 4 ? 0 : 1, scale: [1, 1.1, 1] }}
        transition={{ opacity: { duration: 2 }, scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
      />

      {/* Night glow (purple) */}
      <motion.div
        className="absolute w-[50vw] h-[50vw] rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', right: '-10%', top: '10%' }}
        animate={{ opacity: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 2 }}
      />

      {/* Center divider line */}
      <motion.div
        className="absolute top-0 bottom-0 w-[2px]"
        style={{ left: '50%', background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.3), transparent)' }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={phase >= 2 ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Left — Day mode panel */}
      <motion.div
        className="absolute left-[5vw] top-1/2 w-[38vw] -translate-y-1/2"
        initial={{ opacity: 0, x: -40 }}
        animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="rounded-2xl p-[2vw] shadow-xl"
          style={{
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
            <span
              className="text-[1.2vw] text-[#10243a]/80 uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Day Mode
            </span>
          </div>
          <div
            className="text-[2vw] font-bold text-[#10243a] leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The Forge
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 bg-[#10b981]/30 rounded-full w-full" />
            <div className="h-2 bg-[#10b981]/20 rounded-full w-4/5" />
            <div className="h-2 bg-[#10b981]/10 rounded-full w-3/5" />
          </div>
          <div
            className="mt-5 h-8 rounded-lg flex items-center justify-center text-white text-[1vw] font-bold tracking-widest uppercase"
            style={{ background: '#10b981', fontFamily: 'var(--font-body)' }}
          >
            Generate
          </div>
        </div>
      </motion.div>

      {/* Right — Night mode panel */}
      <motion.div
        className="absolute right-[5vw] top-1/2 w-[38vw] -translate-y-1/2"
        initial={{ opacity: 0, x: 40 }}
        animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="rounded-2xl p-[2vw] shadow-xl"
          style={{
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139,92,246,0.25)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
            <span
              className="text-[1.2vw] text-[#f8fafc]/60 uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Star Mode
            </span>
          </div>
          <div
            className="text-[2vw] font-bold text-[#f8fafc] leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The Grimoire
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 bg-[#8b5cf6]/30 rounded-full w-full" />
            <div className="h-2 bg-[#8b5cf6]/20 rounded-full w-4/5" />
            <div className="h-2 bg-[#8b5cf6]/10 rounded-full w-2/3" />
          </div>
          <div
            className="mt-5 h-8 rounded-lg flex items-center justify-center text-white text-[1vw] font-bold tracking-widest uppercase"
            style={{ background: '#8b5cf6', fontFamily: 'var(--font-body)' }}
          >
            Conjure
          </div>
        </div>
      </motion.div>

      {/* Center badge */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 bottom-[12vh] text-center z-30"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.8, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        <h2
          className="text-[3vw] font-bold text-white leading-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          One Studio.{' '}
          <span style={{ color: '#F6E3BA' }}>Two Realms.</span>
        </h2>
      </motion.div>
    </motion.div>
  );
}
