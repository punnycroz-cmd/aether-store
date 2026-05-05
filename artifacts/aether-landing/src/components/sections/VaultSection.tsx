import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
export function VaultSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.4 });

  return (
    <section
      id="vault"
      data-section="2"
      ref={ref}
      className="relative w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ height: '100svh', minHeight: 600, background: '#F6E3BA' }}
    >
      {/* Parchment texture */}
      <motion.img
        src={`${import.meta.env.BASE_URL}assets/parchment.png`}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.75 }}
        animate={inView ? { scale: 1.04 } : { scale: 1 }}
        transition={{ duration: 7, ease: 'linear' }}
      />

      {/* Brown ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(109,84,47,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full px-[8vw]">
        {/* Headline */}
        <motion.h2
          className="font-bold text-center mb-10"
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(2rem, 4vw, 4rem)',
            color: '#6D542F',
          }}
          initial={{ opacity: 0, y: -28 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -28 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          Your Grimoire
        </motion.h2>

        {/* Screenshot in frame */}
        <motion.div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: 'min(60vw, 840px)',
            border: '4px solid rgba(246,227,186,0.6)',
          }}
          initial={{ opacity: 0, rotateX: -18, y: 50 }}
          animate={inView ? { opacity: 1, rotateX: 0, y: 0 } : { opacity: 0, rotateX: -18, y: 50 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <img src={`${import.meta.env.BASE_URL}assets/vault-gallery.png`} className="w-full h-auto block" alt="Aether Studio Gallery" />
        </motion.div>

        <motion.p
          className="mt-8 text-center uppercase tracking-widest"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(0.7rem, 1.2vw, 1rem)',
            color: 'rgba(109,84,47,0.7)',
          }}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Every conjured vision, preserved and curated
        </motion.p>
      </div>

      {/* Decorative floating shapes */}
      <motion.div
        className="absolute top-[18%] left-[12%] w-16 h-16 border-2 pointer-events-none"
        style={{ borderColor: 'rgba(109,84,47,0.3)', transform: 'rotate(45deg)' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1, rotate: 135 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 2, ease: 'easeOut', delay: 0.4 }}
      />
      <motion.div
        className="absolute bottom-[18%] right-[12%] w-24 h-24 rounded-full border-2 pointer-events-none"
        style={{ borderColor: 'rgba(109,84,47,0.2)' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 2, ease: 'easeOut', delay: 0.6 }}
      />
      <motion.div
        className="absolute top-[25%] right-[18%] w-8 h-8 border pointer-events-none"
        style={{ borderColor: 'rgba(109,84,47,0.25)', transform: 'rotate(45deg)' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.8 }}
      />
    </section>
  );
}
