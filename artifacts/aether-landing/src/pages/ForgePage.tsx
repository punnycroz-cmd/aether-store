import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiteNav } from '../components/SiteNav';
import { useAuth } from '../hooks/useAuth';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { apiFetch, DAY_MODELS, STAR_MODELS, ASPECT_CHOICES, QUALITY_CHOICES } from '../lib/api';
import { proxyImg } from '../lib/utils';

const ORACLE_PROMPTS = [
  'A crystalline sorceress floating above an ancient library, emerald spell light cascading through stained glass, ultra-detailed anime, 8k',
  'Misty mountain valley with floating ruins, ancient runes glowing amber, cinematic fantasy, volumetric light',
  'A lone wanderer on a starlit bridge over a void, paper lanterns drifting upward, melancholic watercolor anime',
  'Enchanted forest glade with bioluminescent fireflies, moonlit stone altar, magical realism, masterpiece',
  'Celestial dragon coiled around a crumbling obsidian tower, aurora borealis, epic fantasy digital painting',
  'A small witch reading by candlelight in a tower full of floating books, cozy anime, warm amber tones',
  'Vast underground cavern city lit by glowing crystals, gondola boats on dark water, Studio Ghibli style',
  'Time-worn goddess statue in a flooded temple, lotus flowers, morning mist, cinematic',
  'A girl with silver hair playing violin on a cloud, stars falling as musical notes, dreamlike anime',
  'Ancient sea serpent rising from stormy waters, lighthouse in the distance, dark fantasy oil painting',
  'Portal to another realm inside a library, golden light, orbiting books, magical realism',
  'Snow leopard spirit guardian protecting a mountain shrine, ethereal glow, hyper-detailed',
  'Phantom orchestra in an abandoned grand theater, spectral musicians, gothic atmosphere, dramatic',
  'Cherry blossom tree growing from an ancient sword in stone, magical pink petals, sunrise light',
  'Clockwork sky-city suspended in clouds, steampunk meets fantasy, aerial view, intricate details',
];

interface GeneratedImage {
  url?: string;
  r2_url?: string;
  status?: string;
}

interface JobResult {
  status: 'pending' | 'processing' | 'done' | 'failed';
  images?: GeneratedImage[];
  result?: { image_urls?: string[] };
  error?: string;
  prompt?: string;
  model?: string;
  realm?: string;
}

type GenStatus = 'idle' | 'pending' | 'processing' | 'done' | 'error';

