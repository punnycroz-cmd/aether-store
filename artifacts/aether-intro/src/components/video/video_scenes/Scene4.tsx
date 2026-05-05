import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const cards = [
    { w: '18vw', h: '22vw', x: '8vw', y: '12vh', delay: 0 },
    { w: '22vw', h: '28vw', x: '28vw', y: '6vh', delay: 0.08 },
    { w: '16vw', h: '20vw', x: '52vw', y: '16vh', delay: 0.16 },
    { w: '20vw', h: '25vw', x: '70vw', y: '10vh', delay: 0.24 },
  ];

  return (
    <motion.div
      className="absolute inset-0 z-10 overflow-hidden"
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ scale: 1.06, opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Deep navy bg with purple glow */}
      <div className="absolute inset-0 bg-[#080c1a]" />
      <motion.div
        className="absolute w-[60vw] h-[60vw] rounded-full blur-[100px] top-[-20%] left-[20%]"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full blur-[80px] bottom-[-10%] right-[10%]"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Floating image cards */}
      {cards.map((card, i) => (
        <motion.div
          key={i}
          className="absolute rounded-xl overflow-hidden"
          style={{ width: card.w, height: card.h, left: card.x, top: card.y }}
          initial={{ opacity: 0, y: 60, scale: 0.85 }}
          animate={
            phase >= 1
              ? { opacity: 1, y: [0, -8, 0], scale: 1 }
              : { opacity: 0, y: 60, scale: 0.85 }
          }
          transition={{
            opacity: { duration: 0.7, delay: card.delay, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 0.7, delay: card.delay, ease: [0.16, 1, 0.3, 1] },
            y: phase >= 1 ? { duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 } : {},
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background: [
                'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
                'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)',
                'linear-gradient(135deg, #065f46 0%, #10b981 50%, #34d399 100%)',
              ][i],
            }}
          />
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: i * 0.4 }}
          />
          {/* Purple border glow */}
          <div className="absolute inset-0 rounded-xl border border-[#8b5cf6]/25" />
        </motion.div>
      ))}

      {/* Headline */}
      <div className="absolute bottom-[18vh] left-0 right-0 flex flex-col items-center z-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2
            className="text-[4.5vw] font-bold text-center tracking-widest text-white leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Explore the{' '}
            <span style={{ color: '#8b5cf6' }}>Aether</span>
          </h2>
        </motion.div>
        <motion.p
          className="text-[1.4vw] mt-4 text-[#f8fafc]/60 tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-body)' }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          A living gallery of conjured visions
        </motion.p>
      </div>

      {/* Accent lines */}
      <motion.div
        className="absolute bottom-[16vh] h-[1px] bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent"
        style={{ left: '20%', right: '20%' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={phase >= 3 ? { scaleX: 1, opacity: 0.5 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
