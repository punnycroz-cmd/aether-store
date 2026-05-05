import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SiteNav } from '../components/SiteNav';
import { useLocalStore } from '../hooks/useLocalStore';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { proxyImg } from '../lib/utils';
import { toPng } from 'html-to-image';

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase = 'lobby' | 'waiting' | 'forging' | 'judging' | 'results' | 'spectating';
type GenStatus = 'idle' | 'submitting' | 'generating' | 'done' | 'error';

interface CageModel { id: string; name: string; desc: string; cost: number; accent: string }
interface Room {
  id: string; name: string; host: string; players: number; maxPlayers: number;
  entryFee: number; prize: number; timeLimit: number;
  status: 'waiting' | 'active' | 'finished'; targetTheme: string; accent: string;
}
interface LiveSubmission {
  player: string; isBot: boolean; prompt: string;
  imageUrl: string | null; score: number | null; done: boolean;
}
interface GalleryItem {
  request_id: string; prompt?: string;
  images?: { r2_url?: string; url?: string; status?: string }[];
  first_thumbnail?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAGE_MODELS: CageModel[] = [
  { id: 'Gen',    name: 'The Oracle',    desc: 'Fast & balanced',     cost: 2,  accent: '#10b981' },
  { id: 'Ani',    name: 'The Dreamsmith',desc: 'Anime & illustration',cost: 3,  accent: '#8b5cf6' },
  { id: 'Flux1 D',name: 'The Arcanist',  desc: 'High fidelity',       cost: 6,  accent: '#f472b6' },
  { id: 'Neo',    name: 'The Architect', desc: 'Ultra-detailed',       cost: 5,  accent: '#f6c043' },
];

const BOT_NAMES = ['StarWeaver', 'Arcanist', 'Dreamwright', 'The Keeper', 'Crystalmind'];

const MOCK_ROOMS: Room[] = [
  { id: 'r1', name: 'The Emerald Gauntlet',  host: 'StarWeaver',   players: 3, maxPlayers: 6, entryFee: 10, prize: 54,  timeLimit: 120, status: 'waiting',  targetTheme: 'Mystical Forest',     accent: '#10b981' },
  { id: 'r2', name: 'Void Champions',        host: 'Arcanist',     players: 5, maxPlayers: 6, entryFee: 25, prize: 135, timeLimit: 90,  status: 'active',   targetTheme: 'Cosmic Nebula',       accent: '#8b5cf6' },
  { id: 'r3', name: 'Daily Free Match',      host: 'Aether Arena', players: 2, maxPlayers: 8, entryFee: 0,  prize: 0,   timeLimit: 180, status: 'waiting',  targetTheme: 'Open Theme',          accent: '#67e8f9' },
  { id: 'r4', name: 'Grand Prix — Season 3', host: 'Dreamwright',  players: 4, maxPlayers: 4, entryFee: 50, prize: 180, timeLimit: 60,  status: 'active',   targetTheme: 'Epic Fantasy Battle', accent: '#f6c043' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STOP = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','into','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','as','it','its','this','that','these','those','very','quite','just','over','under','some','any','all','both','most','other','more','also','only','then','than','so','if','up','out','about','after','before','style','like','high','quality','ultra','detailed','highly']);

function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
}

function scorePrompts(targetPrompt: string, playerPrompt: string): number {
  const T = tokenize(targetPrompt);
  const P = tokenize(playerPrompt);
  if (T.size === 0 || P.size === 0) return 15 + Math.round(Math.random() * 20);
  const intersection = [...T].filter(t => P.has(t)).length;
  const union = new Set([...T, ...P]).size;
  const jaccard = intersection / union;
  const base = Math.round(12 + Math.pow(jaccard, 0.55) * 72);
  const noise = Math.round((Math.random() - 0.3) * 10);
  return Math.min(99, Math.max(8, base + noise));
}

function makeBotPrompt(targetPrompt: string, tier: 'high' | 'mid' | 'low'): string {
  const words = tokenize(targetPrompt);
  const arr = [...words].sort(() => Math.random() - 0.5);
  if (tier === 'high') return arr.slice(0, Math.ceil(arr.length * 0.75)).join(' ') + ', digital art, masterpiece quality';
  if (tier === 'mid')  return arr.slice(0, Math.ceil(arr.length * 0.45)).join(' ') + ', fantasy illustration, atmospheric lighting';
  return arr.slice(0, 2).join(' ') + ', beautiful scenery, cinematic, dramatic';
}

function getThumbFromItem(item: GalleryItem): string | null {
  const visible = (item.images ?? []).filter(i => i.status !== 'hidden' && i.status !== 'deleting');
  return proxyImg(visible[0]?.r2_url ?? visible[0]?.url ?? item.first_thumbnail ?? null);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimerRing({ pct, seconds, color }: { pct: number; seconds: number; color: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color }}>{seconds}</span>
      </div>
    </div>
  );
}

function SubmissionSlot({ sub, isMe }: { sub: LiveSubmission; isMe: boolean }) {
  return (
    <motion.div className="rounded-2xl overflow-hidden"
      style={{ background: isMe ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}` }}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="aspect-square relative bg-black/30">
        {sub.done && sub.imageUrl ? (
          <img src={sub.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : sub.done && !sub.imageUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6M15 9l-6 6"/></svg>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div className="flex gap-1">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isMe ? '#ef4444' : 'rgba(255,255,255,0.3)' }}
                  animate={{ opacity: [0.2,1,0.2], y: [0,-4,0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </motion.div>
          </div>
        )}
        {sub.score !== null && (
          <motion.div className="absolute top-2 right-2 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.75)', border: `1px solid ${sub.score >= 80 ? '#10b981' : sub.score >= 60 ? '#f6c043' : '#9ca3af'}` }}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: sub.score >= 80 ? '#10b981' : sub.score >= 60 ? '#f6c043' : '#9ca3af' }}>{sub.score}%</span>
          </motion.div>
        )}
        {isMe && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.7)', fontFamily: 'Outfit, sans-serif', fontSize: '0.45rem', color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            You
          </div>
        )}
      </div>
      <div className="p-2">
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: isMe ? 'rgba(248,113,113,0.8)' : 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{sub.player}</div>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {sub.done ? sub.prompt : 'Forging…'}
        </div>
      </div>
    </motion.div>
  );
}

function RoomCard({ room, onJoin, onSpectate }: { room: Room; onJoin: (r: Room) => void; onSpectate: (r: Room) => void }) {
  const isFull = room.players >= room.maxPlayers;
  const isActive = room.status === 'active';
  return (
    <motion.div className="relative rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${room.accent}25` }}
      whileHover={!isFull && !isActive ? { background: `${room.accent}08`, borderColor: `${room.accent}45` } : {}}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="h-0.5 w-full" style={{ background: isActive ? `linear-gradient(90deg, ${room.accent}, transparent)` : `${room.accent}30` }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#f8fafc', marginBottom: 2 }}>{room.name}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)' }}>Hosted by {room.host}</div>
          </div>
          <div className="px-2 py-0.5 rounded-full"
            style={{ background: isActive ? `${room.accent}18` : 'rgba(255,255,255,0.06)', border: `1px solid ${isActive ? room.accent + '40' : 'rgba(255,255,255,0.1)'}` }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: isActive ? room.accent : 'rgba(255,255,255,0.3)' }}>
              {isActive ? '● Live' : 'Open'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {[['Theme', room.targetTheme, room.accent], ['Time', `${room.timeLimit}s`, 'rgba(255,255,255,0.6)'], ['Players', `${room.players}/${room.maxPlayers}`, isFull ? '#ef4444' : 'rgba(255,255,255,0.6)']].map(([label, val, color]) => (
            <div key={label as string} className="px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: color as string }}>{val}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            {room.entryFee > 0 ? (
              <div className="flex items-center gap-1">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: '#f6c043' }}>{room.entryFee}</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}>→</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: room.accent }}>{room.prize}</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)' }}>pool</span>
              </div>
            ) : (
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: '#67e8f9' }}>Free Entry</span>
            )}
          </div>
          <div className="flex gap-1.5">
            {isActive && (
              <motion.button onClick={() => onSpectate(room)}
                className="px-3 py-1.5 rounded-xl"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: `${room.accent}10`, border: `1px solid ${room.accent}35`, color: room.accent, cursor: 'pointer' }}
                whileHover={{ background: `${room.accent}20` }} whileTap={{ scale: 0.95 }}>
                👁 Watch
              </motion.button>
            )}
            {!isActive && (
              <motion.button onClick={() => onJoin(room)} disabled={isFull}
                className="px-4 py-1.5 rounded-xl"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: isFull ? 'not-allowed' : 'pointer', background: isFull ? 'rgba(255,255,255,0.04)' : `${room.accent}22`, border: `1px solid ${isFull ? 'rgba(255,255,255,0.08)' : room.accent + '50'}`, color: isFull ? 'rgba(255,255,255,0.2)' : room.accent }}
                whileHover={!isFull ? { background: `${room.accent}35` } : {}} whileTap={!isFull ? { scale: 0.95 } : {}}>
                {isFull ? 'Full' : 'Join'}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PromptCagePage() {
  const { user } = useAuth();
  const { credits, earnCredits, spendCredits, cageHistory, addCageReplay, cageQuests, updateCageQuest } = useLocalStore();
  const [, navigate] = useLocation();

  const [phase, setPhase]           = useState<GamePhase>('lobby');
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  // Target
  const [targetImage, setTargetImage]   = useState<string | null>(null);
  const [targetPrompt, setTargetPrompt] = useState('');
  const [galleryPool, setGalleryPool]   = useState<GalleryItem[]>([]);

  // Player generation
  const [myPrompt, setMyPrompt]       = useState('');
  const [selectedModel, setSelectedModel] = useState<CageModel>(CAGE_MODELS[0]);
  const [genStatus, setGenStatus]     = useState<GenStatus>('idle');
  const [myGenImage, setMyGenImage]   = useState<string | null>(null);
  const [genError, setGenError]       = useState<string | null>(null);
  const myRequestId                   = useRef<string | null>(null);
  const myPollRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  // All player submissions
  const [submissions, setSubmissions] = useState<LiveSubmission[]>([]);

  // Timer
  const [timeLeft, setTimeLeft]       = useState(120);
  const timerRef                      = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimeouts                   = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Spectator
  const [spectRoom, setSpectRoom]     = useState<Room | null>(null);
  const [spectSubs, setSpectSubs]     = useState<LiveSubmission[]>([]);
  const [spectTarget, setSpectTarget] = useState<string | null>(null);
  const [spectPhase, setSpectPhase]   = useState<'watching' | 'results'>('watching');
  const spectTimeouts                 = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Create modal
  const [showCreate, setShowCreate]   = useState(false);
  const [createName, setCreateName]   = useState('');
  const [createFee, setCreateFee]     = useState(10);
  const [createTime, setCreateTime]   = useState(120);

  // Quests + Share
  const [claimedQuests, setClaimedQuests] = useState<Set<string>>(new Set());
  const [shareExporting, setShareExporting] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const replaySavedRef = useRef(false);

  // Pre-load gallery pool
  useEffect(() => {
    apiFetch<{ items: GalleryItem[] }>('/public-gallery?limit=30').then(data => {
      const valid = (data.items ?? []).filter(it => getThumbFromItem(it) && it.prompt);
      setGalleryPool(valid);
    }).catch(() => {});
  }, []);

  // ── Polling for user's generation ──────────────────────────────────────────

  const stopMyPoll = useCallback(() => {
    if (myPollRef.current) { clearInterval(myPollRef.current); myPollRef.current = null; }
  }, []);

  const pollMyJob = useCallback(async (rid: string) => {
    try {
      const data = await apiFetch<{ status: string; images?: { r2_url?: string; url?: string; status?: string }[]; result?: { image_urls?: string[] }; error?: string }>(`/job-status/${rid}`);
      if (data.status === 'done') {
        stopMyPoll();
        const imgs = (data.images ?? []).filter(i => i.status !== 'hidden');
        const url = imgs[0]?.r2_url ?? imgs[0]?.url ?? data.result?.image_urls?.[0] ?? null;
        setMyGenImage(url);
        setGenStatus('done');
        setSubmissions(prev => prev.map(s => s.isBot ? s : { ...s, imageUrl: url, done: true }));
      } else if (data.status === 'failed') {
        stopMyPoll();
        setGenError(data.error ?? 'Generation failed');
        setGenStatus('error');
        setSubmissions(prev => prev.map(s => s.isBot ? s : { ...s, done: true }));
      }
    } catch { /* noop - keep polling */ }
  }, [stopMyPoll]);

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'forging') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          stopMyPoll();
          setGenStatus(s => s === 'generating' ? 'done' : s);
          setSubmissions(prev => prev.map(s => ({ ...s, done: true })));
          setTimeout(() => {
            setPhase('judging');
            setTimeout(() => setPhase('results'), 2200);
          }, 400);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, stopMyPoll]);

  // ── Join a room ────────────────────────────────────────────────────────────

  async function joinRoom(room: Room) {
    setActiveRoom(room);
    setPhase('waiting');
    setMyPrompt('');
    setMyGenImage(null);
    setGenStatus('idle');
    setGenError(null);
    setSubmissions([]);
    botTimeouts.current.forEach(clearTimeout);
    botTimeouts.current = [];

    // Fetch target from gallery
    let tImg: string | null = null;
    let tPrompt = '';
    const pool = galleryPool.length > 0 ? galleryPool : [];
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      tImg = getThumbFromItem(pick);
      tPrompt = pick.prompt ?? '';
    }
    setTargetImage(tImg);
    setTargetPrompt(tPrompt);

    // Build bot roster
    const numBots = Math.min(4, room.maxPlayers - 1);
    const bots = BOT_NAMES.slice(0, numBots);
    const tiers: ('high' | 'mid' | 'low')[] = ['high', 'mid', 'low', 'mid'];
    const allSubs: LiveSubmission[] = [
      ...bots.map((name, i) => ({ player: name, isBot: true, prompt: '', imageUrl: null, score: null, done: false })),
      { player: 'You', isBot: false, prompt: '', imageUrl: null, score: null, done: false },
    ];
    setSubmissions(allSubs);
    setTimeLeft(room.timeLimit);

    // Pre-pick gallery images for bots
    const botImages = [...pool].sort(() => Math.random() - 0.5).slice(0, numBots);

    setTimeout(() => {
      setPhase('forging');

      // Schedule bot submissions
      bots.forEach((name, i) => {
        const delay = Math.floor(room.timeLimit * (0.25 + i * 0.15 + Math.random() * 0.12)) * 1000;
        const botPrompt = makeBotPrompt(tPrompt || `${room.targetTheme} fantasy art`, tiers[i]);
        const botImg = getThumbFromItem(botImages[i] ?? pool[0]);

        const t = setTimeout(() => {
          setSubmissions(prev => prev.map(s =>
            s.player === name ? { ...s, prompt: botPrompt, imageUrl: botImg, done: true } : s
          ));
        }, delay);
        botTimeouts.current.push(t);
      });
    }, 2800);
  }

  // ── Submit my prompt ───────────────────────────────────────────────────────

  async function submitMyPrompt() {
    if (!myPrompt.trim() || genStatus === 'generating' || genStatus === 'submitting') return;
    const isLoggedIn = user && !user.isGuest;

    setGenStatus('submitting');
    setGenError(null);

    // Update submission slot immediately
    setSubmissions(prev => prev.map(s => s.isBot ? s : { ...s, prompt: myPrompt }));

    if (!isLoggedIn) {
      // Guest mode: just show a placeholder score
      setGenStatus('done');
      setTimeout(() => {
        setSubmissions(prev => prev.map(s => s.isBot ? s : { ...s, done: true }));
      }, 800);
      return;
    }

    try {
      const data = await apiFetch<{ request_id: string }>('/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: myPrompt.trim(),
          model: selectedModel.id,
          count: 1,
          aspect: '1:1',
          quality: 'Fast',
          negative_prompt: '',
          seed: null,
          client_id: `cage-${Date.now()}`,
          realm: 'day',
          nsfw: false,
        }),
      });
      myRequestId.current = data.request_id;
      setGenStatus('generating');
      myPollRef.current = setInterval(() => pollMyJob(data.request_id), 3500);
      pollMyJob(data.request_id);
    } catch (e) {
      setGenError((e as Error).message ?? 'Generation failed');
      setGenStatus('error');
      setSubmissions(prev => prev.map(s => s.isBot ? s : { ...s, done: true }));
    }
  }

  // ── Compute results ────────────────────────────────────────────────────────

  const scoredResults = phase === 'results' || phase === 'judging'
    ? [...submissions].map(s => ({
        ...s,
        score: s.isBot ? scorePrompts(targetPrompt, s.prompt) : (myGenImage ? scorePrompts(targetPrompt, s.prompt) : scorePrompts(targetPrompt, myPrompt)),
      })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    : [];

  const winner = scoredResults[0];
  const myScore = scoredResults.find(s => !s.isBot)?.score ?? 0;
  const myResult = scoredResults.find(s => !s.isBot);
  const playerWon = !!winner && !winner.isBot;

  // ── Save replay + award quests when results arrive ─────────────────────────

  useEffect(() => {
    if (phase !== 'results' || replaySavedRef.current) return;
    if (!activeRoom || scoredResults.length === 0) return;
    replaySavedRef.current = true;

    addCageReplay({
      roomName: activeRoom.name,
      targetTheme: activeRoom.targetTheme,
      targetPrompt: targetPrompt ?? activeRoom.targetTheme,
      targetImage: targetImage ?? null,
      playerPrompt: myPrompt,
      playerModel: selectedModel.name,
      score: myScore,
      won: playerWon,
    });

    updateCageQuest('play', 1);
    if (playerWon) {
      updateCageQuest('win', 1);
      if (activeRoom.prize > 0) earnCredits(Math.floor(activeRoom.prize * 0.6));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Reset replaySavedRef when going back to lobby
  useEffect(() => {
    if (phase === 'lobby') replaySavedRef.current = false;
  }, [phase]);

  // ── Quest claim ────────────────────────────────────────────────────────────

  const claimQuest = (id: string) => {
    const quest = cageQuests.find(q => q.id === id);
    if (!quest || !quest.completed || claimedQuests.has(id)) return;
    setClaimedQuests(prev => new Set(prev).add(id));
    earnCredits(quest.reward);
  };

  // ── Share card export ──────────────────────────────────────────────────────

  const exportShareCard = async () => {
    if (!shareCardRef.current || shareExporting) return;
    setShareExporting(true);
    setShareMsg(null);
    try {
      const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `cage-result-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      updateCageQuest('share', 1);
      setShareMsg('Card saved!');
    } catch {
      setShareMsg('Export failed — try again');
    } finally {
      setShareExporting(false);
    }
  };

  // ── Spectate ───────────────────────────────────────────────────────────────

  async function spectateRoom(room: Room) {
    setSpectRoom(room);
    setSpectPhase('watching');
    setSpectTarget(null);
    setSpectSubs([]);
    spectTimeouts.current.forEach(clearTimeout);
    spectTimeouts.current = [];
    setPhase('spectating');

    const pool = galleryPool;
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setSpectTarget(getThumbFromItem(pick));
      const tPrompt = pick.prompt ?? `${room.targetTheme} artwork`;
      const bots = BOT_NAMES.slice(0, 5);
      const tiers: ('high' | 'mid' | 'low')[] = ['high', 'high', 'mid', 'mid', 'low'];

      bots.forEach((name, i) => {
        const botPrompt = makeBotPrompt(tPrompt, tiers[i]);
        const botImg = getThumbFromItem(pool[Math.floor(Math.random() * pool.length)]);
        const delay = 2000 + i * 3500 + Math.random() * 2000;
        const t = setTimeout(() => {
          setSpectSubs(prev => [...prev, { player: name, isBot: true, prompt: botPrompt, imageUrl: botImg, done: true, score: null }]);
        }, delay);
        spectTimeouts.current.push(t);
      });

      const endT = setTimeout(() => setSpectPhase('results'), 5000 + bots.length * 3500);
      spectTimeouts.current.push(endT);
    }
  }

  function leaveSpectate() {
    spectTimeouts.current.forEach(clearTimeout);
    spectTimeouts.current = [];
    setPhase('lobby');
    setSpectRoom(null);
    setSpectSubs([]);
  }

  function resetToLobby() {
    stopMyPoll();
    botTimeouts.current.forEach(clearTimeout);
    botTimeouts.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('lobby');
    setActiveRoom(null);
    setMyPrompt('');
    setMyGenImage(null);
    setGenStatus('idle');
    setSubmissions([]);
    setTargetImage(null);
    setTargetPrompt('');
  }

  const timerPct = activeRoom ? (timeLeft / activeRoom.timeLimit) * 100 : 0;
  const timerColor = timerPct > 50 ? '#10b981' : timerPct > 20 ? '#f6c043' : '#ef4444';
  const isLoggedIn = user && !user.isGuest;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#07101c' }}>
      <SiteNav />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 35% at 50% 0%, rgba(239,68,68,0.07), transparent 60%)' }} />

      <div className="pt-[80px] max-w-5xl mx-auto px-4 md:px-8 pb-24">
        <AnimatePresence mode="wait">

          {/* ══════════ LOBBY ══════════ */}
          {phase === 'lobby' && (
            <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center py-10">
                <motion.div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                  animate={{ boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 28px rgba(239,68,68,0.25)', '0 0 0px rgba(239,68,68,0)'] }}
                  transition={{ duration: 2.5, repeat: Infinity }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </motion.div>
                <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#f8fafc', fontWeight: 700, marginBottom: 8 }}>
                  The Prompt <span style={{ color: '#ef4444' }}>Cage</span>
                </h1>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', maxWidth: 440, margin: '0 auto 6px' }}>
                  A target image is revealed. Craft the prompt that recreates it most faithfully.
                  The AI judges. The best match wins the prize pool.
                </p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: 'rgba(239,68,68,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Prompt craft · Model choice · Speed · Winner takes all
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['See the target image', 'Write a recreating prompt', 'Choose your model', 'Submit before time runs out', 'AI scores · closest wins'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: 'rgba(239,68,68,0.5)' }}>0{i+1}</span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>{t}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#f8fafc', letterSpacing: '0.1em' }}>Active Arenas</h2>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    {MOCK_ROOMS.filter(r => r.status === 'waiting').length} open · {MOCK_ROOMS.filter(r => r.status === 'active').length} live now
                  </p>
                </div>
                <motion.button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(239,68,68,0.2)' }} whileTap={{ scale: 0.95 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Create Arena
                </motion.button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {MOCK_ROOMS.map((room, i) => (
                  <motion.div key={room.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <RoomCard room={room} onJoin={joinRoom} onSpectate={spectateRoom} />
                  </motion.div>
                ))}
              </div>

              {/* Prize breakdown */}
              <motion.div className="mt-8 rounded-2xl p-5"
                style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(139,92,246,0.06))', border: '1px solid rgba(239,68,68,0.15)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <div className="flex items-center gap-2 mb-3">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(246,192,67,0.7)' }}>Prize Pool Breakdown</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[['1st Place','60%','of pool','#f6c043'],['2nd Place','25%','of pool','#9ca3af'],['Platform','10%','sustains arenas','#ef4444'],['Daily Free','0','credits · open to all','#67e8f9']].map(([label, val, note, color]) => (
                    <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}20` }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color, marginBottom: 2 }}>{val}</div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>{note}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* ── Daily Quests ── */}
              <motion.div className="mt-7 p-4 rounded-2xl" style={{ background: 'rgba(246,192,67,0.04)', border: '1px solid rgba(246,192,67,0.14)' }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="flex items-center gap-2 mb-4">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(246,192,67,0.8)' }}>Daily Quests</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>Resets daily · claim rewards below</span>
                </div>
                <div className="space-y-2.5">
                  {cageQuests.map(q => {
                    const claimed = claimedQuests.has(q.id);
                    const canClaim = q.completed && !claimed;
                    return (
                      <div key={q.id} className="flex items-center gap-3">
                        <span style={{ fontSize: '1rem', width: 20, flexShrink: 0 }}>{q.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: claimed ? 'rgba(255,255,255,0.3)' : q.completed ? '#10b981' : 'rgba(255,255,255,0.7)' }}>{q.label}</span>
                            {claimed && <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.45rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Claimed</span>}
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(q.progress / q.goal) * 100}%`, background: claimed ? 'rgba(255,255,255,0.15)' : q.completed ? '#10b981' : 'rgba(246,192,67,0.5)' }} />
                          </div>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.48rem', color: 'rgba(255,255,255,0.2)', marginTop: 2, display: 'block' }}>{q.progress}/{q.goal}</span>
                        </div>
                        <motion.button
                          onClick={() => claimQuest(q.id)}
                          disabled={!canClaim}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg flex-shrink-0"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', fontWeight: 700, cursor: canClaim ? 'pointer' : 'default',
                            background: canClaim ? 'rgba(246,192,67,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${canClaim ? 'rgba(246,192,67,0.4)' : 'rgba(255,255,255,0.07)'}`,
                            color: canClaim ? '#f6c043' : 'rgba(255,255,255,0.2)',
                          }}
                          whileHover={canClaim ? { scale: 1.05 } : {}} whileTap={canClaim ? { scale: 0.95 } : {}}>
                          +{q.reward}
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── Match History ── */}
              {cageHistory.length > 0 && (
                <motion.div className="mt-5 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Match History</span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.15)', marginLeft: 'auto' }}>Last {Math.min(cageHistory.length, 5)} of {cageHistory.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cageHistory.slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                        style={{ background: r.won ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${r.won ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)'}` }}>
                        {r.targetImage ? (
                          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={r.targetImage} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.05)', fontSize: '1rem' }}>
                            {r.won ? '🏆' : '⚔'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.roomName}</span>
                            <span className="px-1.5 py-0.5 rounded flex-shrink-0" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.43rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                              background: r.won ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                              color: r.won ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                              {r.won ? 'WIN' : 'LOSS'}
                            </span>
                          </div>
                          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{r.playerPrompt.slice(0, 60)}{r.playerPrompt.length > 60 ? '…' : ''}"
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: r.score >= 75 ? '#10b981' : r.score >= 55 ? '#f6c043' : '#9ca3af' }}>{r.score}</div>
                          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.45rem', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}

          {/* ══════════ SPECTATOR ══════════ */}
          {phase === 'spectating' && spectRoom && (
            <motion.div key="spectating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between pt-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.7)' }}>Live Match</span>
                  </div>
                  <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#f8fafc' }}>{spectRoom.name}</h2>
                </div>
                <motion.button onClick={leaveSpectate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(255,255,255,0.08)' }}>
                  ← Leave
                </motion.button>
              </div>

              <div className="grid md:grid-cols-2 gap-5 mb-6">
                {/* Target */}
                <div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.6)', marginBottom: 8 }}>
                    Target Image
                  </div>
                  <div className="rounded-2xl overflow-hidden aspect-square" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                    {spectTarget ? <img src={spectTarget} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.05)' }}>
                        <motion.div className="w-8 h-8 rounded-full border-2 border-t-transparent"
                          style={{ borderColor: 'rgba(239,68,68,0.3)', borderTopColor: '#ef4444' }}
                          animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Live feed */}
                <div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                    Live Submissions — {spectSubs.length} / {spectRoom.players}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {spectSubs.map((s, i) => (
                      <SubmissionSlot key={s.player} sub={{
                        ...s,
                        score: spectPhase === 'results' ? scorePrompts(
                          galleryPool.find(it => getThumbFromItem(it) === spectTarget)?.prompt ?? spectRoom.targetTheme,
                          s.prompt
                        ) : null
                      }} isMe={false} />
                    ))}
                    {spectSubs.length < spectRoom.players && Array.from({ length: spectRoom.players - spectSubs.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="rounded-2xl overflow-hidden aspect-square flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>Forging…</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {spectPhase === 'results' && spectSubs.length > 0 && (
                <motion.div className="rounded-2xl p-4" style={{ background: 'rgba(246,192,67,0.05)', border: '1px solid rgba(246,192,67,0.2)' }}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#f6c043', marginBottom: 12, letterSpacing: '0.15em' }}>Match Results</div>
                  {[...spectSubs].map(s => ({
                    ...s,
                    score: scorePrompts(galleryPool.find(it => getThumbFromItem(it) === spectTarget)?.prompt ?? spectRoom.targetTheme, s.prompt)
                  })).sort((a, b) => b.score - a.score).map((s, i) => (
                    <div key={s.player} className="flex items-center gap-3 py-2" style={{ borderBottom: i < spectSubs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', width: 28 }}>{'🥇🥈🥉'[i] ?? `#${i+1}`}</span>
                      <span style={{ flex: 1, fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{s.player}</span>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: s.score >= 75 ? '#10b981' : s.score >= 55 ? '#f6c043' : '#9ca3af' }}>{s.score}%</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════ WAITING ══════════ */}
          {phase === 'waiting' && activeRoom && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <motion.div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: `${activeRoom.accent}12`, border: `1px solid ${activeRoom.accent}30` }}
                animate={{ scale: [1, 1.06, 1], boxShadow: [`0 0 0 0 ${activeRoom.accent}00`, `0 0 0 12px ${activeRoom.accent}18`, `0 0 0 0 ${activeRoom.accent}00`] }}
                transition={{ duration: 1.6, repeat: Infinity }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={activeRoom.accent} strokeWidth="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </motion.div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', color: '#f8fafc', marginBottom: 8 }}>{activeRoom.name}</h2>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: 28 }}>
                Gathering challengers · target image loading…
              </p>
              <div className="flex gap-2">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: activeRoom.accent }}
                    animate={{ opacity: [0.2,1,0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ══════════ FORGING ══════════ */}
          {phase === 'forging' && activeRoom && (
            <motion.div key="forging" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5 pt-4">
                <div>
                  <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#f8fafc' }}>{activeRoom.name}</h2>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Study the target · forge the closest match
                  </p>
                </div>
                <TimerRing pct={timerPct} seconds={timeLeft} color={timerColor} />
              </div>

              {/* Guest warning */}
              {!isLoggedIn && (
                <motion.div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(246,192,67,0.07)', border: '1px solid rgba(246,192,67,0.2)' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f6c043" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: 'rgba(246,192,67,0.8)' }}>
                    You're in guest mode — your submission won't generate a real image. <button onClick={() => navigate('/forge')} style={{ color: '#f6c043', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}>Sign in</button> to play fully.
                  </span>
                </motion.div>
              )}

              <div className="grid md:grid-cols-2 gap-5">

                {/* Left: Target + live grid */}
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.7)' }}>Target · Recreate This</span>
                    </div>
                    <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {targetImage
                        ? <img src={targetImage} alt="Target" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><div className="text-center"><div style={{ fontSize: '2rem', marginBottom: 6 }}>🎯</div><p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>{activeRoom.targetTheme}</p></div></div>
                      }
                    </div>
                  </div>
                  {/* Live submission grid */}
                  <div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
                      Live — {submissions.filter(s => s.done).length}/{submissions.length} submitted
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {submissions.map(s => <SubmissionSlot key={s.player} sub={s} isMe={!s.isBot} />)}
                    </div>
                  </div>
                </div>

                {/* Right: Prompt editor */}
                <div className="flex flex-col gap-3">
                  <div>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Your Prompt</span>
                    <textarea value={myPrompt} onChange={e => setMyPrompt(e.target.value)}
                      disabled={genStatus !== 'idle' && genStatus !== 'error'}
                      placeholder="Describe the target image as precisely as possible…"
                      className="w-full mt-1.5 rounded-xl p-3 resize-none outline-none"
                      style={{ height: 120, fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', lineHeight: 1.6 }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(239,68,68,0.45)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                  </div>

                  <div>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Model</span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {CAGE_MODELS.map(m => {
                        const active = selectedModel.id === m.id;
                        const disabled = genStatus !== 'idle' && genStatus !== 'error';
                        return (
                          <motion.button key={m.id} onClick={() => !disabled && setSelectedModel(m)}
                            className="flex items-start justify-between p-2.5 rounded-xl text-left"
                            style={{ background: active ? `${m.accent}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? m.accent + '45' : 'rgba(255,255,255,0.07)'}`, cursor: disabled ? 'not-allowed' : 'pointer' }}
                            whileHover={!disabled ? { background: `${m.accent}0e` } : {}}>
                            <div>
                              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: active ? m.accent : 'rgba(255,255,255,0.45)', marginBottom: 1 }}>{m.name}</div>
                              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>{m.desc}</div>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: '#f6c043' }}>{m.cost}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
                      Balance: <span style={{ color: '#f6c043', fontFamily: 'Cinzel, serif' }}>{credits}</span>
                    </span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
                      Cost: <span style={{ color: selectedModel.accent, fontFamily: 'Cinzel, serif' }}>{selectedModel.cost}</span> credits
                    </span>
                  </div>

                  {/* Generated image preview */}
                  <AnimatePresence>
                    {myGenImage && (
                      <motion.div className="rounded-xl overflow-hidden" style={{ aspectRatio: '1/1' }}
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <img src={myGenImage} alt="Your generation" className="w-full h-full object-cover" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {genError && (
                    <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: '#f87171' }}>{genError}</span>
                    </div>
                  )}

                  <motion.button onClick={submitMyPrompt}
                    disabled={!myPrompt.trim() || (genStatus !== 'idle' && genStatus !== 'error')}
                    className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
                    style={{
                      fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                      cursor: !myPrompt.trim() || (genStatus !== 'idle' && genStatus !== 'error') ? 'not-allowed' : 'pointer',
                      background: genStatus === 'done' ? 'rgba(16,185,129,0.1)' : !myPrompt.trim() ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.18)',
                      border: `1px solid ${genStatus === 'done' ? 'rgba(16,185,129,0.3)' : !myPrompt.trim() ? 'rgba(255,255,255,0.07)' : 'rgba(239,68,68,0.4)'}`,
                      color: genStatus === 'done' ? '#10b981' : !myPrompt.trim() ? 'rgba(255,255,255,0.2)' : '#f87171',
                    }}
                    whileHover={myPrompt.trim() && genStatus === 'idle' ? { background: 'rgba(239,68,68,0.28)' } : {}}
                    whileTap={myPrompt.trim() && genStatus === 'idle' ? { scale: 0.97 } : {}}>
                    {genStatus === 'submitting' || genStatus === 'generating' ? (
                      <>
                        <motion.div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent"
                          style={{ borderColor: 'rgba(248,113,113,0.4)', borderTopColor: '#f87171' }}
                          animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                        {genStatus === 'submitting' ? 'Submitting…' : 'Forging image…'}
                      </>
                    ) : genStatus === 'done' ? '✓ Submitted — awaiting results'
                      : 'Submit to the Cage'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ JUDGING ══════════ */}
          {phase === 'judging' && (
            <motion.div key="judging" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <motion.div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'rgba(246,192,67,0.1)', border: '1px solid rgba(246,192,67,0.3)' }}
                animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f6c043" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </motion.div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', color: '#f8fafc', marginBottom: 8 }}>AI is Judging…</h2>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                Calculating prompt similarity scores across all submissions
              </p>
            </motion.div>
          )}

          {/* ══════════ RESULTS ══════════ */}
          {phase === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8 pt-4">
                <motion.div style={{ fontSize: '3rem', marginBottom: 8 }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5, delay: 0.3 }}>
                  {winner && !winner.isBot ? '🏆' : winner?.isBot ? '💀' : '🏆'}
                </motion.div>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: winner && !winner.isBot ? '#f6c043' : '#8b5cf6', marginBottom: 4 }}>
                  {winner && !winner.isBot ? 'You Won!' : `${winner?.player ?? 'Bot'} Wins`}
                </h2>
                {winner && !winner.isBot && activeRoom && activeRoom.prize > 0 && (
                  <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
                    style={{ background: 'rgba(246,192,67,0.12)', border: '1px solid rgba(246,192,67,0.3)' }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 280 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#f6c043"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#f6c043' }}>+{Math.floor(activeRoom.prize * 0.6)} Aether Credits earned</span>
                  </motion.div>
                )}
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {activeRoom?.name} · Final Standings
                </p>
              </div>

              {/* Side by side: target + results */}
              <div className="grid md:grid-cols-[200px_1fr] gap-5 mb-6">
                <div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.6)', marginBottom: 6 }}>Target Was</div>
                  <div className="rounded-2xl overflow-hidden aspect-square" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                    {targetImage && <img src={targetImage} alt="" className="w-full h-full object-cover" />}
                  </div>
                </div>
                <div className="space-y-2">
                  {scoredResults.map((s, i) => (
                    <motion.div key={s.player}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ background: !s.isBot ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${!s.isBot ? 'rgba(239,68,68,0.2)' : i === 0 ? 'rgba(246,192,67,0.25)' : 'rgba(255,255,255,0.07)'}` }}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', width: 28, flexShrink: 0 }}>{'🥇🥈🥉'[i] ?? `#${i+1}`}</span>
                      {s.imageUrl ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{s.player[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: !s.isBot ? '#f87171' : i === 0 ? '#f6c043' : '#f8fafc' }}>{s.player}</span>
                          {!s.isBot && <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.2)', fontFamily: 'Outfit, sans-serif', fontSize: '0.45rem', color: '#f87171' }}>YOU</span>}
                        </div>
                        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{s.prompt.slice(0, 70)}{s.prompt.length > 70 ? '…' : ''}"
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: (s.score ?? 0) >= 75 ? '#10b981' : (s.score ?? 0) >= 55 ? '#f6c043' : '#9ca3af' }}>
                          {s.score ?? '--'}
                        </div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.48rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>similarity</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {targetPrompt && (
                <motion.div className="mb-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>The Original Target Prompt Was</div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, fontStyle: 'italic' }}>"{targetPrompt}"</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>Your score: {myScore}% similarity · Study it to craft better prompts next round</p>
                </motion.div>
              )}

              {/* ── Share Card ── */}
              <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>Share Card</div>

                {/* Hidden card used for PNG export */}
                <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
                  <div ref={shareCardRef} style={{ width: 480, background: '#07101c', borderRadius: 20, overflow: 'hidden', padding: '28px 24px 24px', fontFamily: 'Outfit, sans-serif', border: '1px solid rgba(239,68,68,0.25)' }}>
                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚔</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em' }}>Prompt Cage</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>aetherstudio.art</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: playerWon ? 'rgba(246,192,67,0.1)' : 'rgba(139,92,246,0.1)', border: `1px solid ${playerWon ? 'rgba(246,192,67,0.4)' : 'rgba(139,92,246,0.4)'}` }}>
                        <span style={{ fontSize: 13 }}>{playerWon ? '🏆' : '⚔'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: playerWon ? '#f6c043' : '#8b5cf6', letterSpacing: '0.06em' }}>{playerWon ? 'WINNER' : 'PLAYED'}</span>
                      </div>
                    </div>

                    {/* Images row */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: 'rgba(239,68,68,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Target</div>
                        <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          {targetImage && <img src={targetImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: 'rgba(16,185,129,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>My Attempt</div>
                        <div style={{ width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          {(myResult?.imageUrl ?? myGenImage) && <img src={myResult?.imageUrl ?? myGenImage ?? ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: myScore >= 75 ? '#10b981' : myScore >= 55 ? '#f6c043' : '#9ca3af', letterSpacing: '-0.02em' }}>{myScore}</div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>similarity</div>
                      </div>
                    </div>

                    {/* Prompt */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 12px', marginBottom: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>My Prompt</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, fontStyle: 'italic' }}>"{myPrompt.slice(0, 120)}{myPrompt.length > 120 ? '…' : ''}"</div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{activeRoom?.name} · {selectedModel.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>Prompt Cage by Aether Studio</div>
                    </div>
                  </div>
                </div>

                {/* Preview visible card */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '0.85rem' }}>⚔</span>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: '#f8fafc' }}>Result Card</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: playerWon ? 'rgba(246,192,67,0.1)' : 'rgba(139,92,246,0.1)', border: `1px solid ${playerWon ? 'rgba(246,192,67,0.35)' : 'rgba(139,92,246,0.35)'}` }}>
                      <span style={{ fontSize: '0.7rem' }}>{playerWon ? '🏆' : '⚔'}</span>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', fontWeight: 700, color: playerWon ? '#f6c043' : '#8b5cf6', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{playerWon ? 'Winner' : 'Played'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4">
                    {targetImage && (
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
                        <img src={targetImage} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, fontStyle: 'italic' }}>"{myPrompt.slice(0, 80)}{myPrompt.length > 80 ? '…' : ''}"</div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{selectedModel.name} · {activeRoom?.name}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: myScore >= 75 ? '#10b981' : myScore >= 55 ? '#f6c043' : '#9ca3af', lineHeight: 1 }}>{myScore}</div>
                      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.45rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>similarity</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <motion.button onClick={exportShareCard} disabled={shareExporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                      background: shareExporting ? 'rgba(255,255,255,0.04)' : 'rgba(139,92,246,0.12)',
                      border: `1px solid ${shareExporting ? 'rgba(255,255,255,0.07)' : 'rgba(139,92,246,0.35)'}`,
                      color: shareExporting ? 'rgba(255,255,255,0.25)' : '#a78bfa', cursor: shareExporting ? 'default' : 'pointer' }}
                    whileHover={!shareExporting ? { background: 'rgba(139,92,246,0.2)' } : {}}
                    whileTap={!shareExporting ? { scale: 0.95 } : {}}>
                    {shareExporting ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    )}
                    {shareExporting ? 'Exporting…' : 'Download PNG'}
                  </motion.button>
                  {shareMsg && (
                    <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: shareMsg.includes('failed') ? '#f87171' : '#10b981' }}>
                      {shareMsg}
                    </motion.span>
                  )}
                </div>
              </motion.div>

              <div className="flex gap-3 justify-center">
                <motion.button onClick={resetToLobby}
                  className="px-6 py-2.5 rounded-xl"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(239,68,68,0.2)' }} whileTap={{ scale: 0.95 }}>
                  Back to Lobby
                </motion.button>
                <motion.button onClick={() => activeRoom && joinRoom(activeRoom)}
                  className="px-6 py-2.5 rounded-xl"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(16,185,129,0.2)' }} whileTap={{ scale: 0.95 }}>
                  Rematch ↺
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ══════════ CREATE MODAL ══════════ */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(14px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}>
            <motion.div className="w-full max-w-md rounded-2xl p-6"
              style={{ background: '#0a1122', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#f8fafc' }}>Create a New Arena</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Arena Name</label>
                  <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. The Neon Labyrinth"
                    className="w-full mt-1 px-3 py-2 rounded-xl outline-none"
                    style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(239,68,68,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Entry Fee (credits)</label>
                    <input type="number" value={createFee} onChange={e => setCreateFee(Number(e.target.value))} min={0} max={500}
                      className="w-full mt-1 px-3 py-2 rounded-xl outline-none"
                      style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f6c043' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(246,192,67,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Time Limit (sec)</label>
                    <input type="number" value={createTime} onChange={e => setCreateTime(Number(e.target.value))} min={30} max={300} step={15}
                      className="w-full mt-1 px-3 py-2 rounded-xl outline-none"
                      style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                  </div>
                </div>
                {createFee > 0 && (
                  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(246,192,67,0.05)', border: '1px solid rgba(246,192,67,0.15)' }}>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                      6 players → pool: <span style={{ color: '#f6c043', fontFamily: 'Cinzel, serif' }}>{createFee * 6}</span> · winner: <span style={{ color: '#f6c043', fontFamily: 'Cinzel, serif' }}>{Math.floor(createFee * 6 * 0.6)}</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-5">
                <motion.button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(255,255,255,0.08)' }}>
                  Cancel
                </motion.button>
                <motion.button onClick={() => { setShowCreate(false); joinRoom({ id: 'custom', name: createName || 'My Arena', host: user?.name ?? 'You', players: 1, maxPlayers: 6, entryFee: createFee, prize: Math.floor(createFee * 6 * 0.85), timeLimit: createTime, status: 'waiting', targetTheme: 'Open Theme', accent: '#ef4444' }); }}
                  className="flex-1 py-2.5 rounded-xl"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer' }}
                  whileHover={{ background: 'rgba(239,68,68,0.25)' }} whileTap={{ scale: 0.95 }}>
                  Launch Arena
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
