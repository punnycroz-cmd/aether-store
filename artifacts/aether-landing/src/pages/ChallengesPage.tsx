import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { useAuth } from '../hooks/useAuth';

interface Challenge {
  id: string;
  title: string;
  theme: string;
  description: string;
  prompt_seed: string;
  deadline: Date;
  submissions: number;
  prize: string;
  accent: string;
  glow: string;
  tags: string[];
  icon: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  title: string;
}

const LEADERBOARD_DATA: Record<string, LeaderboardEntry[]> = {
  c1: [
    { id: 'c1-e1', name: 'Stargazer',   title: 'Twin Realm Fracture'    },
    { id: 'c1-e2', name: 'The Arcanist', title: 'Emerald Void'           },
    { id: 'c1-e3', name: 'Crystalmind', title: 'Where Worlds Bleed'     },
    { id: 'c1-e4', name: 'Dreamwright', title: 'The Fracture Point'     },
    { id: 'c1-e5', name: 'Voidwalker',  title: 'Dimensional Rift'       },
  ],
  c2: [
    { id: 'c2-e1', name: 'NeonKage',    title: 'Circuit Shrine'         },
    { id: 'c2-e2', name: 'Pixelmonk',   title: 'Digital Offering'       },
    { id: 'c2-e3', name: 'The Keeper',  title: 'Neon Temple'            },
    { id: 'c2-e4', name: 'Cybermage',   title: 'Sacred Data'            },
    { id: 'c2-e5', name: 'Ghostline',   title: 'Electric Prayer'        },
  ],
  c3: [
    { id: 'c3-e1', name: 'Botanist',    title: 'The Last Bloom'         },
    { id: 'c3-e2', name: 'Ruin Poet',   title: 'Garden of Ash'          },
    { id: 'c3-e3', name: 'Verdant',     title: 'After the Fall'         },
    { id: 'c3-e4', name: 'Moss',        title: 'Reclaimed'              },
    { id: 'c3-e5', name: 'Petal',       title: 'Growing Through'        },
  ],
};

const BASE_VOTES: Record<string, number> = {
  'c1-e1': 312, 'c1-e2': 278, 'c1-e3': 241, 'c1-e4': 189, 'c1-e5': 154,
  'c2-e1': 425, 'c2-e2': 398, 'c2-e3': 321, 'c2-e4': 267, 'c2-e5': 198,
  'c3-e1': 143, 'c3-e2': 127, 'c3-e3': 98,  'c3-e4': 74,  'c3-e5': 61,
};

const CHALLENGES: Challenge[] = [
  {
    id: 'c1', title: 'The Shattered Realm', theme: 'Epic Fantasy',
    description: 'Manifest a world torn between two dimensions — where the veil between realms has shattered and light bleeds into shadow. Show the beauty in the fracture.',
    prompt_seed: 'a shattered dimensional rift where two worlds collide, one of emerald forests and one of purple void, dramatic fantasy landscape, ultra-detailed',
    deadline: new Date(Date.now() + 5 * 86400000), submissions: 247, prize: '500 Aether Credits',
    accent: '#10b981', glow: 'rgba(16,185,129,0.25)', tags: ['fantasy', 'landscape', 'dramatic'], icon: '⚡',
  },
  {
    id: 'c2', title: 'Neon Shrine', theme: 'Cyberpunk Spirituality',
    description: 'A sacred space in the age of circuits — where the ancient and the electric coexist. Temple, shrine, or altar bathed in neon glow.',
    prompt_seed: 'cyberpunk shrine with neon lights and traditional architecture, prayer offerings, rain-slicked streets, cinematic lighting, 8k',
    deadline: new Date(Date.now() + 12 * 86400000), submissions: 183, prize: '300 Aether Credits',
    accent: '#8b5cf6', glow: 'rgba(139,92,246,0.25)', tags: ['cyberpunk', 'architecture', 'neon'], icon: '🏮',
  },
  {
    id: 'c3', title: 'The Last Garden', theme: 'Post-Apocalyptic Nature',
    description: 'Nature reclaims what humanity abandoned. A garden of impossible beauty thriving in the ruins of civilization — serene, haunting, alive.',
    prompt_seed: 'overgrown post-apocalyptic garden, nature reclaiming ruins, flowering vines on crumbling architecture, golden hour light, peaceful solitude',
    deadline: new Date(Date.now() + 19 * 86400000), submissions: 94, prize: '200 Aether Credits',
    accent: '#f6c043', glow: 'rgba(246,192,67,0.25)', tags: ['nature', 'ruins', 'peaceful'], icon: '🌿',
  },
];

