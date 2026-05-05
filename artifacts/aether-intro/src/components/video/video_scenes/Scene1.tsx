import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const title = "AETHER STUDIO";

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ scale: 1.08, opacity: 0 }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center" style={{ perspective: '1000px' }}>
        <h1 className="font-display text-[6vw] font-bold text-white tracking-widest flex justify-center gap-1">
          {title.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, rotateX: 90, y: 50, filter: 'blur(10px)' }}
              animate={phase >= 2 ? { opacity: 1, rotateX: 0, y: 0, filter: 'blur(0px)' } : { opacity: 0, rotateX: 90, y: 50, filter: 'blur(10px)' }}
              transition={{ duration: 1.2, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </h1>
        <motion.div
          className="mt-6 h-[1px] bg-gradient-to-r from-transparent via-[#F6E3BA] to-transparent w-0 mx-auto"
          animate={phase >= 2 ? { width: '80%', opacity: 0.6 } : { width: '0%', opacity: 0 }}
          transition={{ duration: 1.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      
      {/* Ambient particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#F6E3BA]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100],
            opacity: [0, 0.8, 0],
            scale: [0, Math.random() * 2 + 1, 0]
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "linear"
          }}
        />
      ))}
    </motion.div>
  );
}