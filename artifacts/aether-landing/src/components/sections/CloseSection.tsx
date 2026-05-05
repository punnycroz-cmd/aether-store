import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
const mascotImg = `${import.meta.env.BASE_URL}assets/mascot.png`;

const TITLE = 'AETHER STUDIO';

export function CloseSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.4 });

  return (
    <section
      id="close"
      data-section="6"
      ref={ref}
      className="relative w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ height: '100svh', minHeight: 600, background: '#07090f' }}
    >
      {/* Central warm + purple radial */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(246,227,186,0.1) 0%, rgba(139,92,246,0.07) 50%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ambient particles */}
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            background: i % 2 === 0 ? '#F6E3BA' : '#8b5cf6',
          }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.65, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Hero lantern — large, centered, above text */}
      <motion.div
        className="relative mb-10"
        style={{ width: 'clamp(80px, 14vw, 180px)', height: 'clamp(80px, 14vw, 180px)' }}
        initial={{ y: -30, opacity: 0, scale: 0.7 }}
        animate={inView ? { y: [0, -14, 0], opacity: 1, scale: 1 } : { y: -30, opacity: 0, scale: 0.7 }}
        transition={{
          opacity: { duration: 1, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 1, ease: [0.175, 0.885, 0.32, 1.275] },
          y: inView ? { duration: 5, repeat: Infinity, ease: 'easeInOut' } : {},
        }}
      >
        <img src={mascotImg} alt="Aether Studio" className="w-full h-full object-contain drop-shadow-2xl" />
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl -z-10"
          style={{ background: 'rgba(246,227,186,0.25)' }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Title per-char stagger */}
      <div style={{ perspective: 1200 }}>
        <h1
          className="font-bold tracking-[0.28em] flex justify-center flex-wrap gap-[0.08em] leading-none"
          style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(2rem, 5.5vw, 6rem)' }}
        >
          {TITLE.split('').map((char, i) => (
            <motion.span
              key={i}
              style={{ display: 'inline-block', color: '#F6E3BA' }}
              initial={{ opacity: 0, y: 40, rotateX: -60 }}
              animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 40, rotateX: -60 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 22,
                delay: inView ? i * 0.06 + 0.2 : 0,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </h1>
      </div>

      {/* Divider */}
      <motion.div
        className="mt-7"
        style={{
          height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(246,227,186,0.5),transparent)',
        }}
        initial={{ width: 0, opacity: 0 }}
        animate={inView ? { width: '38vw', opacity: 1 } : { width: 0, opacity: 0 }}
        transition={{ duration: 1.6, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Tagline */}
      <motion.p
        className="mt-7 uppercase tracking-[0.28em] text-center"
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 'clamp(0.65rem, 1.4vw, 1.1rem)',
          color: 'rgba(248,250,252,0.5)',
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 1, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        Where Imagination Becomes Art
      </motion.p>

      {/* CTA button */}
      <motion.a
        href="#hero"
        className="mt-12 px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm text-white no-underline"
        style={{
          fontFamily: 'Outfit, sans-serif',
          background: 'linear-gradient(135deg,#8b5cf6,#10b981)',
          boxShadow: '0 0 40px rgba(139,92,246,0.4)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.9, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.06, boxShadow: '0 0 55px rgba(139,92,246,0.6)' }}
      >
        Access Your Grimoire
      </motion.a>

      {/* Bottom ornament */}
      <motion.div
        className="absolute bottom-[8vh] flex items-center gap-4 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 1.6 }}
      >
        <div className="w-14 h-px" style={{ background: 'rgba(246,227,186,0.28)' }} />
        <div className="w-2 h-2 rotate-45" style={{ background: 'rgba(246,227,186,0.6)' }} />
        <div className="w-14 h-px" style={{ background: 'rgba(246,227,186,0.28)' }} />
      </motion.div>
    </section>
  );
}
