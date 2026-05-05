import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const TITLE = 'AETHER STUDIO';

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.5 });

  return (
    <section
      id="hero"
      data-section="0"
      ref={ref}
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ height: '100svh', minHeight: 600, background: '#0f172a' }}
    >
      {/* Ambient purple radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(139,92,246,0.13) 0%, transparent 70%)',
        }}
      />

      {/* Floating cream particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            background: '#F6E3BA',
          }}
          animate={{ y: [0, -80, 0], opacity: [0, 0.7, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Headline */}
      <div className="relative z-10 text-center" style={{ perspective: 1200 }}>
        <h1
          className="font-bold tracking-[0.25em] flex justify-center flex-wrap gap-[0.08em] leading-none"
          style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(2.5rem, 7vw, 7rem)' }}
        >
          {TITLE.split('').map((char, i) => (
            <motion.span
              key={i}
              style={{ display: 'inline-block', color: '#F6E3BA' }}
              initial={{ opacity: 0, y: 50, rotateX: -70 }}
              animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -70 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 22,
                delay: inView ? i * 0.06 + 0.2 : 0,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </h1>

        {/* Divider line */}
        <motion.div
          className="mx-auto mt-8"
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(246,227,186,0.55), transparent)',
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={inView ? { width: '40vw', opacity: 1 } : { width: 0, opacity: 0 }}
          transition={{ duration: 1.6, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Sub */}
        <motion.p
          className="mt-6 text-center uppercase tracking-[0.3em]"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(0.7rem, 1.4vw, 1.1rem)',
            color: 'rgba(248,250,252,0.45)',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 1, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Where Imagination Becomes Art
        </motion.p>

        {/* Scroll cue */}
        <motion.div
          className="mt-16 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
        >
          <motion.div
            className="w-px bg-[#F6E3BA]/40"
            animate={{ height: [16, 40, 16], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </section>
  );
}
