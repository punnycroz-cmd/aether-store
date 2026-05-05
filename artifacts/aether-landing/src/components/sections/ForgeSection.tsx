import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export function ForgeSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.4 });

  return (
    <section
      id="forge"
      data-section="1"
      ref={ref}
      className="relative w-full overflow-hidden flex items-center"
      style={{ height: '100svh', minHeight: 600, background: '#0a1120' }}
    >
      {/* Emerald mist background */}
      <motion.img
        src={`${import.meta.env.BASE_URL}assets/emerald-mist.png`}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.55, mixBlendMode: 'screen' }}
        initial={{ scale: 1.15 }}
        animate={inView ? { scale: 1 } : { scale: 1.15 }}
        transition={{ duration: 10, ease: 'linear' }}
      />

      {/* Emerald radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(16,185,129,0.14) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full px-[8vw] flex items-center gap-[6vw]">
        {/* Left text */}
        <div className="flex-1 min-w-0" style={{ perspective: 1200 }}>
          <motion.div
            initial={{ opacity: 0, rotateY: 30, x: -50 }}
            animate={inView ? { opacity: 1, rotateY: 0, x: 0 } : { opacity: 0, rotateY: 30, x: -50 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <h2
              className="font-bold leading-tight"
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: 'clamp(2rem, 4.5vw, 4.5rem)',
                color: '#fff',
              }}
            >
              Conjure <br />
              <span style={{ color: '#10b981' }}>Your Vision</span>
            </h2>
            <p
              className="mt-6 max-w-md"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 'clamp(0.85rem, 1.5vw, 1.2rem)',
                color: 'rgba(248,250,252,0.65)',
                lineHeight: 1.7,
              }}
            >
              Access the forge. Shape concepts into existence with mystical precision.
              Write your incantation — watch it materialise.
            </p>

            <motion.div
              className="mt-10 inline-flex items-center gap-3 px-7 py-3.5 rounded-full font-bold uppercase tracking-widest text-sm cursor-pointer"
              style={{
                fontFamily: 'Outfit, sans-serif',
                background: '#10b981',
                color: '#fff',
                boxShadow: '0 0 28px rgba(16,185,129,0.45)',
              }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(16,185,129,0.6)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Enter the Forge
            </motion.div>
          </motion.div>
        </div>

        {/* Right — grimoire + floating glass panel */}
        <div className="flex-1 min-w-0 relative flex justify-center items-center">
          <motion.img
            src={`${import.meta.env.BASE_URL}assets/grimoire.png`}
            className="relative z-20 object-contain"
            style={{ width: 'clamp(160px, 22vw, 320px)' }}
            initial={{ y: 80, opacity: 0, scale: 0.85 }}
            animate={inView ? { y: [0, -12, 0], opacity: 1, scale: 1 } : { y: 80, opacity: 0, scale: 0.85 }}
            transition={{
              opacity: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
              scale: { duration: 0.9, ease: [0.175, 0.885, 0.32, 1.275] },
              y: inView ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : {},
            }}
          />

          {/* Glassmorphic UI panel */}
          <motion.div
            className="absolute top-1/4 right-0 z-30 rounded-xl p-5"
            style={{
              width: 'clamp(160px, 18vw, 260px)',
              background: 'rgba(15,23,42,0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 10px 25px rgba(16,185,129,0.35)',
            }}
            initial={{ x: 50, opacity: 0 }}
            animate={inView ? { x: 0, opacity: 1, y: [0, -10, 0] } : { x: 50, opacity: 0 }}
            transition={{
              x: { duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 1, delay: 0.5 },
              y: inView ? { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 } : {},
            }}
          >
            <div className="h-2 w-1/3 rounded-full mb-4" style={{ background: 'rgba(16,185,129,0.5)' }} />
            <div className="space-y-2 mb-5">
              <div className="h-2 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
              <div className="h-2 w-4/5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div className="h-2 w-3/5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <div
              className="h-8 w-full rounded-lg flex items-center justify-center text-white font-bold uppercase tracking-widest"
              style={{ background: '#10b981', fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem' }}
            >
              Generate
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
