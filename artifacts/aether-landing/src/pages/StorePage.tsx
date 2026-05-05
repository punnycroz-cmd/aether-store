import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { useLocalStore } from '../hooks/useLocalStore';
import { useAuth } from '../hooks/useAuth';

type Category = 'all' | 'fantasy' | 'anime' | 'scifi' | 'portrait' | 'landscape' | 'abstract';

interface PromptPack {
  id: string;
  name: string;
  tagline: string;
  category: Category;
  prompts: string[];
  tags: string[];
  accent: string;
  glow: string;
  price: number;
  icon: string;
}

const PACKS: PromptPack[] = [
  {
    id: 'p1', name: 'Emerald Spellcasters', tagline: 'Powerful sorceresses wielding nature magic',
    category: 'fantasy',
    prompts: [
      'A crystalline sorceress floating above an ancient library, emerald spell light cascading through stained glass, ultra-detailed anime, 8k',
      'Forest witch with glowing green eyes summoning vines in a moonlit clearing, intricate robes, fantasy art',
      'Elven archmage channeling emerald lightning in a crumbling tower, dramatic lighting, detailed illustration',
      'Young mage with silver hair reading a glowing grimoire, enchanted forest background, soft magical lighting',
    ],
    tags: ['fantasy', 'magic', 'character'], accent: '#10b981', glow: 'rgba(16,185,129,0.3)', price: 0, icon: '✨',
  },
  {
    id: 'p2', name: 'Void Dreamscapes', tagline: 'Surreal environments between dimensions',
    category: 'abstract',
    prompts: [
      'Vast infinite library floating in a purple void, spiral staircases with no end, hyperdetailed, dreamlike',
      'A lone figure standing on a shattered glass platform above nothingness, stars below, cosmic horror, beautiful',
      'Portal garden where each doorway shows a different universe, lush impossible plants, award-winning digital art',
      'Fractal palace made of crystallized time, iridescent surfaces, impossible architecture, cinematic',
    ],
    tags: ['surreal', 'abstract', 'dreamlike'], accent: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', price: 50, icon: '🌌',
  },
  {
    id: 'p3', name: 'Neon Cityscape', tagline: 'Rain-soaked streets and electric skies',
    category: 'scifi',
    prompts: [
      'Cyberpunk Tokyo at 3am, neon reflections in rain puddles, lone figure with umbrella, ultra-detailed, cinematic',
      'Aerial view of a megacity at night, thousands of glowing windows, flying vehicles, blade runner aesthetic',
      'Street food vendor stall in a cyberpunk alley, steam and neon, warm vs cold contrast, photorealistic',
      'Hacker girl with neural implants in a server room full of blinking lights, moody portrait, sci-fi',
    ],
    tags: ['scifi', 'neon', 'urban'], accent: '#67e8f9', glow: 'rgba(103,232,249,0.3)', price: 50, icon: '🏙️',
  },
  {
    id: 'p4', name: 'Anime Portraits', tagline: 'Character studies full of emotion',
    category: 'anime',
    prompts: [
      'Melancholic anime girl by a rain-streaked window, soft backlight, detailed uniform, emotional atmosphere',
      'Fierce warrior with twin swords, wind-swept hair, sunset background, dynamic pose, anime key visual style',
      'Gentle healer with golden hair casting restoration magic, glowing hands, warm light, detailed clothing',
      'Mysterious shrine maiden under cherry blossoms, traditional garments, serene expression, Studio Ghibli inspired',
    ],
    tags: ['anime', 'portrait', 'character'], accent: '#f472b6', glow: 'rgba(244,114,182,0.3)', price: 0, icon: '🌸',
  },
  {
    id: 'p5', name: 'Ancient Landscapes', tagline: 'Worlds lost to time',
    category: 'landscape',
    prompts: [
      'Flooded ancient temple complex, lotus flowers, morning mist rising, time-worn stone, cinematic wide shot',
      'Abandoned sky city on floating islands, overgrown with vines, sunset light, lost civilization aesthetic',
      'Desert canyon with impossibly tall rock formations, ancient carved faces, golden hour, award-winning photo',
      'Submerged cathedral visible through crystal-clear ocean, light rays filtering down, peaceful and mysterious',
    ],
    tags: ['landscape', 'ancient', 'epic'], accent: '#f6c043', glow: 'rgba(246,192,67,0.3)', price: 75, icon: '🏛️',
  },
  {
    id: 'p6', name: 'Cosmic Portraits', tagline: 'Figures born from stars and nebulae',
    category: 'portrait',
    prompts: [
      'Goddess of stars with nebula hair and cosmic eyes, galaxies in her irises, ethereal glow, ultra-detailed',
      'Astronaut floating in a colorful nebula, visor reflecting the cosmos, peaceful solitude, award-winning',
      'Ancient cosmic deity with skin made of constellations, traditional robes, dramatic studio lighting',
      'A child astronomer at a telescope, night sky full of impossible stars, whimsical, warm lighting',
    ],
    tags: ['portrait', 'cosmic', 'stunning'], accent: '#a78bfa', glow: 'rgba(167,139,250,0.3)', price: 75, icon: '🌠',
  },
];

