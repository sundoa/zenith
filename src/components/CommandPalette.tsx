import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { searchWorkspace } from '../utils/ocr';
import type { SearchResult } from '../utils/ocr';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Terminal, 
  FilePlus, 
  Moon, 
  Sun, 
  FileText, 
  Hash, 
  Edit, 
  ArrowRight,
  FolderOpen,
  Keyboard
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenShortcuts }) => {
  const {
    notes,
    workspaces,
    theme,
    vimMode,
    setTheme,
    setVimMode,
    addNote,
    activeWorkspaceId,
    setActiveWorkspaceId,
    setActiveNoteId,
    setZoom,
    setPan
  } = useStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('zenith-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save query search history helper
  const addRecentSearch = (text: string) => {
    if (!text.trim()) return;
    const filtered = [text, ...recentSearches.filter(t => t !== text)].slice(0, 5);
    setRecentSearches(filtered);
    localStorage.setItem('zenith-recent-searches', JSON.stringify(filtered));
  };

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const totalItems = results.length + getQuickActions().length;
        setSelectedIndex(prev => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const totalItems = results.length + getQuickActions().length;
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Re-focus and reset inputs on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Perform search on query change
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const searchRes = searchWorkspace(notes, query);
    setResults(searchRes);
    setSelectedIndex(0);
  }, [query, notes]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Compile quick commands list
  const getQuickActions = () => {
    const actions = [
      {
        id: 'cmd-theme',
        name: `Toggle Dark/Light Mode`,
        desc: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} visual design`,
        icon: theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />,
        run: () => {
          const next = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          if (next === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      {
        id: 'cmd-new',
        name: 'Create New Note',
        desc: 'Spawns a fresh note page inside active workspace',
        icon: <FilePlus size={15} />,
        run: () => {
          const newId = addNote('Untitled Note', activeWorkspaceId);
          setActiveNoteId(newId);
        }
      },
      {
        id: 'cmd-shortcuts',
        name: 'Keyboard Shortcuts Config',
        desc: 'Customize triggers and binding layouts',
        icon: <Keyboard size={15} />,
        run: () => {
          onOpenShortcuts();
        }
      },
      {
        id: 'cmd-vim',
        name: `${vimMode ? 'Disable' : 'Enable'} Vim Keybindings`,
        desc: 'Toggle Vim keyboard terminal inputs',
        icon: <Terminal size={15} />,
        run: () => {
          setVimMode(!vimMode);
        }
      }
    ];

    // Add workspace switches to command list
    workspaces.forEach((ws) => {
      if (ws.id !== activeWorkspaceId) {
        actions.push({
          id: `cmd-ws-${ws.id}`,
          name: `Switch to workspace: ${ws.name}`,
          desc: 'Load assets, folders, and note lists',
          icon: <FolderOpen size={15} />,
          run: () => {
            setActiveWorkspaceId(ws.id);
          }
        });
      }
    });

    return actions;
  };

  const executeSelection = () => {
    const actions = getQuickActions();
    const isSearchResult = selectedIndex < results.length;

    if (isSearchResult) {
      const match = results[selectedIndex];
      addRecentSearch(query);
      
      // Select matched note page
      const note = notes.find(n => n.id === match.noteId);
      if (note) {
        setActiveWorkspaceId(note.workspaceId);
        setActiveNoteId(note.id);

        // Center canvas camera offsets if target coordinates are matched (sticky or OCR shapes)
        if (match.targetCoords) {
          setZoom(1.1);
          setPan({
            x: -match.targetCoords.x * 1.1 + window.innerWidth / 2.8,
            y: -match.targetCoords.y * 1.1 + window.innerHeight / 2.8
          });
        }
      }
    } else {
      // Execute Quick Action
      const actionIdx = selectedIndex - results.length;
      actions[actionIdx].run();
    }

    onClose();
  };

  const quickActions = getQuickActions();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-start justify-center pt-24 z-50 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl glass border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[460px] mx-4"
        >
          {/* Search Input Banner */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-zinc-800">
            <Search size={18} className="text-slate-400 dark:text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search notes, drawings, tags, OCR sketch or quick command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-sm bg-transparent border-none text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-0 p-0"
            />
            <span className="text-[10px] bg-slate-200/50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono select-none">
              ESC
            </span>
          </div>

          {/* List of items */}
          <div 
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto p-2 space-y-0.5"
          >
            {/* Search Results */}
            {query && results.length > 0 && (
              <>
                <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-3 py-1 uppercase tracking-wider">
                  Matches found ({results.length})
                </div>
                {results.map((res, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={res.id}
                      onClick={() => {
                        setSelectedIndex(idx);
                        executeSelection();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-blue-500 text-white font-semibold shadow-sm' 
                          : 'hover:bg-slate-100/80 dark:hover:bg-zinc-800/40 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {res.type === 'title' && <FileText size={15} className={isSelected ? 'text-white' : 'text-blue-500'} />}
                        {res.type === 'tag' && <Hash size={15} className={isSelected ? 'text-white' : 'text-teal-500'} />}
                        {res.type === 'handwriting' && <Edit size={15} className={isSelected ? 'text-white' : 'text-accent-pink'} />}
                        {(res.type === 'content' || res.type === 'sticky') && <FileText size={15} className={isSelected ? 'text-white' : 'text-slate-400'} />}
                        
                        <div className="min-w-0">
                          <span className="text-xs truncate block font-medium">{res.preview}</span>
                          <span className={`text-[10px] block opacity-80 ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-zinc-500'}`}>
                            {res.noteTitle}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={13} className={`opacity-0 ${isSelected ? 'opacity-100' : ''}`} />
                    </button>
                  );
                })}
              </>
            )}

            {/* Quick Actions / Commands */}
            {(!query || results.length === 0) && (
              <>
                <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-3 py-1 uppercase tracking-wider">
                  System Commands
                </div>
                {quickActions.map((act, idx) => {
                  // Index offset by results size
                  const offsetIdx = results.length + idx;
                  const isSelected = offsetIdx === selectedIndex;
                  return (
                    <button
                      key={act.id}
                      onClick={() => {
                        setSelectedIndex(offsetIdx);
                        executeSelection();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-blue-500 text-white font-semibold shadow-sm' 
                          : 'hover:bg-slate-100/80 dark:hover:bg-zinc-800/40 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`${isSelected ? 'text-white' : 'text-blue-500'}`}>{act.icon}</div>
                        <div>
                          <span className="text-xs font-medium block">{act.name}</span>
                          <span className={`text-[10px] block opacity-80 ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-zinc-500'}`}>
                            {act.desc}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={13} className={`opacity-0 ${isSelected ? 'opacity-100' : ''}`} />
                    </button>
                  );
                })}
              </>
            )}

            {/* No matches warning */}
            {query && results.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                No matching notes, drawings, or workspace OCR text found.
              </div>
            )}
          </div>

          {/* Footer guides */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 text-[10px] text-slate-400 dark:text-zinc-500 flex justify-between select-none">
            <span className="flex items-center gap-1">
              <span>↑↓</span> to navigate
              <span className="ml-2">↵</span> to select
            </span>
            <span className="flex items-center gap-1">
              <span>Recent:</span>
              {recentSearches.length > 0 ? (
                recentSearches.slice(0, 2).map((h, i) => (
                  <span 
                    key={h + i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuery(h);
                    }}
                    className="cursor-pointer underline hover:text-slate-600 dark:hover:text-zinc-300 truncate max-w-[80px]"
                  >
                    {h}
                  </span>
                ))
              ) : (
                <span>none</span>
              )}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
