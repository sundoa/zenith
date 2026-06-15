import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Command, ShieldCheck, Keyboard, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Draw & Write on a Single Canvas",
      desc: "An infinite workspace where sketches, diagrams, rich text cards, yellow sticky notes, and code blocks coexist naturally. Instantly switch between cursor selection and pen brushes by pressing TAB.",
      icon: <Sparkles className="w-12 h-12 text-blue-500" />,
      graphic: (
        <div className="relative w-full h-44 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 overflow-hidden flex items-center justify-center select-none">
          <div className="absolute top-4 left-4 bg-yellow-200 text-slate-800 p-2 text-[10px] rounded-lg shadow-md max-w-[120px] font-medium leading-tight">
            💡 Drag and drop cards anywhere!
          </div>
          <svg className="w-48 h-24 text-blue-500 opacity-60" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {/* Smooth flow diagram */}
            <rect x="10" y="35" width="40" height="30" rx="6" />
            <path d="M50 50 H90" strokeDasharray="4 2" />
            <polygon points="90,50 85,46 85,54" fill="currentColor" />
            <circle cx="115" cy="50" r="20" />
            <path d="M135 50 Q160 50 170 20" />
          </svg>
          <div className="absolute bottom-4 right-4 bg-zinc-900 border border-zinc-800 text-blue-400 font-mono text-[9px] p-2 rounded shadow-md">
            {"const app = 'Zenith';"}
          </div>
        </div>
      )
    },
    {
      title: "Universal Command Palette (Cmd + K)",
      desc: "Spotlight-inspired global command bar. Type commands to toggle dark/light themes, create notes, jump workspaces, or execute OCR searches that index text inside handwritten diagrams.",
      icon: <Command className="w-12 h-12 text-teal-400" />,
      graphic: (
        <div className="w-full h-44 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 flex flex-col justify-center select-none">
          <div className="bg-white/80 dark:bg-[#12131a] rounded-xl border border-slate-200 dark:border-zinc-800/80 p-2 shadow-lg max-w-sm mx-auto w-full space-y-1.5">
            <div className="flex items-center gap-2 text-xs border-b border-slate-200 dark:border-zinc-800 pb-1.5 text-slate-400">
              <span className="text-blue-500">🔍</span>
              <span>Search: "theme"</span>
            </div>
            <div className="bg-blue-500 text-white rounded p-1.5 text-[10px] flex justify-between font-semibold">
              <span>🌓 Toggle Dark/Light Mode</span>
              <span className="opacity-75">CMD+K</span>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-zinc-400 p-1">
              📂 Jump workspace: PERSONAL
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Keyboard-First Control Centre",
      desc: "Zenith is designed for cursorless efficiency. Control folders, workspaces, panels, and document history using dedicated keys. Click Shortcuts Manager in the sidebar to bind custom macros.",
      icon: <Keyboard className="w-12 h-12 text-accent-pink" />,
      graphic: (
        <div className="w-full h-44 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 flex flex-col justify-center items-center gap-2 select-none">
          <div className="flex gap-2">
            <kbd className="bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-2 py-1 rounded text-xs shadow font-mono font-bold text-slate-800 dark:text-white">⌘ Cmd</kbd>
            <span className="text-slate-400 font-bold self-center">+</span>
            <kbd className="bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-3 py-1 rounded text-xs shadow font-mono font-bold text-slate-800 dark:text-white">K</kbd>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 text-center font-medium mt-1">
            CMD + N (New Note) • TAB (Toggle Edit Tools) • CMD + 1..9 (Workspaces)
          </span>
        </div>
      )
    },
    {
      title: "Local-First & Offline Storage",
      desc: "Your data is entirely yours. Zenith runs completely offline, utilizing lightning-fast IndexedDB structures inside a secure sandboxed desktop application. Backup or export note graphs to JSON or PDF at any time.",
      icon: <ShieldCheck className="w-12 h-12 text-accent-amber" />,
      graphic: (
        <div className="w-full h-44 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-center select-none">
          <div className="text-center space-y-2">
            <div className="text-3xl">🔒</div>
            <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Offline Sandboxed DB Encrypted</div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">0% Network Latency • 100% Privacy</div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      localStorage.setItem('zenith-onboarded', 'true');
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f5f5f7] dark:bg-[#07080b] flex items-center justify-center p-4 z-[99] select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-lg bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-zinc-900 rounded-3xl shadow-mac-shadow overflow-hidden flex flex-col p-8 md:p-10 relative"
      >
        {/* Glow decorations */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 flex flex-col justify-between min-h-[360px] relative z-10">
          
          {/* Active slide layout */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                {slides[currentSlide].icon}
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-zinc-100 font-sans tracking-tight">
                  {slides[currentSlide].title}
                </h2>
              </div>
              
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed min-h-[64px]">
                {slides[currentSlide].desc}
              </p>

              {slides[currentSlide].graphic}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 border-t border-slate-100 dark:border-zinc-900 pt-6">
            {/* Slide dots indicator */}
            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentSlide 
                      ? 'bg-blue-500 w-4' 
                      : 'bg-slate-200 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* Slide action trigger */}
            <button
              onClick={handleNext}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-1.5 transition-all hover:translate-x-0.5 active:scale-95"
            >
              <span>{currentSlide === slides.length - 1 ? 'Launch Zenith' : 'Continue'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
export default Onboarding;