const CATS: { id: Category; label: string }[] = [
  { id: 'all',       label: 'All Packs'  },
  { id: 'fantasy',   label: 'Fantasy'    },
  { id: 'anime',     label: 'Anime'      },
  { id: 'scifi',     label: 'Sci-Fi'     },
  { id: 'portrait',  label: 'Portrait'   },
  { id: 'landscape', label: 'Landscape'  },
  { id: 'abstract',  label: 'Abstract'   },
];

export function StorePage() {
  const { user } = useAuth();
  const { credits, spendCredits } = useLocalStore();
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [unlocked, setUnlocked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('aether_unlocked') ?? '[]')); }
    catch { return new Set(); }
  });
  const [selectedPack, setSelectedPack] = useState<PromptPack | null>(null);
  const [, navigate] = useLocation();

  const filtered = PACKS.filter(p =>
    (category === 'all' || p.category === category) &&
    (!query || p.name.toLowerCase().includes(query.toLowerCase()) || p.tags.some(t => t.includes(query.toLowerCase())))
  );

  function unlock(pack: PromptPack) {
    if (pack.price === 0 || unlocked.has(pack.id)) return;
    if (credits < pack.price) { alert('Not enough Aether Credits'); return; }
    spendCredits(pack.price);
    setUnlocked(prev => {
      const next = new Set(prev);
      next.add(pack.id);
      localStorage.setItem('aether_unlocked', JSON.stringify([...next]));
      return next;
    });
  }

  function usePrompt(prompt: string) {
    sessionStorage.setItem('forgePrompt', prompt);
    navigate('/forge');
  }

  const isUnlocked = (pack: PromptPack) => pack.price === 0 || unlocked.has(pack.id);

  return (
    <div className="min-h-screen" style={{ background: '#07101c' }}>
      <SiteNav />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 35% at 80% 20%, rgba(246,192,67,0.05), transparent 60%)',
      }} />

      <div className="pt-[80px] max-w-6xl mx-auto px-4 md:px-8 pb-20">

        {/* Header */}
        <motion.div className="pt-8 pb-6 flex flex-wrap items-end justify-between gap-4"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.4rem,3vw,2rem)', color: '#f8fafc', letterSpacing: '0.12em' }}>
              The <span style={{ color: '#f6c043' }}>Grimoire</span> Store
            </h1>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              Curated prompt packs to elevate your craft
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(246,192,67,0.08)', border: '1px solid rgba(246,192,67,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: '#f6c043' }}>{credits}</span>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,192,67,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Credits</span>
            </div>
          )}
        </motion.div>

        {/* Search */}
        <div className="mb-5 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search packs and prompts…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none"
            style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc' }} />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 mb-7">
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-200"
              style={{
                fontFamily: 'Outfit, sans-serif',
                background: category === c.id ? 'rgba(246,192,67,0.14)' : 'rgba(255,255,255,0.04)',
                color: category === c.id ? '#f6c043' : 'rgba(255,255,255,0.3)',
                border: `1px solid ${category === c.id ? 'rgba(246,192,67,0.35)' : 'rgba(255,255,255,0.07)'}`,
              }}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Packs grid */}
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filtered.map((pack, i) => {
            const owned = isUnlocked(pack);
            return (
              <motion.div key={pack.id}
                className="rounded-2xl overflow-hidden cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${pack.accent}20` }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                whileHover={{ borderColor: `${pack.accent}45`, y: -2 }}
                onClick={() => setSelectedPack(pack)}>

                {/* Gradient header */}
                <div className="px-5 pt-5 pb-4 relative"
                  style={{ background: `linear-gradient(135deg, ${pack.accent}12, transparent)` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl mb-2">{pack.icon}</div>
                      <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#f8fafc', letterSpacing: '0.1em', marginBottom: 4 }}>
                        {pack.name}
                      </h3>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                        {pack.tagline}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {owned ? (
                        <span className="px-3 py-1 rounded-full"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                          Owned
                        </span>
                      ) : pack.price === 0 ? (
                        <span className="px-3 py-1 rounded-full"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          Free
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full"
                          style={{ background: 'rgba(246,192,67,0.1)', border: '1px solid rgba(246,192,67,0.25)' }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: '#f6c043' }}>{pack.price}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {pack.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-md"
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', letterSpacing: '0.1em', color: pack.accent, background: `${pack.accent}12`, border: `1px solid ${pack.accent}25` }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prompt previews */}
                <div className="px-5 pb-5 space-y-1.5">
                  {pack.prompts.slice(0, 2).map((p, idx) => (
                    <div key={idx} className="px-3 py-2 rounded-xl relative overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className={owned ? '' : 'select-none'}
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', color: owned ? 'rgba(255,255,255,0.55)' : 'transparent', lineHeight: 1.4, filter: owned ? 'none' : 'blur(4px)', userSelect: owned ? 'text' : 'none' }}>
                        {p.slice(0, 70)}…
                      </p>
                      {!owned && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                      )}
                    </div>
                  ))}
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', paddingTop: 4 }}>
                    +{pack.prompts.length - 2} more prompts
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pack detail modal */}
      <AnimatePresence>
        {selectedPack && (() => {
          const owned = isUnlocked(selectedPack);
          return (
            <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPack(null)}>
              <motion.div className="w-full max-w-lg rounded-2xl overflow-hidden"
                style={{ background: '#0a1220', border: `1px solid ${selectedPack.accent}30` }}
                initial={{ y: 40, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, scale: 0.96 }}
                onClick={e => e.stopPropagation()}>

                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: `linear-gradient(135deg, ${selectedPack.accent}10, transparent)` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedPack.icon}</span>
                    <div>
                      <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#f8fafc', letterSpacing: '0.1em' }}>{selectedPack.name}</h3>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>{selectedPack.prompts.length} incantations</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPack(null)}
                    style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
                  {selectedPack.prompts.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl group"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: owned ? 'rgba(255,255,255,0.6)' : 'transparent', lineHeight: 1.5, flex: 1, filter: owned ? 'none' : 'blur(6px)' }}>
                        {p}
                      </p>
                      {owned && (
                        <motion.button onClick={() => usePrompt(p)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: `${selectedPack.accent}18`, color: selectedPack.accent, border: `1px solid ${selectedPack.accent}30` }}
                          whileTap={{ scale: 0.95 }}>
                          Use
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {owned ? (
                    <motion.button onClick={() => usePrompt(selectedPack.prompts[0])}
                      className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-white"
                      style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', background: `linear-gradient(135deg,${selectedPack.accent},${selectedPack.accent}99)`, boxShadow: `0 0 24px ${selectedPack.glow}` }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      Open in Forge
                    </motion.button>
                  ) : (
                    <div className="flex gap-3">
                      {selectedPack.price === 0 ? (
                        <motion.button onClick={() => { unlock(selectedPack); }}
                          className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-white"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', background: `linear-gradient(135deg,${selectedPack.accent},${selectedPack.accent}99)`, boxShadow: `0 0 24px ${selectedPack.glow}` }}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                          Claim Free Pack
                        </motion.button>
                      ) : (
                        <motion.button onClick={() => { if (user) unlock(selectedPack); else alert('Sign in to unlock packs'); }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase tracking-widest"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', background: 'rgba(246,192,67,0.12)', border: '1px solid rgba(246,192,67,0.3)', color: '#f6c043' }}
                          whileHover={{ background: 'rgba(246,192,67,0.2)' }} whileTap={{ scale: 0.97 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                          Unlock for {selectedPack.price} Credits
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