export function ForgePage() {
  const { user, loading: authLoading, continueAsGuest } = useAuth();
  const [realm, setRealm]       = useState<'day' | 'star'>('day');
  const [model, setModel]       = useState('Gen');
  const [aspect, setAspect]     = useState('1:1');
  const [quality, setQuality]   = useState('Fast');
  const [prompt, setPrompt]     = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  const [seed, setSeed]         = useState('');
  const [oraclePulse, setOraclePulse] = useState(false);

  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [images, setImages]     = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aether_prompt_history') ?? '[]'); }
    catch { return []; }
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function saveToHistory(p: string) {
    const trimmed = p.trim();
    if (!trimmed) return;
    setPromptHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 8);
      localStorage.setItem('aether_prompt_history', JSON.stringify(next));
      return next;
    });
  }

  const accent     = realm === 'day' ? '#10b981' : '#8b5cf6';
  const accentGlow = realm === 'day' ? 'rgba(16,185,129,0.26)' : 'rgba(139,92,246,0.26)';
  const border     = realm === 'day' ? 'rgba(16,185,129,0.22)' : 'rgba(139,92,246,0.22)';
  const models     = realm === 'day' ? DAY_MODELS : STAR_MODELS;

  useEffect(() => {
    const stored = sessionStorage.getItem('forgePrompt');
    if (stored) { setPrompt(stored); sessionStorage.removeItem('forgePrompt'); }
  }, []);

  useEffect(() => {
    if (!models.includes(model)) setModel(models[0]);
  }, [realm]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const pollJob = useCallback(async (rid: string) => {
    try {
      const data = await apiFetch<JobResult>(`/job-status/${rid}`);
      if (data.status === 'done') {
        stopPoll();
        const urls: string[] = [];
        if (data.images && data.images.length > 0) {
          data.images.filter(img => img.status !== 'hidden' && img.status !== 'deleting')
            .forEach(img => { const u = proxyImg(img.r2_url ?? img.url); if (u) urls.push(u); });
        } else if (data.result?.image_urls) {
          urls.push(...data.result.image_urls);
        }
        setImages(urls);
        setGenStatus('done');
      } else if (data.status === 'failed') {
        stopPoll();
        setErrorMsg(data.error ?? 'Generation failed');
        setGenStatus('error');
      } else {
        setGenStatus(data.status === 'processing' ? 'processing' : 'pending');
      }
    } catch {
      stopPoll();
      setErrorMsg('Lost connection to the Aether');
      setGenStatus('error');
    }
  }, [stopPoll]);

  async function manifest() {
    if (genStatus === 'pending' || genStatus === 'processing') return;
    if (!prompt.trim()) return;
    if (!user || user.isGuest) return;

    setGenStatus('pending');
    setImages([]);
    setErrorMsg(null);
    setRequestId(null);

    saveToHistory(prompt);

    try {
      const body = {
        prompt: prompt.trim(),
        model,
        count: 4,
        aspect,
        quality,
        negative_prompt: negPrompt.trim() || '',
        seed: seed ? parseInt(seed, 10) : null,
        client_id: `client-${Date.now()}`,
        realm,
        nsfw: realm === 'star',
      };
      const data = await apiFetch<{ request_id: string; status: string }>('/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setRequestId(data.request_id);
      setGenStatus('processing');
      pollRef.current = setInterval(() => pollJob(data.request_id), 4000);
      pollJob(data.request_id);
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Failed to start generation');
      setGenStatus('error');
    }
  }

  function cancelJob() {
    if (requestId) {
      apiFetch(`/cancel-job/${requestId}`, { method: 'POST' }).catch(() => {});
    }
    stopPoll();
    setGenStatus('idle');
    setErrorMsg(null);
  }

  function consultOracle() {
    const pick = ORACLE_PROMPTS[Math.floor(Math.random() * ORACLE_PROMPTS.length)];
    setPrompt(pick);
    setOraclePulse(true);
    setTimeout(() => setOraclePulse(false), 600);
  }

  const isGenerating = genStatus === 'pending' || genStatus === 'processing';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07101c' }}>
      <SiteNav />

      <div className="fixed inset-0 pointer-events-none" style={{
        background: realm === 'day'
          ? 'radial-gradient(ellipse 55% 45% at 12% 40%, rgba(16,185,129,0.08), transparent 70%)'
          : 'radial-gradient(ellipse 55% 45% at 12% 40%, rgba(139,92,246,0.10), transparent 70%)',
        transition: 'background 0.8s',
      }} />

      <div className="flex-1 flex items-start pt-[64px]" style={{ minHeight: '100svh' }}>

        {/* ── SIDEBAR ── */}
        <div
          className="flex-shrink-0 h-[calc(100svh-64px)] sticky top-[64px] flex flex-col"
          style={{
            width: 'clamp(270px, 26vw, 380px)',
            background: 'rgba(7,13,26,0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: `1px solid ${border}`,
            boxShadow: `6px 0 40px ${accentGlow}`,
            transition: 'border-color 0.5s, box-shadow 0.5s',
          }}
        >
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${border}` }}>
            <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }}
              animate={{ boxShadow: [`0 0 5px ${accent}`, `0 0 16px ${accent}`, `0 0 5px ${accent}`] }}
              transition={{ duration: 2, repeat: Infinity }} />
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.95rem', color: '#f8fafc', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              The Forge
            </h1>
            {user && (
              <div className="ml-auto flex items-center gap-2">
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: accent, letterSpacing: '0.12em' }}>
                  {user.name?.split(' ')[0]}
                </span>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Auth prompt */}
            {!authLoading && !user && (
              <div className="flex flex-col items-center gap-3 py-2">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Sign in to conjure
                </p>
                <GoogleSignInButton
                  theme="filled_black"
                  size="large"
                  text="signin_with"
                  width={240}
                />
                <div className="flex items-center gap-2 w-full px-2">
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>
                <motion.button onClick={continueAsGuest}
                  className="w-full py-2.5 rounded-xl text-center"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                  whileHover={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)' }}
                  whileTap={{ scale: 0.97 }}>
                  Continue as Guest
                </motion.button>
              </div>
            )}

            {/* Guest banner */}
            {!authLoading && user?.isGuest && (
              <motion.div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(246,196,67,0.06)', border: '1px solid rgba(246,196,67,0.15)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f6c443" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.55)', letterSpacing: '0.1em' }}>
                  Guest mode — results may require sign in
                </span>
              </motion.div>
            )}

            {/* Realm */}
            <Field label="Dimensional Realm">
              <div className="flex p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {(['day', 'star'] as const).map((r) => {
                  const col = r === 'day' ? '#10b981' : '#8b5cf6';
                  const on  = realm === r;
                  return (
                    <button key={r} onClick={() => { setRealm(r); setImages([]); setGenStatus('idle'); }}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif', background: on ? `${col}20` : 'transparent', color: on ? col : 'rgba(255,255,255,0.28)', border: on ? `1px solid ${col}48` : '1px solid transparent' }}>
                      {r === 'day' ? 'Day Realm' : 'Star Realm'}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Incantation */}
            <div>
              <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.22em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="flex items-center gap-1.5" style={{ color: 'rgba(246,196,67,0.65)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}`, display: 'inline-block' }} />
                  The Incantation
                </span>
                <motion.button onClick={consultOracle}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: oraclePulse ? '#f6c043' : 'rgba(246,196,67,0.45)', background: oraclePulse ? 'rgba(246,196,67,0.12)' : 'rgba(246,196,67,0.06)', border: '1px solid rgba(246,196,67,0.18)', letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.2s' }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="m13 3-1.5 5H7l4 3-1.5 5L13 13l3.5 3-1.5-5 4-3h-4.5L13 3z"/></svg>
                  Oracle
                </motion.button>
              </label>
              <motion.textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the masterpiece you wish to manifest…"
                className="w-full resize-none rounded-xl p-3.5 text-sm outline-none"
                animate={oraclePulse ? { boxShadow: [`0 0 0 2px ${accent}55`, '0 0 0 0px transparent'] } : {}}
                transition={{ duration: 0.5 }}
                style={{ fontFamily: 'Outfit, sans-serif', background: 'rgba(255,255,255,0.04)', border: `1px solid ${prompt ? accent + '55' : 'rgba(255,255,255,0.07)'}`, color: '#f8fafc', lineHeight: 1.65, transition: 'border-color 0.3s' }} />

              {/* Prompt history chips */}
              {promptHistory.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                      Past Incantations
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {promptHistory.map((h, i) => (
                      <motion.button
                        key={i}
                        onClick={() => setPrompt(h)}
                        title={h}
                        className="max-w-full text-left rounded-lg px-2.5 py-1"
                        style={{
                          fontFamily: 'Outfit, sans-serif',
                          fontSize: '0.58rem',
                          color: prompt === h ? accent : 'rgba(255,255,255,0.32)',
                          background: prompt === h ? `${accent}14` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${prompt === h ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
                          letterSpacing: '0.04em',
                          lineHeight: 1.4,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                          display: 'block',
                          transition: 'all 0.18s',
                        }}
                        whileHover={{ color: accent, background: `${accent}10`, borderColor: `${accent}33` }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {h.length > 52 ? h.slice(0, 52) + '…' : h}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wards */}
            <Field label="Wards (Exclusions)" labelColor="rgba(248,113,113,0.5)" dotColor="#ef4444" dot>
              <textarea rows={2} value={negPrompt} onChange={(e) => setNegPrompt(e.target.value)}
                placeholder="Elements to banish from the vision…"
                className="w-full resize-none rounded-xl p-3 outline-none"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(248,250,252,0.48)', lineHeight: 1.5 }} />
            </Field>

            {/* Engine */}
            <Field label="Casting Engine">
              <GlassSelect value={model} onChange={setModel}>
                {models.map((m) => <option key={m} value={m} style={{ background: '#070e1a' }}>{m}</option>)}
              </GlassSelect>
            </Field>

            {/* Aspect */}
            <Field label="Canvas Dimensions">
              <div className="flex gap-2 flex-wrap">
                {ASPECT_CHOICES.map((ar) => {
                  const [w, h] = ar.split(':').map(Number);
                  const scale = 60 / Math.max(w, h);
                  return (
                    <button key={ar} onClick={() => setAspect(ar)}
                      className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200"
                      style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', letterSpacing: '0.1em', background: aspect === ar ? `${accent}1c` : 'rgba(255,255,255,0.04)', border: `1px solid ${aspect === ar ? accent + '55' : 'rgba(255,255,255,0.07)'}`, color: aspect === ar ? accent : 'rgba(255,255,255,0.36)' }}>
                      <div style={{ width: w * scale * 0.25, height: h * scale * 0.25, border: '1.5px solid currentColor', borderRadius: 2 }} />
                      {ar}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Quality + Seed */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quality">
                <GlassSelect value={quality} onChange={setQuality}>
                  {QUALITY_CHOICES.map((q) => <option key={q} value={q} style={{ background: '#070e1a' }}>{q}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Magic Seed" labelColor="rgba(255,255,255,0.22)">
                <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random…"
                  className="w-full rounded-xl px-3 h-10 outline-none"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.78rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(248,250,252,0.48)' }} />
              </Field>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="px-5 py-4 space-y-2.5" style={{ borderTop: `1px solid ${border}` }}>
            {isGenerating ? (
              <motion.button onClick={cancelJob}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl font-bold uppercase tracking-widest"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', height: 40, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(248,113,113,0.7)', cursor: 'pointer' }}
                whileHover={{ background: 'rgba(239,68,68,0.14)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                Cancel
              </motion.button>
            ) : null}

            <motion.button
              onClick={manifest}
              disabled={isGenerating || !prompt.trim() || !user || user.isGuest}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl font-bold uppercase tracking-widest text-white"
              style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', height: 52,
                background: (isGenerating || !prompt.trim() || !user || user.isGuest) ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${accent},${accent}bb)`,
                boxShadow: (isGenerating || !prompt.trim() || !user || user.isGuest) ? 'none' : `0 0 36px ${accentGlow}`,
                cursor: (isGenerating || !prompt.trim() || !user || user.isGuest) ? 'not-allowed' : 'pointer',
                transition: 'background 0.4s, box-shadow 0.4s',
              }}
              whileHover={(!isGenerating && !!prompt.trim() && !!user && !user.isGuest) ? { scale: 1.02 } : {}}
              whileTap={(!isGenerating && !!prompt.trim() && !!user && !user.isGuest) ? { scale: 0.97 } : {}}>
              {isGenerating ? (
                <>
                  <motion.div className="w-4 h-4 border-2 rounded-full"
                    style={{ borderColor: `${accent} transparent transparent transparent` }}
                    animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
                  {genStatus === 'pending' ? 'Summoning…' : 'Weaving the Aether…'}
                </>
              ) : user?.isGuest ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Sign In to Conjure
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                  </svg>
                  {user ? 'Manifest Vision' : 'Sign In to Manifest'}
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* ── OUTPUT AREA ── */}
        <div className="flex-1 min-w-0 h-[calc(100svh-64px)] overflow-y-auto p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${accent}44,transparent)` }} />
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              Manifestations
            </span>
            <div style={{ height: 1, flex: 1, background: `linear-gradient(270deg,${accent}44,transparent)` }} />
          </div>

          {/* Error */}
          <AnimatePresence>
            {genStatus === 'error' && errorMsg && (
              <motion.div className="mb-6 px-5 py-4 rounded-2xl flex items-center gap-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.75rem', color: 'rgba(248,113,113,0.8)', letterSpacing: '0.05em' }}>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status indicator */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-2xl"
                style={{ background: `${accent}0a`, border: `1px solid ${accent}28` }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }}
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                <div>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', color: accent, letterSpacing: '0.1em' }}>
                    {genStatus === 'pending' ? 'Queuing your vision…' : 'Weaving the Aether…'}
                  </span>
                  {requestId && (
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', marginTop: 2, letterSpacing: '0.1em' }}>
                      Job {requestId.slice(0, 8)}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex gap-1">
                  {['Link', 'Auth', 'Weave', 'Vault'].map((step, i) => (
                    <div key={step} className="flex flex-col items-center gap-1">
                      <motion.div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: accent }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.42rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated images */}
          <AnimatePresence mode="wait">
            {genStatus === 'done' && images.length > 0 && (
              <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-4">
                {images.map((url, i) => (
                  <motion.div key={url} className="relative rounded-2xl overflow-hidden cursor-pointer group"
                    style={{ aspectRatio: aspect === '16:9' ? '16/9' : aspect === '5:2' ? '5/2' : aspect === '4:5' ? '4/5' : aspect === '4:7' ? '4/7' : '1/1', border: `1px solid ${accent}28` }}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.02, boxShadow: `0 0 36px ${accentGlow}` }}
                    onClick={() => setLightboxIdx(i)}>
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    {(['top-2 left-2 border-t-2 border-l-2','top-2 right-2 border-t-2 border-r-2','bottom-2 left-2 border-b-2 border-l-2','bottom-2 right-2 border-b-2 border-r-2'] as const).map((cls, ci) => (
                      <div key={ci} className={`absolute w-4 h-4 pointer-events-none opacity-0 group-hover:opacity-70 transition-opacity ${cls}`} style={{ borderColor: accent }} />
                    ))}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'linear-gradient(to top,rgba(5,8,20,0.7) 0%,transparent 50%)' }}>
                      <div className="absolute bottom-3 left-3">
                        <a href={url} download target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                          style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', color: '#fff', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.14)', textDecoration: 'none', letterSpacing: '0.08em' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Save
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Loading slots */}
            {isGenerating && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="relative rounded-2xl overflow-hidden"
                    style={{ aspectRatio: aspect === '16:9' ? '16/9' : aspect === '5:2' ? '5/2' : aspect === '4:5' ? '4/5' : '1/1', background: 'rgba(7,14,26,0.94)', border: `1px solid ${accent}28` }}>
                    <motion.div className="absolute inset-0"
                      style={{ background: `linear-gradient(110deg,transparent 15%,${accent}12 50%,transparent 85%)` }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: i * 0.18 }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: accent, letterSpacing: '0.3em' }}
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}>
                        Conjuring…
                      </motion.span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Idle */}
            {genStatus === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl flex flex-col items-center justify-center gap-2"
                    style={{ aspectRatio: aspect === '16:9' ? '16/9' : aspect === '5:2' ? '5/2' : aspect === '4:5' ? '4/5' : '1/1', background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.055)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" opacity="0.4">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.16)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Awaiting Vision</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {genStatus === 'done' && images.length > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-center mt-6"
              style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>
              {images.length} vision{images.length !== 1 ? 's' : ''} manifested · click to view · saved to your Grimoire
            </motion.p>
          )}
        </div>
      </div>

      {/* Simple lightbox for generated images */}
      <AnimatePresence>
        {lightboxIdx !== null && images[lightboxIdx] && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxIdx(null)}>
            <motion.div onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <img src={images[lightboxIdx]} className="w-full rounded-2xl" alt="" />
              <button className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.14)' }}
                onClick={() => setLightboxIdx(null)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
              {lightboxIdx > 0 && (
                <button className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
                  onClick={() => setLightboxIdx(lightboxIdx - 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                </button>
              )}
              {lightboxIdx < images.length - 1 && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.14)' }}
                  onClick={() => setLightboxIdx(lightboxIdx + 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              )}
              <a href={images[lightboxIdx]} download target="_blank" rel="noreferrer"
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl"
                style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: '#fff', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.16)', textDecoration: 'none' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, labelColor, dot, dotColor, children }: {
  label: string; labelColor?: string; dot?: boolean; dotColor?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', color: labelColor ?? 'rgba(246,196,67,0.62)', textTransform: 'uppercase', letterSpacing: '0.22em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor ?? '#f6c043', flexShrink: 0, display: 'inline-block' }} />}
        {label}
      </label>
      {children}
    </div>
  );
}

function GlassSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-4 h-10 outline-none"
      style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(248,250,252,0.7)', cursor: 'pointer' }}>
      {children}
    </select>
  );
}