function Countdown({ deadline }: { deadline: Date }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    function update() {
      const ms = deadline.getTime() - Date.now();
      if (ms <= 0) { setRemaining('Ended'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setRemaining(`${d}d ${h}h ${m}m`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deadline]);
  return <>{remaining}</>;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLOR = ['#f6c043', '#9ca3af', '#b45309'];

function Leaderboard({ challenge, accent }: { challenge: Challenge; accent: string }) {
  const entries = LEADERBOARD_DATA[challenge.id] ?? [];
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('aether_challenge_votes') ?? '{}'); }
    catch { return {}; }
  });
  const [voted, setVoted] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('aether_challenge_voted') ?? '[]')); }
    catch { return new Set(); }
  });

  function getTotalVotes(entryId: string) {
    return (BASE_VOTES[entryId] ?? 0) + (votes[entryId] ?? 0);
  }

  const sorted = [...entries].sort((a, b) => getTotalVotes(b.id) - getTotalVotes(a.id));

  function handleVote(entryId: string) {
    if (voted.has(entryId)) return;
    const newVotes = { ...votes, [entryId]: (votes[entryId] ?? 0) + 1 };
    const newVoted = new Set(voted);
    newVoted.add(entryId);
    setVotes(newVotes);
    setVoted(newVoted);
    localStorage.setItem('aether_challenge_votes', JSON.stringify(newVotes));
    localStorage.setItem('aether_challenge_voted', JSON.stringify([...newVoted]));
  }

  const maxVotes = getTotalVotes(sorted[0]?.id ?? '');

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${accent}18` }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${accent}14` }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: `${accent}80` }}>
          Current Leaderboard
        </span>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>
          — vote for your favourite
        </span>
      </div>

      {/* Podium for top 3 */}
      <div className="flex items-end justify-center gap-3 px-6 pt-5 pb-4">
        {[sorted[1], sorted[0], sorted[2]].map((entry, podiumIdx) => {
          if (!entry) return <div key={podiumIdx} className="flex-1" />;
          const rank = podiumIdx === 1 ? 0 : podiumIdx === 0 ? 1 : 2;
          const heights = ['h-16', 'h-24', 'h-12'];
          const totalV = getTotalVotes(entry.id);
          return (
            <div key={entry.id} className={`flex-1 flex flex-col items-center gap-1`}>
              <span style={{ fontSize: '1rem' }}>{MEDAL[rank]}</span>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: MEDAL_COLOR[rank], textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</div>
              <div className={`w-full rounded-t-lg mt-1 ${heights[rank]} flex items-end justify-center pb-1.5`}
                style={{ background: `${accent}${rank === 0 ? '25' : rank === 1 ? '15' : '10'}`, border: `1px solid ${accent}${rank === 0 ? '40' : '25'}`, borderBottom: 'none' }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: accent }}>{totalV}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranks 4-5 */}
      {sorted.slice(3).map((entry, i) => {
        const rank = i + 3;
        const totalV = getTotalVotes(entry.id);
        const pct = maxVotes > 0 ? (totalV / maxVotes) * 100 : 0;
        const hasVoted = voted.has(entry.id);
        return (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5"
            style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', width: 16, textAlign: 'center' }}>{rank + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', color: 'rgba(248,250,252,0.55)' }}>{entry.name}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: accent }}>{totalV}</span>
              </div>
              <div className="rounded-full h-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: accent, opacity: 0.5 }} />
              </div>
            </div>
            <motion.button onClick={() => handleVote(entry.id)}
              className="px-2.5 py-1 rounded-lg flex-shrink-0"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: hasVoted ? `${accent}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${hasVoted ? accent + '40' : 'rgba(255,255,255,0.1)'}`, color: hasVoted ? accent : 'rgba(255,255,255,0.3)', cursor: hasVoted ? 'default' : 'pointer' }}
              whileHover={!hasVoted ? { background: `${accent}15` } : {}} whileTap={!hasVoted ? { scale: 0.92 } : {}}>
              {hasVoted ? '✓ Voted' : 'Vote'}
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}

