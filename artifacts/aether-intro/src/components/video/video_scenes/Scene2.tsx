import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 7000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10"
      initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
      animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
      exit={{ scale: 1.05, opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.img 
        src={`${import.meta.env.BASE_URL}assets/emerald-mist.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 8, ease: "linear" }}
      />

      <div className="absolute inset-0 flex items-center px-[10vw]">
        <div className="w-1/2" style={{ perspective: '1200px' }}>
          <motion.div
            initial={{ opacity: 0, rotateY: 30, x: -50 }}
            animate={phase >= 2 ? { opacity: 1, rotateY: 0, x: 0 } : { opacity: 0, rotateY: 30, x: -50 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display text-[4.5vw] text-white leading-tight font-bold">
              Conjure <br/><span className="text-[#10b981]">Your Vision</span>
            </h2>
            <p className="font-body text-[#f8fafc]/70 text-[1.5vw] mt-6 max-w-md">
              Access the forge. Shape concepts into existence with mystical precision.
            </p>
          </motion.div>
        </div>

        <div className="w-1/2 flex justify-center relative">
          <motion.img 
            src={`${import.meta.env.BASE_URL}assets/grimoire.png`}
            className="w-[25vw] relative z-20"
            initial={{ y: 100, opacity: 0, scale: 0.8 }}
            animate={phase >= 1 ? { y: 0, opacity: 1, scale: 1 } : { y: 100, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
          
          {/* Glassmorphic UI Panel floating over grimoire */}
          <motion.div 
            className="absolute top-1/4 right-0 glass-panel-dark rounded-xl p-6 w-[20vw] z-30 shadow-[0_10px_25px_rgba(16,185,129,0.4)]"
            initial={{ x: 50, opacity: 0 }}
            animate={phase >= 3 ? { x: 0, opacity: 1, y: [0, -10, 0] } : { x: 50, opacity: 0 }}
            transition={{ 
              duration: 1, 
              ease: [0.16, 1, 0.3, 1],
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <div className="h-2 w-1/3 bg-[#10b981]/50 rounded mb-4" />
            <div className="h-2 w-full bg-white/20 rounded mb-2" />
            <div className="h-2 w-4/5 bg-white/20 rounded mb-6" />
            <div className="h-8 w-full bg-[#10b981] rounded flex items-center justify-center">
              <span className="font-body text-xs font-bold text-white tracking-widest uppercase">Generate</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}