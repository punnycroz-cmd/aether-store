import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HeroSection } from '../components/sections/HeroSection';
import { ForgeSection } from '../components/sections/ForgeSection';
import { VaultSection } from '../components/sections/VaultSection';
import { DiscoverSection } from '../components/sections/DiscoverSection';
import { CraftSection } from '../components/sections/CraftSection';
import { ForgeDemoSection } from '../components/sections/ForgeDemoSection';
import { CloseSection } from '../components/sections/CloseSection';
import { SiteNav } from '../components/SiteNav';

const mascotImg = `${import.meta.env.BASE_URL}assets/mascot.png`;

const LANTERN_POS = [
  { x: '50vw', y: '35vh', scale: 1.6,  opacity: 0.85 },
  { x: '10vw', y: '14vh', scale: 0.85, opacity: 0.6  },
  { x: '85vw', y: '78vh', scale: 0.6,  opacity: 0.5  },
  { x: '80vw', y: '14vh', scale: 1.0,  opacity: 0.7  },
  { x: '14vw', y: '78vh', scale: 0.8,  opacity: 0.55 },
  { x: '88vw', y: '10vh', scale: 0.7,  opacity: 0.45 },
  { x: '50vw', y: '30vh', scale: 2.2,  opacity: 0    },
];

export function LandingPage() {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const sectionEls = document.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(Number((entry.target as HTMLElement).dataset.section));
          }
        });
      },
      { threshold: 0.4 }
    );
    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const lp = LANTERN_POS[activeSection];

  return (
    <div className="relative" style={{ background: '#0f172a' }}>
      <SiteNav activeSection={activeSection} />

      <motion.div
        className="fixed z-50 pointer-events-none"
        style={{ width: '8vw', height: '8vw', minWidth: 64, minHeight: 64 }}
        animate={{ x: lp.x, y: lp.y, scale: lp.scale, opacity: lp.opacity }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.img
          src={mascotImg}
          alt=""
          className="w-full h-full object-contain drop-shadow-2xl"
          animate={{ y: [0, -14, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl -z-10"
          style={{ background: 'rgba(139,92,246,0.25)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <HeroSection />
      <ForgeSection />
      <VaultSection />
      <DiscoverSection />
      <CraftSection />
      <ForgeDemoSection />
      <CloseSection />
    </div>
  );
}
