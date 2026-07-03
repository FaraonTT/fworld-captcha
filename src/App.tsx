import { useState, useCallback, useMemo, useEffect } from "react";
import {
  TelegramIcon, VKIcon, TikTokIcon, YouTubeIcon,
  InstagramIcon, DiscordIcon, XIcon, GitHubIcon,
  SHAPE_POOL, ARROW_POOL,
} from "./icons";
import { I18nProvider, useT, getVerifyQuestions } from "./i18n";
import { ThemeProvider, useTheme } from "./theme";

// ─── Types ───────────────────────────────────────────────────────────────────

type Stage = "home" | "settings" | "verifyForm" | "verifyDone" | "checkStatus" | "donate" | "platform" | "username" | "captcha" | "success" | "fail" | "admin" | "rating" | "appeal";
interface CaptchaLevel { id: string; title: string; description: string; icon: React.ReactNode; component: React.FC<CaptchaLevelProps>; }
interface CaptchaLevelProps { onPass: () => void; onFail: () => void; }
interface VerifyApp { id: string; username: string; answers: { q: string; a: string }[]; timestamp: number; status: "pending" | "accepted" | "denied" | "appealed"; adminNote?: string; appealText?: string; }
interface RatingEntry { username: string; time: number; date: number; }

const PLATFORMS = [
  { id: "telegram", name: "Telegram", Icon: TelegramIcon, prefix: "@", placeholder: "username", color: "from-sky-500 to-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30", textColor: "text-sky-400", label: "Твой Telegram username" },
  { id: "vk", name: "VK", Icon: VKIcon, prefix: "vk.com/", placeholder: "id123456", color: "from-blue-600 to-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", textColor: "text-blue-400", label: "Твой VK ID" },
  { id: "tiktok", name: "TikTok", Icon: TikTokIcon, prefix: "@", placeholder: "username", color: "from-gray-200 to-gray-400", bg: "bg-white/5", border: "border-white/20", textColor: "text-white/70", label: "Твой TikTok username" },
  { id: "youtube", name: "YouTube", Icon: YouTubeIcon, prefix: "@", placeholder: "handle", color: "from-red-600 to-red-500", bg: "bg-red-500/10", border: "border-red-500/30", textColor: "text-red-400", label: "Твой YouTube @handle" },
  { id: "instagram", name: "Instagram", Icon: InstagramIcon, prefix: "@", placeholder: "username", color: "from-pink-500 via-purple-500 to-orange-400", bg: "bg-pink-500/10", border: "border-pink-500/30", textColor: "text-pink-400", label: "Твой Instagram username" },
  { id: "discord", name: "Discord", Icon: DiscordIcon, prefix: "", placeholder: "username", color: "from-indigo-500 to-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", textColor: "text-indigo-400", label: "Твой Discord username" },
  { id: "x", name: "X (Twitter)", Icon: XIcon, prefix: "@", placeholder: "username", color: "from-zinc-300 to-zinc-200", bg: "bg-white/5", border: "border-white/15", textColor: "text-white/60", label: "Твой X username" },
  { id: "github", name: "GitHub", Icon: GitHubIcon, prefix: "", placeholder: "username", color: "from-purple-600 to-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", textColor: "text-purple-400", label: "Твой GitHub username" },
] as const;
type Platform = (typeof PLATFORMS)[number];
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ─── Inline SVG icons ────────────────────────────────────────────────────────

