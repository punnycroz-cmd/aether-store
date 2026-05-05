import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const MODELS = ['Ani', 'Aura', 'Evo', 'Flux1 D', 'Gen', 'Gothic', 'Hyper CGI', 'Realism'];

const ASPECT_RATIOS = [
  { label: '1:1',  w: 14, h: 14 },
  { label: '4:3',  w: 18, h: 13 },
  { label: '16:9', w: 20, h: 11 },
  { label: '9:16', w: 11, h: 18 },
  { label: '21:9', w: 22, h: 9  },
];

const SAMPLE_OUTPUTS = [
  'gallery-landscape.png',
  'gallery-portrait.png',
  'gallery-architectural.png',
  'vault-gallery.png',
];

export function ForgeDemoSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.25 });

  const [realm, setRealm]       = useState<'day' | 'star'>('day');
  const [model, setModel]       = useState('Ani');
  const [aspect, setAspect]     = useState('1:1');
  const [count, setCount]       = useState('4');
  const [quality, setQuality]   = useState('Fast');
  const [prompt, setPrompt]     = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  const [seed, setSeed]         = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated]       = useState(false);

  const accent     = realm === 'day' ? '#10b981' : '#8b5cf6';
  const accentGlow = realm === 'day' ? 'rgba(16,185,129,0.30)' : 'rgba(139,92,246,0.30)';
  const borderCol  = realm === 'day' ? 'rgba(16,185,129,0.22)' : 'rgba(139,92,246,0.22)';

  function handleManifest() {
    if (isGenerating) return;
    setGenerated(false);
    setIsGenerating(true);
    setTimeout(() => { setIsGenerating(false); setGenerated(true); }, 2400);
  }

  return (
    <section
      id="forge-demo"
      data-section="5"
      ref={ref}
      className="relative w-full overflow-hidden flex flex-col items-center justify-center py-16"
      style={{ minHeight: '100svh', background: '#07101c' }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute rounded-full blur-[140px] pointer-events-none"
        style={{
          width: '60vw', height: '60vw',
          left: '-8%', top: '15%',
          background: realm === 'day'
            ? 'radial-gradient(circle, rgba(16,185,129,0.1), transparent 70%)'
            : 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)',
          transition: 'background 0.8s',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Section headline */}
      <motion.div
        className="relative z-10 text-center mb-8"
        initial={{ opacity: 0, y: -24 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2
          className="font-bold"
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(1.6rem, 3vw, 3rem)',
            color: '#fff',
          }}
        >
          Try the{' '}
          <motion.span
            style={{ color: accent, transition: 'color 0.5s' }}
          >
            Forge
          </motion.span>
        </h2>
        <p
          className="mt-2 uppercase tracking-widest"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(0.6rem, 1vw, 0.85rem)',
            color: 'rgba(248,250,252,0.38)',
          }}
        >
          Write your incantation — watch it materialise
        </p>
      </motion.div>

      {/* Two-column layout */}
      <motion.div
        className="relative z-10 w-full px-[4vw] flex items-start gap-[3vw]"
        initial={{ opacity: 0, y: 44 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 44 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
      >
        {/* ── LEFT PANEL ── */}
        <div
          className="flex-shrink-0 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 'clamp(260px, 30vw, 420px)',
            background: 'rgba(9,16,30,0.88)',
            backdropFilter: 'blur(18px)',
            border: `1px solid ${borderCol}`,
            boxShadow: `0 0 48px ${accentGlow}`,
            transition: 'border-color 0.5s, box-shadow 0.5s',
          }}
        >
          {/* Panel header */}
          <div
            className="px-6 py-4 flex items-center gap-3"
            style={{ borderBottom: `1px solid ${borderCol}` }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: accent }}
              animate={{ boxShadow: [`0 0 6px ${accent}`, `0 0 14px ${accent}`, `0 0 6px ${accent}`] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Incantation Chamber
            </span>
          </div>

          {/* Controls */}
          <div className="px-5 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: '65vh' }}>

            {/* Realm toggle */}
            <Field label="Dimensional Realm">
              <div
                className="flex p-1 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {(['day', 'star'] as const).map((r) => {
                  const col = r === 'day' ? '#10b981' : '#8b5cf6';
                  const active = realm === r;
                  return (
                    <button
                      key={r}
                      onClick={() => { setRealm(r); setGenerated(false); }}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300"
                      style={{
                        fontFamily: 'Outfit, sans-serif',
                        background: active ? `${col}1f` : 'transparent',
                        color:      active ? col : 'rgba(255,255,255,0.3)',
                        border:     active ? `1px solid ${col}44` : '1px solid transparent',
                      }}
                    >
                      {r === 'day' ? 'Day Realm' : 'Star Realm'}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Incantation */}
            <Field
              label="The Incantation"
              accent={accent}
              dot
            >
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the masterpiece you wish to manifest..."
                className="w-full resize-none rounded-xl p-3.5 text-sm outline-none"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  background: 'rgba(255,255,255,0.035)',
                  border: `1px solid ${prompt ? accent + '50' : 'rgba(255,255,255,0.07)'}`,
                  color: '#f8fafc',
                  lineHeight: 1.65,
                  transition: 'border-color 0.3s',
                }}
              />
            </Field>

            {/* Wards */}
            <Field
              label="Wards (Exclusions)"
              labelColor="rgba(248,113,113,0.5)"
              dotColor="#991b1b"
              dotBorder="rgba(239,68,68,0.4)"
            >
              <textarea
                rows={2}
                value={negPrompt}
                onChange={(e) => setNegPrompt(e.target.value)}
                placeholder="Elements to banish..."
                className="w-full resize-none rounded-xl p-3 outline-none"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(248,250,252,0.5)',
                  lineHeight: 1.5,
                }}
              />
            </Field>

            {/* Casting Engine */}
            <Field label="Casting Engine">
              <GlassSelect value={model} onChange={setModel}>
                {MODELS.map((m) => <option key={m} value={m} style={{ background: '#070e1a' }}>{m}</option>)}
              </GlassSelect>
            </Field>

            {/* Canvas Dimensions */}
            <Field label="Canvas Dimensions">
              <div className="flex gap-2 flex-wrap">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.label}
                    onClick={() => setAspect(ar.label)}
                    className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200"
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '0.58rem',
                      letterSpacing: '0.1em',
                      background: aspect === ar.label ? `${accent}1c` : 'rgba(255,255,255,0.04)',
                      border:     `1px solid ${aspect === ar.label ? accent + '55' : 'rgba(255,255,255,0.07)'}`,
                      color:      aspect === ar.label ? accent : 'rgba(255,255,255,0.38)',
                    }}
                  >
                    <div
                      style={{
                        width: ar.w * 0.85,
                        height: ar.h * 0.85,
                        border: '1.5px solid currentColor',
                        borderRadius: 2,
                      }}
                    />
                    {ar.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* Manifestations + Quality */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manifestations">
                <GlassSelect value={count} onChange={setCount}>
                  {['1', '2', '4'].map((n) => (
                    <option key={n} value={n} style={{ background: '#070e1a' }}>
                      {n} {n === '1' ? 'vision' : 'visions'}
                    </option>
                  ))}
                </GlassSelect>
              </Field>
              <Field label="Quality">
                <GlassSelect value={quality} onChange={setQuality}>
                  {['Fast', 'High Quality'].map((q) => (
                    <option key={q} value={q} style={{ background: '#070e1a' }}>{q}</option>
                  ))}
                </GlassSelect>
              </Field>
            </div>

            {/* Magic Seed */}
            <Field label="Magic Seed (Optional)" labelColor="rgba(255,255,255,0.25)">
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Leave empty for random..."
                className="w-full rounded-xl px-4 h-10 outline-none"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(248,250,252,0.5)',
                }}
              />
            </Field>
          </div>

          {/* Manifest button */}
          <div className="px-5 pb-5 pt-4" style={{ borderTop: `1px solid ${borderCol}` }}>
            <motion.button
              onClick={handleManifest}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl font-bold uppercase tracking-widest text-white"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.72rem',
                height: 50,
                background: isGenerating
                  ? 'rgba(255,255,255,0.06)'
                  : `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                boxShadow: isGenerating ? 'none' : `0 0 32px ${accentGlow}`,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'background 0.4s, box-shadow 0.4s',
              }}
              whileHover={!isGenerating ? { scale: 1.02, boxShadow: `0 0 44px ${accentGlow}` } : {}}
              whileTap={!isGenerating ? { scale: 0.98 } : {}}
            >
              {isGenerating ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 rounded-full"
                    style={{ borderColor: `${accent} transparent transparent transparent` }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
                  />
                  Weaving the Aether…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                  </svg>
                  Manifest Vision
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* ── RIGHT: OUTPUT AREA ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Divider label */}
          <div className="flex items-center gap-3">
            <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${accent}44, transparent)`, transition: 'background 0.5s' }} />
            <span
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
              }}
            >
              Manifestations
            </span>
            <div style={{ height: 1, flex: 1, background: `linear-gradient(270deg, ${accent}44, transparent)`, transition: 'background 0.5s' }} />
          </div>

          {/* Output grid */}
          <div className="grid grid-cols-2 gap-3">
            {SAMPLE_OUTPUTS.map((img, i) => (
              <div
                key={img}
                className="relative rounded-2xl overflow-hidden"
                style={{ aspectRatio: '4/3' }}
              >
                {/* Empty placeholder */}
                <AnimatePresence>
                  {!generated && !isGenerating && (
                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: `${accent}14`, border: `1px solid ${accent}2a` }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" opacity="0.45">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                      <span
                        style={{
                          fontFamily: 'Outfit, sans-serif',
                          fontSize: '0.58rem',
                          color: 'rgba(255,255,255,0.18)',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Awaiting Vision
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Generating shimmer */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        background: 'rgba(7,14,26,0.92)',
                        border: `1px solid ${accent}2a`,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(110deg, transparent 20%, ${accent}14 50%, transparent 80%)`,
                          backgroundSize: '200% 100%',
                        }}
                        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                        transition={{ duration: 1.3, repeat: Infinity, ease: 'linear', delay: i * 0.18 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.span
                          style={{
                            fontFamily: 'Cinzel, serif',
                            fontSize: '0.58rem',
                            color: accent,
                            letterSpacing: '0.35em',
                            textTransform: 'uppercase',
                          }}
                          animate={{ opacity: [0.35, 1, 0.35] }}
                          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
                        >
                          Conjuring…
                        </motion.span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Result image */}
                <AnimatePresence>
                  {generated && (
                    <motion.div
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.9, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}assets/${img}`}
                        className="w-full h-full object-cover"
                        alt={`Vision ${i + 1}`}
                      />
                      {/* Corner ornaments */}
                      {[
                        'top-2 left-2 border-t-2 border-l-2',
                        'top-2 right-2 border-t-2 border-r-2',
                        'bottom-2 left-2 border-b-2 border-l-2',
                        'bottom-2 right-2 border-b-2 border-r-2',
                      ].map((cls, ci) => (
                        <div
                          key={ci}
                          className={`absolute w-4 h-4 pointer-events-none ${cls}`}
                          style={{ borderColor: accent }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Hint line */}
          <p
            className="text-center"
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.63rem',
              color: generated ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
              letterSpacing: '0.1em',
              transition: 'color 0.5s',
            }}
          >
            {generated
              ? 'Sample visions — sign up to conjure your own'
              : 'Choose your realm, write your incantation, and manifest'}
          </p>
        </div>
      </motion.div>
    </section>
  );
}

/* ── Helpers ── */

function Field({
  label,
  labelColor,
  accent,
  dot,
  dotColor,
  dotBorder,
  children,
}: {
  label: string;
  labelColor?: string;
  accent?: string;
  dot?: boolean;
  dotColor?: string;
  dotBorder?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.62rem',
          color: labelColor ?? 'rgba(246,196,67,0.65)',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}
      >
        {dot && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor ?? accent ?? '#10b981',
              boxShadow: `0 0 6px ${dotColor ?? accent ?? '#10b981'}`,
              display: 'inline-block',
              border: dotBorder ? `1px solid ${dotBorder}` : undefined,
            }}
          />
        )}
        {label}
      </label>
      {children}
    </div>
  );
}

function GlassSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-4 h-10 outline-none appearance-none cursor-pointer text-sm font-semibold"
      style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: '0.8rem',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        color: '#f8fafc',
      }}
    >
      {children}
    </select>
  );
}
