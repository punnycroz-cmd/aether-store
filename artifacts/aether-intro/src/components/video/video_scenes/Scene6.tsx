import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import lanternImg from '@assets/favicon.webp';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 4500),
      setTimeout(() => setPhase(5), 7500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const title = 'AETHER STUDIO';

  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0.8, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Dark bg with warm ember glow from center */}
      <div className="absolute inset-0 bg-[#07090f]" />
      <motion.div
        className="absolute w-[70vw] h-[70vw] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(246,227,186,0.12), rgba(139,92,246,0.08), transparent 70%)' }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ambient floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            background: i % 2 === 0 ? '#F6E3BA' : '#8b5cf6',
          }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.7, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Central lantern — large hero */}
      <motion.div
        className="absolute flex items-center justify-center"
        style={{ width: '18vw', height: '18vw', top: '10vh', left: '50%', x: '-50%' }}
        initial={{ y: -30, opacity: 0, scale: 0.7 }}
        animate={phase >= 1 ? { y: [0, -12, 0], opacity: 1, scale: 1 } : { y: -30, opacity: 0, scale: 0.7 }}
        transition={{
          opacity: { duration: 1, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 1, ease: [0.175, 0.885, 0.32, 1.275] },
          y: phase >= 1 ? { duration: 5, repeat: Infinity, ease: 'easeInOut' } : {},
        }}
      >
        <img src={lanternImg} alt="Aether Studio" className="w-full h-full object-contain drop-shadow-2xl" />
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl -z-10"
          style={{ background: 'rgba(246,227,186,0.25)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Title with per-character stagger */}
      <div style={{ perspective: '1200px', marginTop: '22vh' }}>
        <h1
          className="font-bold tracking-[0.3em] flex justify-center gap-[0.1em] text-[5vw] leading-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title.split('').map((char, i) => (
            <motion.span
              key={i}
              style={{ display: 'inline-block', color: '#F6E3BA' }}
              initial={{ opacity: 0, y: 40, rotateX: -60 }}
              animate={
                phase >= 2
                  ? { opacity: 1, y: 0, rotateX: 0 }
                  : { opacity: 0, y: 40, rotateX: -60 }
              }
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 22,
                delay: phase >= 2 ? i * 0.06 : 0,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </h1>
      </div>

      {/* Divider */}
      <motion.div
        className="mt-6 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(246,227,186,0.5), transparent)', width: '40vw' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={phase >= 3 ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Tagline */}
      <motion.p
        className="mt-6 text-[1.6vw] text-[#f8fafc]/55 tracking-[0.25em] uppercase text-center"
        style={{ fontFamily: 'var(--font-body)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        Where Imagination Becomes Art
      </motion.p>

      {/* Bottom ornamental line */}
      <motion.div
        className="absolute bottom-[8vh] flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-12 h-[1px] bg-[#F6E3BA]/30" />
        <div className="w-2 h-2 rotate-45 bg-[#F6E3BA]/60" />
        <div className="w-12 h-[1px] bg-[#F6E3BA]/30" />
      </motion.div>
    </motion.div>
  );
}
