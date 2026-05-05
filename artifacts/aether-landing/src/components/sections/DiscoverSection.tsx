import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const CHARS = [
  {
    img: 'char-mage.png',
    name: 'The Arcanist',
    role: 'Conjures visions from raw thought',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.35)',
    border: 'rgba(16,185,129,0.4)',
    x: '4%',
    delay: 0,
  },
  {
    img: 'char-star.png',
    name: 'The Star-Weaver',
    role: 'Threads constellations into art',
    accent: '#8b5cf6',
    glow: 'rgba(139,92,246,0.4)',
    border: 'rgba(139,92,246,0.45)',
    x: '26%',
    delay: 0.1,
  },
  {
    img: 'char-lantern.png',
    name: 'The Keeper',
    role: 'Preserves light across the Aether',
    accent: '#f6c043',
    glow: 'rgba(246,192,67,0.35)',
    border: 'rgba(246,192,67,0.4)',
    x: '51%',
    delay: 0.2,
  },
  {
    img: 'char-dream.png',
    name: 'The Dreamwright',
    role: 'Sculpts worlds from sleeping minds',
    accent: '#67e8f9',
    glow: 'rgba(103,232,249,0.35)',
    border: 'rgba(103,232,249,0.4)',
    x: '73%',
    delay: 0.3,
  },
];

export function DiscoverSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });

  return (
    <section
      id="discover"
      data-section="3"
      ref={ref}
      className="relative w-full overflow-hidden flex flex-col items-center"
      style={{ height: '100svh', minHeight: 640, background: '#080c1a' }}
    >
      {/* Purple radial glows */}
      <motion.div
        className="absolute rounded-full blur-[120px] pointer-events-none"
        style={{
          width: '65vw', height: '65vw',
          top: '-20%', left: '18%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.16), transparent 70%)',
        }}
        animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-[80px] pointer-events-none"
        style={{
          width: '40vw', height: '40vw',
          bottom: '-10%', right: '8%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)',
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Character cards */}
      <div className="absolute inset-0 flex items-start justify-center" style={{ paddingTop: '6vh' }}>
        {CHARS.map((c, i) => (
          <motion.div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: c.x, width: '21%' }}
            initial={{ opacity: 0, y: 80, scale: 0.88 }}
            animate={inView
              ? { opacity: 1, scale: 1, y: [0, -12, 0] }
              : { opacity: 0, y: 80, scale: 0.88 }}
            transition={{
              opacity: { duration: 0.9, delay: c.delay, ease: [0.16, 1, 0.3, 1] },
              scale:   { duration: 0.9, delay: c.delay, ease: [0.16, 1, 0.3, 1] },
              y: inView
                ? { duration: 3.5 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }
                : {},
            }}
          >
            {/* Card frame */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                width: '100%',
                aspectRatio: '3/4',
                border: `1.5px solid ${c.border}`,
                boxShadow: `0 0 32px ${c.glow}, inset 0 0 18px rgba(0,0,0,0.4)`,
                background: 'linear-gradient(160deg,rgba(15,23,42,0.92),rgba(5,8,20,0.97))',
              }}
            >
              {/* Glow halo behind character */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-1/2 blur-2xl rounded-full pointer-events-none"
                style={{ background: c.glow, opacity: 0.6 }}
              />
              <img
                src={`${import.meta.env.BASE_URL}assets/${c.img}`}
                alt={c.name}
                className="relative z-10 w-full h-full object-contain object-bottom"
                style={{ padding: '8% 10% 0' }}
              />
              {/* Bottom fog fade */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1/3 z-15 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, rgba(5,8,20,0.95) 0%, rgba(5,8,20,0.5) 50%, transparent 100%)`,
                }}
              />
              {/* Side fog fade */}
              <div
                className="absolute inset-0 z-15 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 100% 100% at 50% 100%, transparent 40%, rgba(5,8,20,0.7) 100%)`,
                }}
              />
              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 z-20 pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg,transparent 20%,rgba(255,255,255,0.06) 50%,transparent 80%)',
                  backgroundSize: '200% 100%',
                }}
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', delay: i * 0.5 }}
              />
              {/* Accent top-border glow */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] z-30"
                style={{ background: `linear-gradient(90deg,transparent,${c.accent},transparent)` }}
              />
            </div>

            {/* Label beneath card */}
            <motion.div
              className="mt-3 flex flex-col items-center gap-1"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.7, delay: c.delay + 0.4 }}
            >
              <span
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: 'clamp(0.55rem, 1vw, 0.85rem)',
                  color: c.accent,
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                }}
              >
                {c.name}
              </span>
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 'clamp(0.45rem, 0.75vw, 0.68rem)',
                  color: 'rgba(248,250,252,0.45)',
                  letterSpacing: '0.06em',
                  textAlign: 'center',
                }}
              >
                {c.role}
              </span>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Headline at bottom */}
      <div className="absolute bottom-[12vh] left-0 right-0 flex flex-col items-center z-20">
        <motion.h2
          className="font-bold text-center tracking-widest leading-none"
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(2rem, 4.5vw, 4.5rem)',
            color: '#fff',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
        >
          Explore the{' '}
          <span style={{ color: '#8b5cf6' }}>Aether</span>
        </motion.h2>
        <motion.p
          className="mt-4 uppercase tracking-widest text-center"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(0.65rem, 1.2vw, 0.95rem)',
            color: 'rgba(248,250,252,0.5)',
          }}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          A living gallery of conjured visions
        </motion.p>
        <motion.div
          className="mt-6"
          style={{
            height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.55),transparent)',
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={inView ? { width: '40vw', opacity: 1 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
        />
      </div>
    </section>
  );
}
