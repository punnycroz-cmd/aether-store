import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import heroScreenshot from "@assets/screenshot-1777781032747.png";

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 6000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10"
      initial={{ clipPath: 'circle(0% at 50% 100%)' }}
      animate={{ clipPath: 'circle(150% at 50% 100%)' }}
      exit={{ scale: 1.05, opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.img 
        src={`${import.meta.env.BASE_URL}assets/parchment.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        animate={{ scale: [1, 1.05] }}
        transition={{ duration: 7, ease: "linear" }}
      />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ perspective: '1200px' }}>
        <motion.div
          className="text-center z-30 mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-[4vw] text-[#6D542F] font-bold">Your Grimoire</h2>
        </motion.div>

        <motion.div
          className="w-[60vw] rounded-2xl overflow-hidden shadow-2xl border-4 border-[#F6E3BA]/50 z-20"
          initial={{ opacity: 0, rotateX: -20, y: 50 }}
          animate={phase >= 1 ? { opacity: 1, rotateX: 0, y: 0 } : { opacity: 0, rotateX: -20, y: 50 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={heroScreenshot} className="w-full h-auto" alt="Gallery" />
        </motion.div>
        
        {/* Floating decorative elements */}
        {phase >= 3 && (
          <>
            <motion.div className="absolute top-[20%] left-[15%] w-16 h-16 border-2 border-[#6D542F]/30 rotate-45"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 135 }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
            <motion.div className="absolute bottom-[20%] right-[15%] w-24 h-24 border-2 border-[#6D542F]/20 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2, delay: 0.2, ease: "easeOut" }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}