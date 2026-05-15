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
          ? 'radial-gradient(ellipse 55% 45% at 50% 40%, rgba(16,185,129,0.08), transparent 70%)'
          : 'radial-gradient(ellipse 55% 45% at 50% 40%, rgba(139,92,246,0.10), transparent 70%)',
        transition: 'background 0.8s',
      }} />

      <div className="flex-1 flex flex-col lg:flex-row items-start pt-[88px]" style={{ minHeight: '100svh' }}>

        {/* ── SIDEBAR / CONTROL PANEL ── */}
        <div
          className="w-full lg:w-[clamp(320px,28vw,420px)] lg:h-[calc(100svh-88px)] lg:sticky lg:top-[88px] flex flex-col z-10"
          style={{
            background: 'rgba(7,13,26,0.96)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            boxShadow: `0 10px 40px rgba(0,0,0,0.4), 6px 0 40px ${accentGlow}`,
            transition: 'border-color 0.5s, box-shadow 0.5s',
          }}
        >
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${border}` }}>
            <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }}
              animate={{ boxShadow: [`0 0 5px ${accent}`, `0 0 16px ${accent}`, `0 0 5px ${accent}`] }}
              transition={{ duration: 2, repeat: Infinity }} />
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: '#f8fafc', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
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

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

            {/* Auth prompt */}
            {!authLoading && !user && (
              <div className="flex flex-col items-center gap-3 py-2">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Sign in to conjure
                </p>
                <GoogleSignInButton theme="filled_black" size="large" text="signin_with" width={240} />
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
              <motion.div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(246,196,67,0.06)', border: '1px solid rgba(246,196,67,0.15)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f6c443" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: 'rgba(246,196,67,0.55)', letterSpacing: '0.1em' }}>
                  Guest mode — results may require sign in
                </span>
              </motion.div>
            )}

            {/* Realm */}
            <Field label="Realm">
              <div className="flex p-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {(['day', 'star'] as const).map((r) => {
                  const col = r === 'day' ? '#10b981' : '#8b5cf6';
                  const on  = realm === r;
                  return (
                    <button key={r} onClick={() => { setRealm(r); setImages([]); setGenStatus('idle'); }}
                      className="flex-1 py-2.5 rounded-lg text-[0.6rem] font-bold uppercase tracking-widest transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif', background: on ? `${col}20` : 'transparent', color: on ? col : 'rgba(255,255,255,0.28)', border: on ? `1px solid ${col}48` : '1px solid transparent' }}>
                      {r === 'day' ? 'Day Realm' : 'Star Realm'}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Incantation */}
            <div>
              <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.22em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="flex items-center gap-1.5" style={{ color: 'rgba(246,196,67,0.85)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}`, display: 'inline-block' }} />
                  Prompt
                </span>
                <motion.button onClick={consultOracle}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                  style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.55rem', color: oraclePulse ? '#f6c043' : 'rgba(246,196,67,0.45)', background: oraclePulse ? 'rgba(246,196,67,0.12)' : 'rgba(246,196,67,0.06)', border: '1px solid rgba(246,196,67,0.18)', letterSpacing: '0.15em', cursor: 'pointer', transition: 'all 0.2s' }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  Oracle
                </motion.button>
              </label>
              <motion.textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your masterpiece…"
                className="w-full resize-none rounded-lg p-4 text-sm outline-none"
                animate={oraclePulse ? { boxShadow: [`0 0 0 2px ${accent}55`, '0 0 0 0px transparent'] } : {}}
                transition={{ duration: 0.5 }}
                style={{ fontFamily: 'Outfit, sans-serif', background: 'rgba(255,255,255,0.04)', border: `1px solid ${prompt ? accent + '55' : 'rgba(255,255,255,0.12)'}`, color: '#f8fafc', lineHeight: 1.65, transition: 'border-color 0.3s' }} />

              {/* Prompt history chips */}
              {promptHistory.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {promptHistory.map((h, i) => (
                      <motion.button key={i} onClick={() => setPrompt(h)} title={h}
                        className="rounded-lg px-3 py-1.5"
                        style={{
                          fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem',
                          color: prompt === h ? accent : 'rgba(255,255,255,0.32)',
                          background: prompt === h ? `${accent}14` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${prompt === h ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
                          whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}
                        whileTap={{ scale: 0.96 }}>
                        {h}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wards */}
            <Field label="Negative Prompt" labelColor="rgba(248,113,113,0.7)" dotColor="#ef4444" dot>
              <textarea rows={2} value={negPrompt} onChange={(e) => setNegPrompt(e.target.value)}
                placeholder="Elements to banish…"
                className="w-full resize-none rounded-lg p-3 outline-none text-[0.8rem]"
                style={{ fontFamily: 'Outfit, sans-serif', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(248,250,252,0.65)', lineHeight: 1.5 }} />
            </Field>

            {/* Engine */}
            <Field label="Model">
              <GlassSelect value={model} onChange={setModel}>
                {models.map((m) => <option key={m} value={m} style={{ background: '#070e1a' }}>{m}</option>)}
              </GlassSelect>
            </Field>

            {/* Aspect */}
            <Field label="Dimensions">
              <div className="flex gap-2 flex-wrap">
                {ASPECT_CHOICES.map((ar) => {
                  const [w, h] = ar.split(':').map(Number);
                  const scale = 50 / Math.max(w, h);
                  return (
                    <button key={ar} onClick={() => setAspect(ar)}
                      className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-200"
                      style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.58rem', background: aspect === ar ? `${accent}1c` : 'rgba(255,255,255,0.04)', border: `1px solid ${aspect === ar ? accent + '55' : 'rgba(255,255,255,0.1)'}`, color: aspect === ar ? accent : 'rgba(255,255,255,0.5)' }}>
                      <div style={{ width: w * scale * 0.25, height: h * scale * 0.25, border: '1.5px solid currentColor', borderRadius: 2 }} />
                      {ar}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Quality + Seed */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quality">
                <GlassSelect value={quality} onChange={setQuality}>
                  {QUALITY_CHOICES.map((q) => <option key={q} value={q} style={{ background: '#070e1a' }}>{q}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Seed">
                <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Auto"
                  className="w-full rounded-lg px-3 h-10 outline-none text-[0.8rem]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(248,250,252,0.6)' }} />
              </Field>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="px-5 py-5 space-y-3 bg-black/40" style={{ borderTop: `1px solid ${border}` }}>
            {isGenerating && (
              <motion.button onClick={cancelJob}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg font-bold uppercase tracking-widest text-[0.62rem] h-[44px]"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(248,113,113,0.7)', cursor: 'pointer' }}>
                Cancel manifestation
              </motion.button>
            )}
            <motion.button onClick={manifest} disabled={isGenerating || !prompt.trim() || !user || user.isGuest}
              className="w-full flex items-center justify-center gap-3 rounded-lg font-bold uppercase tracking-widest text-[0.72rem] h-[58px] text-white"
              style={{
                background: (isGenerating || !prompt.trim() || !user || user.isGuest) ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${accent},${accent}bb)`,
                boxShadow: (isGenerating || !prompt.trim() || !user || user.isGuest) ? 'none' : `0 0 36px ${accentGlow}`,
                cursor: (isGenerating || !prompt.trim() || !user || user.isGuest) ? 'not-allowed' : 'pointer',
              }}
              whileTap={(!isGenerating && !!prompt.trim() && !!user && !user.isGuest) ? { scale: 0.96 } : {}}>
              {isGenerating ? (
                <>
                  <motion.div className="w-4 h-4 border-2 rounded-full" style={{ borderColor: `${accent} transparent transparent transparent` }} animate={{ rotate: 360 }} transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }} />
                  Summoning...
                </>
              ) : user?.isGuest ? (
                'Sign In to Manifest'
              ) : (
                'Manifest Vision'
              )}
            </motion.button>
          </div>
        </div>

        {/* ── OUTPUT AREA ── */}
        <div className="flex-1 w-full min-w-0 p-5 md:p-10">
          <div className="flex items-center gap-4 mb-8">
            <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${accent}44,transparent)` }} />
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Manifestations</span>
            <div style={{ height: 1, flex: 1, background: `linear-gradient(270deg,${accent}44,transparent)` }} />
          </div>

          <AnimatePresence mode="wait">
            {genStatus === 'error' && errorMsg && (
              <motion.div className="mb-8 px-5 py-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                {errorMsg}
              </motion.div>
            )}

            {isGenerating && (
              <motion.div className="mb-8 p-4 rounded-2xl border border-white/10 bg-white/5 flex flex-col md:flex-row items-center gap-4">
                 <div className="flex-1 text-center md:text-left">
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', color: accent }}>{genStatus === 'pending' ? 'Queuing Manifestation...' : 'Weaving the Aether...'}</p>
                    <p className="text-[0.6rem] text-white/20 mt-1 uppercase tracking-widest">Process in progress</p>
                 </div>
              </motion.div>
            )}

            {genStatus === 'done' && images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {images.map((url, i) => (
                  <motion.div key={url} className="relative rounded-2xl overflow-hidden border border-white/10 group"
                    style={{ aspectRatio: aspect.split(':').join('/') }}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setLightboxIdx(i)}>
                    <img src={url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-end p-4">
                       <a href={url} download className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-[0.62rem] font-bold uppercase tracking-widest text-white backdrop-blur-md">Save Vision</a>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : genStatus === 'idle' || isGenerating ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center"
                    style={{ aspectRatio: aspect.split(':').join('/') }}>
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center opacity-20">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightboxIdx(null)}>
            <motion.div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <img src={images[lightboxIdx]} className="w-full rounded-3xl shadow-2xl" />
              <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white text-2xl" onClick={() => setLightboxIdx(null)}>×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, labelColor, dot, dotColor, children }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-[0.62rem] uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2" style={{ color: labelColor ?? 'rgba(246,196,67,0.85)' }}>
        {dot && <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor ?? '#f6c043' }} />}
        {label}
      </label>
      {children}
    </div>
  );
}

function GlassSelect({ value, onChange, children }: any) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-4 h-11 outline-none text-[0.8rem] transition-all cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(248,250,252,0.8)' }}>
      {children}
    </select>
  );
}