export function ChallengesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [entered, setEntered] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('aether_challenge_entries') ?? '[]')); }
    catch { return new Set(); }
  });
  const [expanded, setExpanded] = useState<string | null>('c1');

  function enterChallenge(challenge: Challenge) {
    sessionStorage.setItem('forgePrompt', challenge.prompt_seed);
    setEntered(prev => {
      const next = new Set(prev);
      next.add(challenge.id);
      localStorage.setItem('aether_challenge_entries', JSON.stringify([...next]));
      return next;
    });
    navigate('/forge');
  }

  return (
    <div className="min-h-screen" style={{ background: '#07101c' }}>
      <SiteNav />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.08), transparent 70%)' }} />

      <div className="pt-[80px] px-6 md:px-12 max-w-5xl mx-auto pb-20">

        {/* Header */}
        <motion.div className="text-center py-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.5))' }} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(139,92,246,0.7)', textTransform: 'uppercase' }}>Grand Trials</span>
            <div style={{ height: 1, width: 60, background: 'linear-gradient(270deg,transparent,rgba(139,92,246,0.5))' }} />
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#f8fafc', letterSpacing: '0.12em' }}>
            The Grand <span style={{ color: '#8b5cf6' }}>Trials</span>
          </h1>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', color: 'rgba(248,250,252,0.38)', marginTop: 10, letterSpacing: '0.05em' }}>
            Weekly challenges · Forge your vision · Vote for your favourites
          </p>
        </motion.div>

        {/* Challenges */}
        <div className="space-y-5">
          {CHALLENGES.map((ch, i) => (
            <motion.div key={ch.id}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${ch.accent}28`, backdropFilter: 'blur(12px)' }}>

              <div className="p-6 md:p-7">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-3xl flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${ch.accent}14`, border: `1px solid ${ch.accent}30` }}>
                    {ch.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1.15rem', color: '#f8fafc', letterSpacing: '0.08em' }}>
                        {ch.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full"
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', background: `${ch.accent}18`, color: ch.accent, border: `1px solid ${ch.accent}30` }}>
                        {ch.theme}
                      </span>
                      {entered.has(ch.id) && (
                        <span className="px-2 py-0.5 rounded-full"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                          ✓ Entered
                        </span>
                      )}
                    </div>

                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', color: 'rgba(248,250,252,0.4)', lineHeight: 1.6, marginBottom: 14 }}>
                      {ch.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {ch.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs mb-4"
                      style={{ fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.3)' }}>
                      <div className="flex items-center gap-1.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <Countdown deadline={ch.deadline} /> remaining
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {ch.submissions.toLocaleString()} entries
                      </div>
                      <div className="flex items-center gap-1.5" style={{ color: ch.accent }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                        {ch.prize}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <motion.button onClick={() => enterChallenge(ch)}
                        className="px-5 py-2 rounded-xl"
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: entered.has(ch.id) ? `${ch.accent}12` : `${ch.accent}20`, border: `1px solid ${ch.accent}40`, color: ch.accent, cursor: 'pointer' }}
                        whileHover={{ background: `${ch.accent}30` }} whileTap={{ scale: 0.96 }}>
                        {entered.has(ch.id) ? 'Forge Again' : 'Enter Challenge'}
                      </motion.button>
                      <motion.button
                        onClick={() => setExpanded(p => p === ch.id ? null : ch.id)}
                        className="px-4 py-2 rounded-xl"
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', background: expanded === ch.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                        whileHover={{ background: 'rgba(255,255,255,0.08)' }} whileTap={{ scale: 0.96 }}>
                        {expanded === ch.id ? 'Hide' : 'Leaderboard'}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Leaderboard */}
                <AnimatePresence>
                  {expanded === ch.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                      <Leaderboard challenge={ch} accent={ch.accent} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