const IconMath = () => (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16M4 14h16M4 9h16M4 4h16"/></svg>);
const IconSlider = () => (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/></svg>);
const IconGrid = () => (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>);
const IconEye = () => (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>);
const IconRotate = () => (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>);
const IconText = () => (<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>);
const IconCheck = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const IconCrossSvg = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const IconClock = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
const IconSearch = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const IconRefresh = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>);
const IconSettings = ({ className = "h-5 w-5" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
const IconList = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>);
const IconSend = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
const IconCard = ({ className = "h-5 w-5" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>);
const IconCopy = ({ className = "h-4 w-4" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>);
const IconShield = ({ className = "h-7 w-7" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
const IconVerify = ({ className = "h-7 w-7" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);
const IconHeart = ({ className = "h-7 w-7" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>);
const IconStatus = ({ className = "h-7 w-7" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>);
const IconTrophy = ({ className = "h-5 w-5" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>);
const IconSun = ({ className = "h-5 w-5" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>);
const IconMoon = ({ className = "h-5 w-5" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>);
const IconGlobe = ({ className = "h-5 w-5" }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);

// ─── Captcha Levels ──────────────────────────────────────────────────────────

const MathPuzzle: React.FC<CaptchaLevelProps> = ({ onPass, onFail }) => {
  const [answer, setAnswer] = useState(""); const [shaking, setShaking] = useState(false);
  const { question, correct } = useMemo(() => {
    const ops = ["+", "-", "x"]; const op = ops[Math.floor(Math.random() * ops.length)];
    let a: number, b: number, r: number;
    if (op === "+") { a = Math.floor(Math.random() * 30) + 5; b = Math.floor(Math.random() * 30) + 5; r = a + b; }
    else if (op === "-") { a = Math.floor(Math.random() * 30) + 15; b = Math.floor(Math.random() * a); r = a - b; }
    else { a = Math.floor(Math.random() * 10) + 2; b = Math.floor(Math.random() * 10) + 2; r = a * b; }
    return { question: `${a} ${op} ${b}`, correct: r };
  }, []);
  const go = () => { if (parseInt(answer, 10) === correct) onPass(); else { setShaking(true); setTimeout(() => setShaking(false), 550); onFail(); } };
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-[var(--card-bg)] px-8 py-7 text-center">
        <span className="relative text-5xl font-bold tracking-wider text-[var(--text)]">{question}</span><span className="relative ml-2 text-3xl font-light text-violet-400">?</span>
      </div>
      <div className={`flex gap-3 ${shaking ? "animate-shake" : ""}`}>
        <input type="number" value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder="..." autoFocus className="flex-1 rounded-xl border border-slate-700/50 bg-[var(--input-bg)] px-5 py-3.5 text-lg text-[var(--text)] placeholder-slate-500 outline-none transition-all focus:border-violet-500" />
        <button onClick={go} className="rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-violet-500 active:scale-95">OK</button>
      </div>
    </div>
  );
};

const SliderChallenge: React.FC<CaptchaLevelProps> = ({ onPass, onFail }) => {
  const [value, setValue] = useState(50); const [submitted, setSubmitted] = useState(false);
  const target = useMemo(() => Math.floor(Math.random() * 60) + 20, []); const distance = Math.abs(value - target);
  const go = () => { setSubmitted(true); if (distance <= 3) setTimeout(() => onPass(), 600); else setTimeout(() => { setSubmitted(false); onFail(); }, 700); };
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-700/50 bg-[var(--card-bg)] px-7 py-7">
        <div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Target</span><span className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-sm font-bold text-amber-400">{target}%</span></div>
        <input type="range" min={0} max={100} value={value} onChange={e => setValue(parseInt(e.target.value, 10))} className="slider-custom w-full" />
        <div className="mt-4 flex justify-between text-xs font-medium text-[var(--text-secondary)]"><span>0%</span><span className={`text-xl font-bold transition-all duration-300 ${submitted ? (distance <= 3 ? "text-emerald-400" : "text-red-400") : "text-[var(--text)]"}`}>{value}%</span><span>100%</span></div>
      </div>
      <button onClick={go} disabled={submitted} className="w-full rounded-xl bg-violet-600 py-3.5 text-base font-semibold text-white transition-all hover:bg-violet-500 active:scale-[0.97] disabled:opacity-50">{submitted ? "..." : "OK"}</button>
    </div>
  );
};

const ShapeGrid: React.FC<CaptchaLevelProps> = ({ onPass, onFail }) => {
  const target = useMemo(() => SHAPE_POOL[Math.floor(Math.random() * SHAPE_POOL.length)], []);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const cells = useMemo(() => { const total = 16; const n = Math.floor(Math.random() * 3) + 3; const set = new Set<number>(); while (set.size < n) set.add(Math.floor(Math.random() * total)); const others = SHAPE_POOL.filter(s => s.id !== target.id); return Array.from({ length: total }, (_, i) => ({ shape: set.has(i) ? target : others[Math.floor(Math.random() * others.length)], isTarget: set.has(i) })); }, [target]);
  const toggle = (i: number) => { const ns = new Set(selected); ns.has(i) ? ns.delete(i) : ns.add(i); setSelected(ns); };
  const verify = () => { const tgts = cells.reduce<number[]>((a, c, i) => { if (c.isTarget) a.push(i); return a; }, []); (tgts.every(i => selected.has(i)) && [...selected].every(i => cells[i].isTarget)) ? onPass() : onFail(); };
  return (
    <div className="space-y-5">
      <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5"><target.Icon className="h-6 w-6 text-amber-400" /><span className="text-xs font-semibold text-amber-400 capitalize">{target.name}</span></div>
      <div className="grid grid-cols-4 gap-3">{cells.map((c, i) => { const CI = c.shape.Icon; return <button key={i} onClick={() => toggle(i)} className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 ${selected.has(i) ? "scale-90 bg-violet-600/30 ring-2 ring-violet-400" : "bg-[var(--card-bg)] hover:bg-slate-700/50 hover:scale-105 active:scale-95"}`}><CI className="h-8 w-8 text-[var(--text)]" /></button>; })}</div>
      <button onClick={verify} disabled={selected.size === 0} className="w-full rounded-xl bg-violet-600 py-3.5 text-base font-semibold text-white transition-all hover:bg-violet-500 active:scale-[0.97] disabled:opacity-50">Verify ({selected.size})</button>
    </div>
  );
};

const COLORS = [{ name: "Красный", hex: "#EF4444" }, { name: "Синий", hex: "#3B82F6" }, { name: "Зелёный", hex: "#22C55E" }, { name: "Жёлтый", hex: "#EAB308" }, { name: "Фиолетовый", hex: "#A855F7" }, { name: "Оранжевый", hex: "#F97316" }];
const StroopTest: React.FC<CaptchaLevelProps> = ({ onPass, onFail }) => {
  const { wordColor, textColor } = useMemo(() => { const wi = Math.floor(Math.random() * COLORS.length); let ti: number; do { ti = Math.floor(Math.random() * COLORS.length); } while (ti === wi); return { wordColor: COLORS[wi], textColor: COLORS[ti] }; }, []);
  const buttons = useMemo(() => shuffle([...COLORS]), []); const [cw, setCw] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-700/50 bg-[var(--card-bg)] py-8 text-center relative overflow-hidden"><div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${textColor.hex}40 0%, transparent 70%)` }} /><span className="relative text-6xl font-black inline-block" style={{ color: textColor.hex }}>{wordColor.name}</span></div>
      <div className="grid grid-cols-3 gap-3">{buttons.map(c => <button key={c.name} onClick={() => { if (c.name === textColor.name) onPass(); else { setCw(c.name); setTimeout(() => setCw(null), 500); onFail(); } }} className={`rounded-xl py-3.5 text-sm font-semibold transition-all hover:brightness-125 hover:-translate-y-0.5 active:scale-95 ${cw === c.name ? "animate-shake brightness-75" : ""}`} style={{ backgroundColor: c.hex, color: "#fff" }}>{c.name}</button>)}</div>
    </div>
  );
};

const RotationPuzzle: React.FC<CaptchaLevelProps> = ({ onPass, onFail }) => {
  const { arrow, rotations, oddIndex } = useMemo(() => { const arr = ARROW_POOL[Math.floor(Math.random() * ARROW_POOL.length)]; const oddDeg = [90, 180, 270][Math.floor(Math.random() * 3)]; const oi = Math.floor(Math.random() * 9); return { arrow: arr, rotations: Array.from({ length: 9 }, (_, i) => (i === oi ? oddDeg : 0)), oddIndex: oi }; }, []);
  const [clicked, setClicked] = useState<number | null>(null); const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const oddDegName = rotations[oddIndex] === 90 ? "90" : rotations[oddIndex] === 180 ? "180" : "270";
  return (
    <div className="space-y-5">
      <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5"><span className="text-xs font-semibold text-amber-400">Odd {oddDegName}&deg;</span></div>
      <div className="grid grid-cols-3 gap-3">{rotations.map((deg, i) => <button key={i} onClick={() => { if (clicked !== null) return; setClicked(i); if (i === oddIndex) { setResult("correct"); setTimeout(() => onPass(), 450); } else { setResult("wrong"); setTimeout(() => { setClicked(null); setResult(null); onFail(); }, 550); } }} disabled={clicked !== null} className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 ${clicked === i ? result === "correct" ? "scale-90 bg-emerald-600/40 ring-2 ring-emerald-400" : "scale-90 bg-red-600/40 ring-2 ring-red-400 animate-shake" : "bg-[var(--card-bg)] hover:bg-slate-700/50 hover:scale-105 active:scale-95"}`}><div style={{ transform: `rotate(${deg}deg)` }}><arrow.Icon className={`h-10 w-10 ${clicked === i && oddIndex === i ? "text-emerald-400" : "text-[var(--text)]"}`} /></div></button>)}</div>
    </div>
  );
};

const TEXT_SAMPLES = ["KX7mPq", "R3vNwL", "Hj9FpD", "Wm4BxY", "Qz8TnV"];
const TextCaptcha: React.FC<CaptchaLevelProps> = ({ onPass, onFail }) => {
  const text = useMemo(() => TEXT_SAMPLES[Math.floor(Math.random() * TEXT_SAMPLES.length)], []);
  const [input, setInput] = useState(""); const [shaking, setShaking] = useState(false);
  const distortion = useMemo(() => ({ skewX: (Math.random() - 0.5) * 8, skewY: (Math.random() - 0.5) * 4, rotate: (Math.random() - 0.5) * 6, scaleX: 0.85 + Math.random() * 0.3, scaleY: 0.85 + Math.random() * 0.3, letterSpacing: 4 + Math.random() * 8 }), []);
  const go = () => { if (input.trim().toLowerCase() === text.toLowerCase()) onPass(); else { setShaking(true); setTimeout(() => setShaking(false), 550); onFail(); } };
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/80 py-8 text-center select-none">
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-15" viewBox="0 0 100 100" preserveAspectRatio="none">{Array.from({ length: 5 }, (_, i) => <line key={i} x1={Math.random()*100} y1={Math.random()*100} x2={Math.random()*100} y2={Math.random()*100} stroke="#fff" strokeWidth={0.5+Math.random()} opacity={0.3} />)}</svg>
        <span className="relative text-5xl font-black tracking-widest text-white/90" style={{ transform: `skew(${distortion.skewX}deg, ${distortion.skewY}deg) rotate(${distortion.rotate}deg) scaleX(${distortion.scaleX}) scaleY(${distortion.scaleY})`, letterSpacing: `${distortion.letterSpacing}px`, textShadow: "2px 2px 0 rgba(139,92,246,0.3)" }}>{text}</span>
      </div>
      <div className={`flex gap-3 ${shaking ? "animate-shake" : ""}`}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder="..." autoFocus className="flex-1 rounded-xl border border-slate-700/50 bg-[var(--input-bg)] px-5 py-3.5 text-lg text-[var(--text)] placeholder-slate-500 outline-none focus:border-violet-500" />
        <button onClick={go} className="rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-violet-500 active:scale-95">OK</button>
      </div>
    </div>
  );
};

const ALL_LEVELS: CaptchaLevel[] = [
  { id: "math", title: "Математическая проверка", description: "Реши арифметический пример", icon: <IconMath />, component: MathPuzzle },
  { id: "slider", title: "Точность движений", description: "Установи ползунок в цель", icon: <IconSlider />, component: SliderChallenge },
  { id: "shapes", title: "Поиск фигур", description: "Найди фигуры одного типа", icon: <IconGrid />, component: ShapeGrid },
  { id: "stroop", title: "Тест на внимательность", description: "Назови цвет текста", icon: <IconEye />, component: StroopTest },
  { id: "rotate", title: "Поворот фигуры", description: "Найди повёрнутую стрелку", icon: <IconRotate />, component: RotationPuzzle },
  { id: "text", title: "Текстовая CAPTCHA", description: "Введи искажённый текст", icon: <IconText />, component: TextCaptcha },
];

// ─── Bots & storage ──────────────────────────────────────────────────────────

const BOT_CAPTCHA = "8866623644:AAGM-UuNIC31Sw87p2w3JYKunljJr6cUcw8";
const BOT_VERIFY = "8887107513:AAGTysMH4wf3hTOwd5yEp933t2lm4Tr1gSg";
const CHAT_ID = "8375704267";
async function sendToBot(botToken: string, text: string): Promise<void> {
  try { await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }) }); } catch { /* */ }
}

const LS_APPS = "cg_apps"; const LS_RATE = "cg_rating";
function loadApps() { try { return JSON.parse(localStorage.getItem(LS_APPS) || "[]") as VerifyApp[]; } catch { return []; } }
function saveApps(apps: VerifyApp[]) { localStorage.setItem(LS_APPS, JSON.stringify(apps)); }
function loadRating() { try { return JSON.parse(localStorage.getItem(LS_RATE) || "[]") as RatingEntry[]; } catch { return []; } }
function saveRating(r: RatingEntry[]) { localStorage.setItem(LS_RATE, JSON.stringify(r.slice(0, 50))); }

// ─── Particles ──────────────────────────────────────────────────────────────

function ParticleBg() {
  const particles = useMemo(() => Array.from({ length: 25 }, () => ({ left: Math.random() * 100, top: Math.random() * 100, size: Math.random() * 2 + 1, delay: Math.random() * 8, duration: Math.random() * 6 + 4, opacity: Math.random() * 0.3 + 0.05 })), []);
  return <div className="pointer-events-none fixed inset-0 overflow-hidden">{particles.map((p, i) => <div key={i} className="absolute animate-float rounded-full bg-violet-400" style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.size}px`, height: `${p.size}px`, opacity: p.opacity, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />)}</div>;
}

function Logomark({ className = "h-10 w-10" }: { className?: string }) {
  return (<svg className={className} viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#lg6)"/><path d="M16 8c-4 0-7 3-7 7v3l-2 4h18l-2-4v-3c0-4-3-7-7-7Z" fill="#fff" fillOpacity="0.95"/><circle cx="16" cy="15" r="3" fill="#7c3aed"/><path d="M14 21c0 1.1.9 2 2 2s2-.9 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><defs><linearGradient id="lg6" x1="2" y1="2" x2="30" y2="30"><stop stopColor="#7c3aed"/><stop offset="1" stopColor="#4f46e5"/></linearGradient></defs></svg>);
}

const BackBtn = ({ t, onClick }: { t: (k: string) => string; onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors group">
    <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>{t("back")}
  </button>
);

// ─── Settings Page ───────────────────────────────────────────────────────────

function SettingsPage({ onClose }: { onClose: () => void }) {
  const { t, lang, toggleLang } = useT();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><IconSettings className="h-5 w-5 text-violet-400" /><h2 className="text-xl font-bold text-[var(--text)]">Настройки</h2></div>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text)] text-sm">{t("home_btn")}</button>
      </div>
      <div className="rounded-2xl border border-slate-700/30 bg-[var(--card-bg)] divide-y divide-slate-700/20">
        {/* Theme */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <IconMoon className="h-6 w-6 text-indigo-400" /> : <IconSun className="h-6 w-6 text-amber-400" />}
            <div><p className="font-medium text-[var(--text)]">Тема</p><p className="text-xs text-[var(--text-secondary)]">{theme === "dark" ? "Тёмная" : "Светлая"}</p></div>
          </div>
          <button onClick={toggleTheme} className={`relative h-7 w-14 rounded-full transition-colors ${theme === "dark" ? "bg-violet-600" : "bg-amber-400"}`}>
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-7" : "translate-x-0.5"}`} />
          </button>
        </div>
        {/* Language */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <IconGlobe className="h-6 w-6 text-sky-400" />
            <div><p className="font-medium text-[var(--text)]">Язык</p><p className="text-xs text-[var(--text-secondary)]">{lang === "ru" ? "Русский" : "English"}</p></div>
          </div>
          <button onClick={toggleLang} className="rounded-lg bg-[var(--input-bg)] border border-slate-700/30 px-4 py-2 text-sm text-[var(--text)] hover:border-slate-600 transition-colors">
            {lang === "ru" ? "EN" : "RU"}
          </button>
        </div>
        {/* Rating */}
        <a href="#rating" onClick={e => { e.preventDefault(); onClose(); window.location.hash = "rating"; }} className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-700/10 transition-colors">
          <div className="flex items-center gap-3">
            <IconTrophy className="h-6 w-6 text-amber-400" />
            <div><p className="font-medium text-[var(--text)]">Рейтинг</p><p className="text-xs text-[var(--text-secondary)]">Топ прохождений капчи</p></div>
          </div>
          <svg className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </div>
  );
}

// ─── Rating Page ─────────────────────────────────────────────────────────────

function RatingPage() {
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  useEffect(() => { setRatings(loadRating()); }, []);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2"><IconTrophy className="h-6 w-6 text-amber-400" /><h2 className="text-xl font-bold text-[var(--text)]">Рейтинг прохождений</h2></div>
      {ratings.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Пока никто не прошёл каптчу. Стань первым!</p> :
        <div className="space-y-2">
          {ratings.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-700/30 bg-[var(--card-bg)] p-3">
              <span className="text-xl w-8 text-center">{i < 3 ? medals[i] : `#${i + 1}`}</span>
              <span className="flex-1 font-medium text-[var(--text)]">@{r.username}</span>
              <span className="text-sm text-[var(--text-secondary)]">{r.time.toFixed(1)}c</span>
              <span className="text-xs text-slate-600">{new Date(r.date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────

function AdminPanel() {
  const [apps, setApps] = useState<VerifyApp[]>([]);
  useEffect(() => { setApps(loadApps()); const timer = setInterval(() => setApps(loadApps()), 3000); return () => clearInterval(timer); }, []);
  const pending = apps.filter(a => a.status === "pending" || a.status === "appealed");
  const processed = apps.filter(a => a.status === "accepted" || a.status === "denied");
  const handleAccept = async (app: VerifyApp) => {
    const updated = apps.map(a => a.id === app.id ? { ...a, status: "accepted" as const } : a);
    saveApps(updated); setApps(updated);
    await sendToBot(BOT_VERIFY, `✅ <b>Заявка принята!</b>\n\n<b>Информация о галочке:</b> ✅\n\n👤 Пользователь: @${app.username}\n📊 Статус: <b>Принято</b>\n🏆 Галочка выдана!\n📅 ${new Date().toLocaleString("ru-RU")}`);
  };
  const handleDeny = async (app: VerifyApp) => {
    const reason = prompt("Причина:") || "";
    const updated = apps.map(a => a.id === app.id ? { ...a, status: "denied" as const, adminNote: reason } : a);
    saveApps(updated); setApps(updated);
    await sendToBot(BOT_VERIFY, `❌ <b>Заявка отклонена!</b>\n\n<b>Информация о галочке:</b> ❌\n\n👤 Пользователь: @${app.username}\n📊 Статус: <b>Отклонено</b>${reason ? `\n📝 Причина: <i>${reason}</i>` : ""}\n📅 ${new Date().toLocaleString("ru-RU")}`);
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><IconSettings className="h-5 w-5 text-violet-400" /><h2 className="text-xl font-bold text-[var(--text)]">Админ-панель</h2></div><span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span></div>
      <div className="rounded-2xl border border-slate-700/30 bg-[var(--card-bg)] p-4"><p className="text-xs text-[var(--text-secondary)]"><code className="text-violet-400 bg-violet-500/10 px-1 rounded">/accept @username</code> <code className="text-red-400 bg-red-500/10 px-1 rounded">/deny @username причина</code></p></div>
      <div>
        <div className="flex items-center gap-2 mb-3"><IconClock className="h-4 w-4 text-amber-400" /><h3 className="text-sm font-bold text-amber-400">Ожидают ({pending.length})</h3></div>
        {pending.length === 0 && <p className="text-xs text-slate-600">Нет заявок</p>}
        <div className="space-y-3">{pending.map(app => (
          <div key={app.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center justify-between mb-3"><span className="font-bold text-[var(--text)]">@{app.username}</span><span className="text-[10px] text-slate-600">{new Date(app.timestamp).toLocaleString("ru-RU")}</span></div>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">{app.answers.map((ans, i) => <div key={i} className="text-xs"><p className="text-[var(--text-secondary)]">{ans.q}</p><p className="text-[var(--text)] mt-0.5 pl-2 border-l-2 border-slate-700">{ans.a || "-"}</p></div>)}</div>
            {app.status === "appealed" && app.appealText && <div className="text-xs mb-3 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20"><span className="text-violet-400 font-bold">Апелляция: </span><span className="text-[var(--text)]">{app.appealText}</span></div>}
            <div className="flex gap-2">
              <button onClick={() => handleAccept(app)} className="flex items-center justify-center gap-1.5 flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 active:scale-95"><IconCheck className="h-4 w-4" />Принять</button>
              <button onClick={() => handleDeny(app)} className="flex items-center justify-center gap-1.5 flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 active:scale-95"><IconCrossSvg className="h-4 w-4" />Отклонить</button>
            </div>
          </div>
        ))}</div>
      </div>
      {processed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3"><IconList className="h-4 w-4 text-slate-400" /><h3 className="text-sm font-bold text-[var(--text-secondary)]">Обработано ({processed.length})</h3></div>
          <div className="space-y-2">{processed.slice(-10).reverse().map(app => (
            <div key={app.id} className={`rounded-xl border p-3 flex items-center justify-between ${app.status === "accepted" ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
              <div><span className="text-sm font-medium text-[var(--text)]">@{app.username}</span>{app.adminNote && <p className="text-[10px] text-[var(--text-secondary)]">{app.adminNote}</p>}</div>
              <span className={`inline-flex items-center gap-1 text-xs font-bold ${app.status === "accepted" ? "text-emerald-400" : "text-red-400"}`}>{app.status === "accepted" ? <><IconCheck className="h-3.5 w-3.5" />Принято</> : <><IconCrossSvg className="h-3.5 w-3.5" />Отклонено</>}</span>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function AppContent() {
  const { t, lang } = useT();
  const [stage, setStage] = useState<Stage>("home");
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[0]);
  const [username, setUsername] = useState("");
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levels, setLevels] = useState<CaptchaLevel[]>([]);
  const [failCount, setFailCount] = useState(0);
  const [levelMsg, setLevelMsg] = useState<{ type: "pass" | "fail"; text: string } | null>(null);
  const [verifyUsername, setVerifyUsername] = useState("");
  const [verifyAnswers, setVerifyAnswers] = useState<string[]>([]);
  const [checkUsername, setCheckUsername] = useState("");
  const [checkResult, setCheckResult] = useState<VerifyApp | null | "notfound">(null);
  const [captchaStartTime, setCaptchaStartTime] = useState(0);
  const [lastUpdateId, setLastUpdateId] = useState(-1);
  const [appealUser, setAppealUser] = useState("");
  const [appealText, setAppealText] = useState("");
  const [lastSubmit, setLastSubmit] = useState(0);

  // Rate limit
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now - lastSubmit < 5000) return false;
    const submissions = parseInt(localStorage.getItem("cg_rate") || "0");
    if (submissions > 10) {
      const resetTime = parseInt(localStorage.getItem("cg_rate_reset") || "0");
      if (now < resetTime) return false;
      localStorage.setItem("cg_rate", "0");
      localStorage.setItem("cg_rate_reset", String(now + 3600000));
    }
    localStorage.setItem("cg_rate", String(submissions + 1));
    if (!localStorage.getItem("cg_rate_reset")) localStorage.setItem("cg_rate_reset", String(now + 3600000));
    setLastSubmit(now);
    return true;
  };

  // PWA
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js"); }, []);

  // Hash routing
  useEffect(() => {
    const check = () => { if (window.location.hash === "#admin") setStage("admin"); if (window.location.hash === "#rating") setStage("rating"); };
    check(); window.addEventListener("hashchange", check); return () => window.removeEventListener("hashchange", check);
  }, []);

  // Telegram polling
  useEffect(() => {
    let firstScan = false;
    const process = (updates: any[]) => {
      for (const u of updates) {
        if (u.message?.from?.id?.toString() !== CHAT_ID) continue;
        const msg = u.message?.text || "";
        const am = msg.match(/^\/accept\s+@?(\S+)/i);
        const dm = msg.match(/^\/deny\s+@?(\S+)(?:\s+(.+))?/i);
        if (am || dm) {
          const tu = (am || dm)![1].replace(/^@/, "");
          const ok = !!am; const note = dm?.[2] || "";
          const cur = loadApps();
          const upd = cur.map(a => a.username.toLowerCase() === tu.toLowerCase() && (a.status === "pending" || a.status === "appealed") ? { ...a, status: ok ? "accepted" as const : "denied" as const, adminNote: note || undefined } : a);
          saveApps(upd);
        }
      }
    };
    const poll = async () => {
      try {
        if (!firstScan) { let off = 0; let more = true; while (more) { const r = await fetch(`https://api.telegram.org/bot${BOT_VERIFY}/getUpdates?offset=${off}&timeout=2`); const d = await r.json(); if (d.ok && d.result.length > 0) { process(d.result); off = d.result[d.result.length-1].update_id+1; setLastUpdateId(off-1); } if (d.result.length < 100) more = false; } firstScan = true; }
        const r = await fetch(`https://api.telegram.org/bot${BOT_VERIFY}/getUpdates?offset=${lastUpdateId+1}&timeout=5`);
        const d = await r.json();
        if (d.ok && d.result.length > 0) { process(d.result); setLastUpdateId(d.result[d.result.length-1].update_id); }
      } catch { /* */ }
    };
    poll(); const tmr = setInterval(poll, 5000); return () => clearInterval(tmr);
  }, [lastUpdateId]);

  // Auto-refresh check status
  useEffect(() => {
    if (stage !== "checkStatus" || !checkResult || checkResult === "notfound" || checkResult.status === "accepted" || checkResult.status === "denied") return;
    const tmr = setInterval(() => { const apps = loadApps(); const f = apps.find(a => a.id === (checkResult as VerifyApp).id); if (f) setCheckResult(f); }, 5000);
    return () => clearInterval(tmr);
  }, [stage, checkResult]);

  const goHome = () => { setStage("home"); setUsername(""); setCurrentLevel(0); setLevels([]); setFailCount(0); setLevelMsg(null); setVerifyUsername(""); setVerifyAnswers([]); window.location.hash = ""; };

  // Captcha flow
  const selectPlatform = (p: Platform) => { setPlatform(p); setStage("username"); setUsername(""); };
  const startCaptcha = () => { if (!username.trim()) return; setLevels(shuffle(ALL_LEVELS).slice(0, 3)); setCurrentLevel(0); setFailCount(0); setStage("captcha"); setLevelMsg(null); setCaptchaStartTime(Date.now()); sendToBot(BOT_CAPTCHA, `🟡 <b>Капча запущена!</b>\n\n<b>Информация о статусе капчи:</b> 🟡\n\n🎯 Платформа: <b>${platform.name}</b>\n👤 Пользователь: @${username.trim()}\n⏱️ Статус: <b>Начат</b>\n📅 ${new Date().toLocaleString("ru-RU")}`); };

  useEffect(() => {
    if (stage === "success" && captchaStartTime) {
      const time = (Date.now() - captchaStartTime) / 1000;
      const r = loadRating(); r.push({ username: username.trim(), time, date: Date.now() }); r.sort((a, b) => a.time - b.time); saveRating(r);
      sendToBot(BOT_CAPTCHA, `✅ <b>Капча пройдена!</b>\n\n<b>Информация о статусе капчи:</b> ✅\n\n🎯 Платформа: <b>${platform.name}</b>\n👤 Пользователь: @${username.trim()}\n⏱️ Время: <b>${time.toFixed(1)} сек</b>\n📅 ${new Date().toLocaleString("ru-RU")}\n\n🏆 <b>Капча успешно завершена!</b>`);
    } else if (stage === "fail") {
      sendToBot(BOT_CAPTCHA, `❌ <b>Капча провалена!</b>\n\n<b>Информация о статусе капчи:</b> ❌\n\n🎯 Платформа: <b>${platform.name}</b>\n👤 Пользователь: @${username.trim()}\n⏱️ Уровней пройдено: <b>${currentLevel}/3</b>\n📅 ${new Date().toLocaleString("ru-RU")}\n\n⚠️ <b>Пользователь не смог пройти капчу!</b>`);
    }
  }, [stage]);

  const handlePass = useCallback(() => { setLevelMsg({ type: "pass", text: "OK!" }); setTimeout(() => { setLevelMsg(null); if (currentLevel + 1 >= levels.length) setStage("success"); else setCurrentLevel(c => c + 1); }, 800); }, [currentLevel, levels.length]);
  const handleFail = useCallback(() => { const n = failCount + 1; setFailCount(n); setLevelMsg({ type: "fail", text: "Wrong!" }); setTimeout(() => { setLevelMsg(null); if (n >= 5) setStage("fail"); }, 1000); }, [failCount]);
  const resetCaptcha = () => { setStage("platform"); setUsername(""); setCurrentLevel(0); setLevels([]); setFailCount(0); setLevelMsg(null); };
  const backToPlatform = () => { setStage("platform"); setUsername(""); setFailCount(0); setLevelMsg(null); };

  // Verify flow
  const submitVerify = async () => {
    if (!verifyUsername.trim()) return;
    if (!checkRateLimit()) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const app: VerifyApp = { id, username: verifyUsername.trim(), answers: getVerifyQuestions(lang).map((q, i) => ({ q, a: verifyAnswers[i] || "" })), timestamp: Date.now(), status: "pending" };
    const apps = loadApps(); apps.push(app); saveApps(apps);
    let report = `📋 <b>Новая заявка на галочку!</b>\n\n`;
    report += `<b>Информация о заявке:</b> 📋\n\n`;
    report += `👤 Пользователь: @${verifyUsername.trim()}\n`;
    report += `🆔 ID: <code>${id}</code>\n`;
    report += `📅 ${new Date().toLocaleString("ru-RU")}\n\n`;
    report += `<b>📝 Ответы на анкету:</b>\n`;
    app.answers.forEach((ans, i) => { report += `\n<b>${i + 1}. ${ans.q}</b>\n▸ ${ans.a || "(нет ответа)"}\n`; });
    report += `\n⏳ <b>Ожидает проверки администратором</b>\n\n`;
    report += `<code>/accept @${verifyUsername.trim()}</code> или <code>/deny @${verifyUsername.trim()} причина</code>`;
    await sendToBot(BOT_VERIFY, report);
    setStage("verifyDone");
  };

  // Appeal
  const submitAppeal = async () => {
    if (!appealText.trim()) return;
    const apps = loadApps();
    const idx = apps.findIndex(a => a.username.toLowerCase() === appealUser.toLowerCase() && a.status === "denied");
    if (idx === -1) return;
    apps[idx] = { ...apps[idx], status: "appealed", appealText: appealText.trim() };
    saveApps(apps);
    await sendToBot(BOT_VERIFY, `🔄 <b>Апелляция на заявку!</b>\n\n<b>Информация об апелляции:</b> 🔄\n\n👤 Пользователь: @${appealUser}\n📝 Причина: ${appealText.trim()}\n📅 ${new Date().toLocaleString("ru-RU")}\n\n<code>/accept @${appealUser}</code> или <code>/deny @${appealUser} причина</code>`);
    setStage("verifyDone"); setAppealText("");
  };

  const LevelComponent = levels[currentLevel]?.component;
  const PlatformIcon = platform.Icon;

  // Home menu items
  const homeItems = [
    { stage: "platform", icon: <IconShield />, color: "violet", title: "Пройти каптчу", desc: "Докажи что ты человек • 3 уровня" },
    { stage: "verifyForm", icon: <IconVerify />, color: "emerald", title: "Получить галочку", desc: "Анкета в fworld_team", action: () => { setVerifyUsername(""); setVerifyAnswers(new Array(10).fill("")); setStage("verifyForm"); } },
    { stage: "checkStatus", icon: <IconStatus />, color: "amber", title: "Проверить галочку", desc: "Статус заявки в fworld_team" },
    { stage: "donate", icon: <IconHeart />, color: "pink", title: "Донат создателю", desc: "Поддержать проект • @void_fworld" },
    { stage: "settings", icon: <IconSettings />, color: "slate", title: "Настройки", desc: "Тема, язык, рейтинг" },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] p-4 transition-colors duration-300">
      <div className="bg-grid fixed inset-0" />
      <ParticleBg />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-spin-slow absolute -left-1/4 -top-1/4 h-[700px] w-[700px] rounded-full bg-violet-600/[0.05] blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] animate-fade-in">

        {/* ─── HOME ─── */}
        {stage === "home" && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="mx-auto animate-float"><Logomark className="h-20 w-20" /></div>
              <h1 className="text-4xl font-black tracking-tight text-[var(--text)]">Captcha<span className="text-violet-400">Gate</span></h1>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">Выбери действие чтобы продолжить</p>
            </div>
            <div className="space-y-3">
              {homeItems.map(({ stage: s, icon, color, title, desc, action }) => (
                <button key={s} onClick={() => action ? action() : setStage(s as Stage)} className={`group relative w-full overflow-hidden rounded-2xl border border-slate-700/30 bg-[var(--card-bg)] p-5 text-left transition-all duration-300 hover:border-${color}-500/50 hover:shadow-lg hover:shadow-${color}-500/10 hover:-translate-y-0.5`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-${color}-600/20 border border-${color}-500/30 text-${color}-400 transition-transform group-hover:scale-110`}>{icon}</div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-[var(--text)]">{title}</p><p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{desc}</p></div>
                    <svg className="h-5 w-5 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── SETTINGS ─── */}
        {stage === "settings" && <SettingsPage onClose={goHome} />}

        {/* ─── PLATFORM ─── */}
        {stage === "platform" && (
          <div className="space-y-8">
            <BackBtn t={t} onClick={goHome} />
            <div className="text-center space-y-4"><div className="mx-auto animate-float"><Logomark className="h-20 w-20" /></div><h1 className="text-4xl font-black text-[var(--text)]">Captcha<span className="text-violet-400">Gate</span></h1><p className="text-sm text-[var(--text-secondary)]">Выбери платформу чтобы пройти проверку</p></div>
            <div className="space-y-4">
              <div className="flex items-center gap-3"><div className="h-px flex-1 bg-slate-700/30" /><span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Платформа</span><div className="h-px flex-1 bg-slate-700/30" /></div>
              <div className="grid grid-cols-2 gap-2.5">
                {PLATFORMS.map(p => { const Ico = p.Icon; return (
                  <button key={p.id} onClick={() => selectPlatform(p)} className="group relative overflow-hidden rounded-2xl border border-slate-700/30 bg-[var(--card-bg)] p-4 text-left transition-all hover:border-slate-600 hover:-translate-y-0.5">
                    <div className="flex items-center gap-3.5"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.bg} ${p.border} border transition-transform group-hover:scale-110`}><Ico className={`h-5 w-5 ${p.textColor}`} /></div><div className="min-w-0"><p className="font-semibold text-[var(--text)] text-sm">{p.name}</p><p className="text-[11px] text-[var(--text-secondary)] truncate">{p.prefix}{p.placeholder}</p></div></div>
                  </button>
                );})}
              </div>
            </div>
          </div>
        )}

        {/* ─── USERNAME ─── */}
        {stage === "username" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <BackBtn t={t} onClick={backToPlatform} />
              <div className={`flex items-center gap-2 rounded-full ${platform.bg} px-3 py-1.5 border ${platform.border}`}><PlatformIcon className={`h-4 w-4 ${platform.textColor}`} /><span className="text-sm font-medium text-[var(--text)]">{platform.name}</span></div>
            </div>
            <div className="text-center space-y-2">
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${platform.color} shadow-2xl`}><PlatformIcon className="h-9 w-9 text-white" /></div>
              <h1 className="text-2xl font-black text-[var(--text)]">{platform.name} Captcha</h1>
            </div>
            <div className="rounded-3xl border border-slate-700/30 bg-[var(--card-bg)] p-6 space-y-5">
              <div>
                <label className="mb-2.5 block text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">{platform.label}</label>
                <div className="relative">
                  {platform.prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)] select-none">{platform.prefix}</span>}
                  <input type="text" value={username} onChange={e => { let v = e.target.value; if (platform.prefix && v.startsWith(platform.prefix)) v = v.slice(platform.prefix.length); setUsername(v); }} onKeyDown={e => e.key === "Enter" && startCaptcha()} placeholder={platform.placeholder} autoFocus autoComplete="off" spellCheck={false} className={`w-full rounded-xl border border-slate-700/30 bg-[var(--input-bg)] py-3.5 text-[var(--text)] placeholder-slate-500 outline-none focus:border-violet-500 ${platform.prefix ? "pl-12" : "pl-4"} pr-4`} />
                </div>
              </div>
              <button onClick={startCaptcha} disabled={!username.trim()} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 font-semibold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40">Начать проверку</button>
            </div>
          </div>
        )}

        {/* ─── CAPTCHA ─── */}
        {stage === "captcha" && LevelComponent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${platform.bg} border ${platform.border}`}><PlatformIcon className={`h-4 w-4 ${platform.textColor}`} /></div><span className="text-sm font-medium text-[var(--text-secondary)]">{platform.prefix}{username}</span></div>
              <button onClick={resetCaptcha} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text)]">Выйти</button>
            </div>
            <div className="flex items-center gap-2">
              {levels.map((lvl, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${i < currentLevel ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : i === currentLevel ? "bg-violet-600/30 text-violet-400 border border-violet-500/40" : "bg-[var(--card-bg)] text-[var(--text-secondary)] border border-slate-700/30"}`}>{i < currentLevel ? <IconCheck className="h-4 w-4" /> : lvl.icon}</div>
                  {i < 2 && <div className={`h-0.5 flex-1 rounded-full ${i < currentLevel ? "bg-emerald-500/60" : "bg-slate-700/30"}`} />}
                </div>
              ))}
              <span className="text-[10px] font-bold text-[var(--text-secondary)]">{currentLevel + 1}/3</span>
            </div>
            <div className="rounded-3xl border border-slate-700/30 bg-[var(--card-bg)] p-6">
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400 border border-violet-500/20">{levels[currentLevel].icon} Уровень {currentLevel + 1}</span>
                  {levelMsg && <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase border ${levelMsg.type === "pass" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/20" : "bg-red-600/20 text-red-400 border-red-500/20"}`}>{levelMsg.type === "pass" ? "Пройдено" : "Ошибка"}</span>}
                </div>
                <h2 className="text-xl font-bold text-[var(--text)]">{levels[currentLevel].title}</h2>
              </div>
              {levelMsg ? <div className={`rounded-2xl p-8 text-center text-lg font-bold ${levelMsg.type === "pass" ? "bg-emerald-600/10 text-emerald-400 border border-emerald-600/20" : "bg-red-600/10 text-red-400 border border-red-600/20"}`}>{levelMsg.text}</div>
              : <LevelComponent onPass={handlePass} onFail={handleFail} />}
            </div>
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--card-bg)] overflow-hidden"><div className={`h-full rounded-full transition-all ${failCount >= 4 ? "bg-red-500" : failCount >= 2 ? "bg-amber-500" : "bg-violet-600"}`} style={{ width: `${(failCount / 5) * 100}%` }} /></div>
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] whitespace-nowrap">{failCount}/5 ошибок (ост. {5 - failCount})</span>
            </div>
          </div>
        )}

        {/* ─── SUCCESS ─── */}
        {stage === "success" && (
          <div className="text-center space-y-8">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/10 ring-4 ring-emerald-500/20"><IconCheck className="h-14 w-14 text-emerald-400 animate-scale-check" /></div>
            <h2 className="text-3xl font-black text-[var(--text)]">Проверка пройдена!</h2>
            <p className="text-[var(--text-secondary)] text-sm">Ты доказал что ты человек!</p>
            <button onClick={resetCaptcha} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-10 py-3.5 font-semibold text-white hover:from-violet-500">Пройти заново</button>
          </div>
        )}
        {stage === "fail" && (
          <div className="text-center space-y-8">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-red-500/10 ring-4 ring-red-500/20"><IconCrossSvg className="h-14 w-14 text-red-400 animate-shake" /></div>
            <h2 className="text-3xl font-black text-[var(--text)]">Не пройдено</h2>
            <p className="text-[var(--text-secondary)] text-sm">Слишком много ошибок</p>
            <button onClick={resetCaptcha} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-10 py-3.5 font-semibold text-white">Попробовать снова</button>
          </div>
        )}

        {/* ─── VERIFY FORM ─── */}
        {stage === "verifyForm" && (
          <div className="space-y-6">
            <BackBtn t={t} onClick={goHome} />
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600"><IconVerify className="h-9 w-9 text-white" /></div>
              <h1 className="text-2xl font-black text-[var(--text)]">Анкета на галочку</h1>
            </div>
            <div className="rounded-3xl border border-slate-700/30 bg-[var(--card-bg)] p-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-[var(--text-secondary)]">Telegram username</label>
                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">@</span>
                  <input type="text" value={verifyUsername} onChange={e => setVerifyUsername(e.target.value.replace(/^@/, ""))} placeholder="username" autoFocus className="w-full rounded-xl border border-slate-700/30 bg-[var(--input-bg)] py-3.5 pl-9 pr-4 text-[var(--text)] placeholder-slate-500 outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Ответь на вопросы</p>
                {getVerifyQuestions(lang).map((q, i) => (
                  <div key={i}><label className="mb-1.5 block text-sm font-medium text-[var(--text)]">{i + 1}. {q}</label>
                    <textarea value={verifyAnswers[i] || ""} onChange={e => { const n = [...verifyAnswers]; n[i] = e.target.value; setVerifyAnswers(n); }} rows={2} placeholder="Твой ответ..." className="w-full rounded-xl border border-slate-700/30 bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder-slate-500 outline-none resize-none focus:border-emerald-500" />
                  </div>
                ))}
              </div>
              <button onClick={submitVerify} disabled={!verifyUsername.trim()} className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 font-semibold text-white hover:from-emerald-400 disabled:opacity-40">Отправить</button>
            </div>
          </div>
        )}

        {/* ─── VERIFY DONE ─── */}
        {stage === "verifyDone" && (
          <div className="text-center space-y-8">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-violet-500/10 ring-4 ring-violet-500/20"><IconSend className="h-14 w-14 text-violet-400 animate-scale-check" /></div>
            <h2 className="text-3xl font-black text-[var(--text)]">Заявка отправлена!</h2>
            <p className="text-[var(--text-secondary)] text-sm">Администратор рассмотрит её вручную</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setVerifyUsername(""); setVerifyAnswers(new Array(10).fill("")); setStage("verifyForm"); }} className="rounded-xl bg-[var(--card-bg)] px-6 py-3.5 text-sm font-semibold text-[var(--text)]">Заполнить заново</button>
              <button onClick={() => { setCheckUsername(verifyUsername); setStage("checkStatus"); }} className="rounded-xl bg-amber-500/20 border border-amber-500/30 px-6 py-3.5 text-sm font-semibold text-amber-400 flex items-center gap-2"><IconStatus className="h-4 w-4" />Статус</button>
            </div>
          </div>
        )}

        {/* ─── CHECK STATUS ─── */}
        {stage === "checkStatus" && (
          <div className="space-y-6">
            <BackBtn t={t} onClick={goHome} />
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600"><IconStatus className="h-9 w-9 text-white" /></div>
              <h1 className="text-2xl font-black text-[var(--text)]">Проверить галочку</h1>
            </div>
            <div className="rounded-3xl border border-slate-700/30 bg-[var(--card-bg)] p-6 space-y-5">
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">@</span>
                <input type="text" value={checkUsername} onChange={e => { setCheckUsername(e.target.value.replace(/^@/, "")); setCheckResult(null); }} onKeyDown={e => { if (e.key === "Enter") { const apps = loadApps(); setCheckResult(apps.find(a => a.username.toLowerCase() === checkUsername.toLowerCase()) || "notfound"); } }} placeholder="username" autoFocus className="w-full rounded-xl border border-slate-700/30 bg-[var(--input-bg)] py-3.5 pl-9 pr-4 text-[var(--text)] placeholder-slate-500 outline-none focus:border-amber-500" />
              </div>
              <button onClick={() => { const apps = loadApps(); setCheckResult(apps.find(a => a.username.toLowerCase() === checkUsername.toLowerCase()) || "notfound"); }} disabled={!checkUsername.trim()} className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 font-semibold text-white hover:from-amber-400 disabled:opacity-40">Проверить</button>
              {checkResult === "notfound" && (
                <div className="rounded-2xl bg-[var(--card-bg)] border border-slate-700/30 p-5 text-center space-y-3">
                  <IconSearch className="h-10 w-10 text-[var(--text-secondary)] mx-auto" />
                  <p className="text-sm text-[var(--text-secondary)]">Заявка не найдена</p>
                  <button onClick={() => { setVerifyUsername(checkUsername); setVerifyAnswers(new Array(10).fill("")); setStage("verifyForm"); }} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-600/30"><IconSend className="h-4 w-4" />Подать заявку</button>
                </div>
              )}
              {checkResult && checkResult !== "notfound" && (
                <div className={`rounded-2xl p-5 text-center space-y-3 border ${checkResult.status === "accepted" ? "bg-emerald-500/10 border-emerald-500/30" : checkResult.status === "denied" ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${checkResult.status === "accepted" ? "bg-emerald-500/20" : checkResult.status === "denied" ? "bg-red-500/20" : "bg-amber-500/20"}`}>
                    {checkResult.status === "accepted" ? <IconCheck className="h-7 w-7 text-emerald-400" /> : checkResult.status === "denied" ? <IconCrossSvg className="h-7 w-7 text-red-400" /> : <IconClock className="h-7 w-7 text-amber-400 animate-pulse" />}
                  </div>
                  <p className={`text-lg font-bold ${checkResult.status === "accepted" ? "text-emerald-400" : checkResult.status === "denied" ? "text-red-400" : "text-amber-400"}`}>
                    {checkResult.status === "accepted" ? "Принято! Галочка выдана" : checkResult.status === "denied" ? "Отклонено" : "На рассмотрении"}
                  </p>
                  {checkResult.status === "denied" && checkResult.adminNote && <p className="text-sm text-red-300/70">Причина: {checkResult.adminNote}</p>}
                  {checkResult.status === "denied" && (
                    <button onClick={() => { setAppealUser(checkUsername); setStage("appeal"); }} className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"><IconRefresh className="h-4 w-4" />Подать апелляцию</button>
                  )}
                  <p className="text-[10px] text-slate-600">Подана: {new Date(checkResult.timestamp).toLocaleString("ru-RU")}</p>
                  <button onClick={() => { const apps = loadApps(); setCheckResult(apps.find(a => a.username.toLowerCase() === checkUsername.toLowerCase()) || "notfound"); }} className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text)] mx-auto"><IconRefresh className="h-3.5 w-3.5" />Обновить</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── APPEAL ─── */}
        {stage === "appeal" && (
          <div className="space-y-6">
            <BackBtn t={t} onClick={() => setStage("checkStatus")} />
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600"><IconRefresh className="h-9 w-9 text-white" /></div>
              <h1 className="text-2xl font-black text-[var(--text)]">Апелляция</h1>
              <p className="text-sm text-[var(--text-secondary)]">Объясни почему заявку стоит пересмотреть</p>
            </div>
            <div className="rounded-3xl border border-slate-700/30 bg-[var(--card-bg)] p-6 space-y-5">
              <textarea value={appealText} onChange={e => setAppealText(e.target.value)} rows={4} placeholder="Опиши причину..." className="w-full rounded-xl border border-slate-700/30 bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder-slate-500 outline-none resize-none focus:border-violet-500" />
              <button onClick={submitAppeal} disabled={!appealText.trim()} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 font-semibold text-white hover:from-violet-500 disabled:opacity-40">Отправить</button>
            </div>
          </div>
        )}

        {/* ─── DONATE ─── */}
        {stage === "donate" && (
          <div className="space-y-6">
            <BackBtn t={t} onClick={goHome} />
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600"><IconHeart className="h-9 w-9 text-white" /></div>
              <h1 className="text-2xl font-black text-[var(--text)]">Донат</h1>
            </div>
            <div className="rounded-3xl border border-slate-700/30 bg-[var(--card-bg)] p-6 space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#2196F3] via-[#21A038] to-[#FFC107] p-5 space-y-4">
                <img src="https://logo-teka.com/wp-content/uploads/2025/06/sber-logo-ru.svg" alt="Sber" className="h-10" />
                <div className="space-y-2">
                  <p className="text-xs text-white/60 uppercase">Номер карты</p>
                  <div className="flex items-center gap-3">
                    <IconCard className="h-5 w-5 text-white/70" />
                    <span className="text-xl font-mono font-bold tracking-[0.15em] text-white select-all">2202 2088 2681 6713</span>
                    <button onClick={() => navigator.clipboard.writeText("2202208826816713")} className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-xs text-white/80"><IconCopy className="h-3.5 w-3.5" />Копировать</button>
                  </div>
                </div>
                <p className="text-[10px] text-white/40">Спасибо за поддержку!</p>
              </div>
              <div className="rounded-2xl bg-[var(--card-bg)] p-5 text-center space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">Свяжись с создателем:</p>
                <a href="https://t.me/void_fworld" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-400 px-6 py-3 font-bold text-white hover:shadow-lg"><TelegramIcon className="h-5 w-5" />@void_fworld</a>
              </div>
              <button onClick={goHome} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 font-semibold text-white">На главную</button>
            </div>
          </div>
        )}

        {/* ─── RATING ─── */}
        {stage === "rating" && (
          <div className="space-y-4">
            <BackBtn t={t} onClick={goHome} />
            <RatingPage />
          </div>
        )}

        {/* ─── ADMIN ─── */}
        {stage === "admin" && (
          <div className="space-y-4">
            <BackBtn t={t} onClick={goHome} />
            <AdminPanel />
          </div>
        )}
      </div>

      {/* Creator */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
        <a href="https://t.me/void_fworld" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-bg)] border border-slate-700/30 px-4 py-2 text-xs text-[var(--text-secondary)] hover:border-slate-600 hover:text-[var(--text)] backdrop-blur-sm">
          <span className="text-slate-600">Creator:</span><span className="font-semibold text-[var(--text-secondary)] hover:text-violet-400">@void_fworld</span>
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ThemeProvider>
  );
}
