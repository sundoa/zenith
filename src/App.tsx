import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { useShortcuts } from './hooks/useShortcuts';
import { Sidebar } from './components/Sidebar';
import { MarkdownEditor } from './components/MarkdownEditor';
import { CanvasEditor } from './components/CanvasEditor';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsManager } from './components/ShortcutsManager';
import { Onboarding } from './components/Onboarding';
import { 
  ChevronRight,
  Sun,
  Moon,
  Keyboard,
  Command
} from 'lucide-react';

export const App: React.FC = () => {
  const { 
    theme, 
    setTheme, 
    activeNoteId, 
    notes
  } = useStore();

  // Modal open states
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  
  // App views layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'both' | 'canvas' | 'editor'>('both');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Sync theme on load
  useEffect(() => {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check onboarding status
    const onboarded = localStorage.getItem('zenith-onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, [theme]);

  // Bind Keyboard shortcuts hook
  useShortcuts({
    onToggleSearch: () => setIsCommandPaletteOpen(prev => !prev),
    onOpenShortcuts: () => setIsShortcutsOpen(true),
    onFocusSidebarSearch: () => {
      const el = document.getElementById('sidebar-search-input');
      if (el) el.focus();
    }
  });

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-[#f5f5f7] dark:bg-[#07080b] font-sans transition-colors duration-200">
      
      {/* 1. Collapsible macOS-style Sidebar */}
      <Sidebar 
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* 2. Main Workspace Area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        
        {/* Floating Top Header Bar */}
        <header className="h-12 border-b border-slate-200 dark:border-zinc-900 bg-white/70 dark:bg-[#0c0d12]/70 backdrop-blur-md flex items-center justify-between px-6 pl-20 z-20 select-none">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button */}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400"
                title="Expand Sidebar"
              >
                <ChevronRight size={15} />
              </button>
            )}
            
            {/* Display Active Note / Document Page details */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {notes.find(n => n.id === activeNoteId)?.title || 'No Note Selected'}
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-400 font-mono select-none flex items-center gap-0.5">
                <Command size={9} />K
              </span>
            </div>
          </div>

          {/* Center Pane: Split-Screen view selectors */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800/80">
            <button
              onClick={() => setLayoutMode('editor')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                layoutMode === 'editor'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
              }`}
              title="Markdown Editor Only"
            >
              Editor Only
            </button>
            <button
              onClick={() => setLayoutMode('both')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                layoutMode === 'both'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
              }`}
              title="Split Markdown & Canvas"
            >
              Split View
            </button>
            <button
              onClick={() => setLayoutMode('canvas')}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                layoutMode === 'canvas'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
              }`}
              title="Infinite Canvas Only"
            >
              Canvas Only
            </button>
          </div>

          {/* Right actions: Quick Theme & Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400"
              title="Keyboard Shortcuts"
            >
              <Keyboard size={15} />
            </button>
            <button
              onClick={() => {
                const next = theme === 'dark' ? 'light' : 'dark';
                setTheme(next);
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 dark:text-zinc-400"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Dynamic Split Layout Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {layoutMode !== 'canvas' && (
            <div className={`h-full ${layoutMode === 'editor' ? 'w-full' : 'w-2/5 md:w-1/3'} shrink-0`}>
              <MarkdownEditor onOpenShortcuts={() => setIsShortcutsOpen(true)} />
            </div>
          )}
          {layoutMode !== 'editor' && (
            <div className="flex-1 h-full">
              <CanvasEditor />
            </div>
          )}
        </div>
      </div>

      {/* Floating Spotlight Command Palette Overlay */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Shortcuts Mapping Configurations Manager */}
      <ShortcutsManager 
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Animated Onboarding Welcome Slider */}
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
};
export default App;
