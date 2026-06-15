import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  Terminal,
  Palette,
  PenTool,
  MousePointer,
  Link,
  Pin
} from 'lucide-react';

interface MarkdownEditorProps {
  onOpenShortcuts: () => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = () => {
  const {
    notes,
    activeNoteId,
    updateNoteMetadata,
    updateActiveNoteText,
    addTextCard,
    togglePinNote,
    setActiveTool,
    theme,
    setTheme
  } = useStore();

  const note = notes.find(n => n.id === activeNoteId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Slash commands state
  const [showSlashMenu, setShowSlashMenu] = useState(false);

  const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 });
  const [slashIndex, setSlashIndex] = useState(0);

  // Tag inputs state
  const [tagInput, setTagInput] = useState('');

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-zinc-500 font-medium">
        No active note. Create one to get started.
      </div>
    );
  }

  // 1. Backlinks scanner: find what other notes link to this note via [[Title]] syntax
  const backlinks = notes.filter(n =>
    n.id !== note.id &&
    n.content.toLowerCase().includes(`[[${note.title.toLowerCase()}]]`)
  );

  // 2. Keyboard listeners for Slash menu navigation
  useEffect(() => {
    if (!showSlashMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(prev => (prev + 1) % SLASH_COMMANDS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(prev => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSlashCommand(SLASH_COMMANDS[slashIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSlashMenu, slashIndex]);

  // Slash Commands Data
  const SLASH_COMMANDS = [
    {
      label: 'Sticky Note',
      desc: 'Spawn a yellow sticky card on the canvas',
      icon: <Palette size={14} className="text-amber-500" />,
      run: () => {
        addTextCard({
          type: 'sticky',
          content: 'New Note card',
          x: 150,
          y: 150,
          width: 200,
          height: 120,
          color: '#fef08a'
        });
      }
    },
    {
      label: 'Code Widget',
      desc: 'Insert a TypeScript code editor card',
      icon: <Terminal size={14} className="text-blue-500" />,
      run: () => {
        addTextCard({
          type: 'code',
          content: '// TypeScript block\nconsole.log("Hello, World!");',
          x: 200,
          y: 200,
          width: 300,
          height: 155,
          language: 'typescript'
        });
      }
    },
    {
      label: 'Drawing Brush',
      desc: 'Switch pointer to custom Pencil brush tool',
      icon: <PenTool size={14} className="text-accent-pink" />,
      run: () => {
        setActiveTool('pencil');
      }
    },
    {
      label: 'Cursor Pointer',
      desc: 'Switch pointer to Select / Move tool',
      icon: <MousePointer size={14} className="text-slate-400" />,
      run: () => {
        setActiveTool('select');
      }
    },
    {
      label: 'Toggle Theme',
      desc: 'Switch system layout colors',
      icon: <Palette size={14} className="text-teal-400" />,
      run: () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        if (next === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    }
  ];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    updateActiveNoteText(text);

    // Track if user typed a slash
    const cursor = e.target.selectionStart;
    const lastWordIdx = text.lastIndexOf(' ', cursor - 1);
    const word = text.slice(lastWordIdx + 1, cursor);

    if (word.startsWith('/')) {
      setShowSlashMenu(true);


      // Calculate cursor position for menu placement
      const rect = e.target.getBoundingClientRect();
      const coords = getCursorCoordinates(e.target, cursor);
      setSlashCoords({
        top: Math.min(rect.height - 180, coords.top + 30),
        left: Math.min(rect.width - 220, coords.left)
      });
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  // Helper to find cursor character coordinates in textarea
  const getCursorCoordinates = (el: HTMLTextAreaElement, pos: number) => {
    const { offsetLeft, offsetTop } = el;
    // Standard approximation: character width / height multipliers
    const lines = el.value.substring(0, pos).split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length;

    return {
      top: offsetTop + (currentLine * 18),
      left: offsetLeft + (currentCol * 7)
    };
  };

  const executeSlashCommand = (cmd: typeof SLASH_COMMANDS[0]) => {
    cmd.run();
    setShowSlashMenu(false);

    // Remove slash characters from text editor content
    if (textareaRef.current) {
      const el = textareaRef.current;
      const text = el.value;
      const cursor = el.selectionStart;
      const lastWordIdx = text.lastIndexOf('/', cursor - 1);

      const updated = text.slice(0, lastWordIdx) + text.slice(cursor);
      updateActiveNoteText(updated);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(lastWordIdx, lastWordIdx);
      }, 50);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagInput.trim() && !note.tags.includes(tagInput.trim())) {
      updateNoteMetadata(note.id, {
        tags: [...note.tags, tagInput.trim().toLowerCase()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    updateNoteMetadata(note.id, {
      tags: note.tags.filter(tag => tag !== t)
    });
  };

  return (
    <div className="w-full h-full flex flex-col p-6 dark:bg-[#0c0d12] bg-white border-r border-slate-200 dark:border-zinc-900 select-none overflow-hidden relative">

      {/* Title Input with Pin Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={note.title}
          onChange={(e) => updateNoteMetadata(note.id, { title: e.target.value })}
          className="text-xl font-extrabold flex-1 bg-transparent border-none text-slate-800 dark:text-zinc-100 p-0 focus:ring-0"
          placeholder="Untitled note..."
        />
        <button
          onClick={() => togglePinNote(note.id)}
          className={`p-1.5 rounded-lg border ${note.isPinned
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
            : 'border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white'
            }`}
          title={note.isPinned ? "Unpin Note" : "Pin Note"}
        >
          <Pin size={14} className={note.isPinned ? "fill-blue-500" : ""} />
        </button>
      </div>

      {/* Tags Block */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs select-none">
        <div className="flex flex-wrap gap-1">
          {note.tags.map((t) => (
            <span
              key={t}
              className="bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200 dark:border-zinc-800 text-[10px]"
            >
              #{t}
              <button
                onClick={() => handleRemoveTag(t)}
                className="hover:text-red-500 text-[10px] font-bold ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        <form onSubmit={handleAddTag} className="flex">
          <input
            type="text"
            placeholder="+ tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="text-[10px] bg-transparent border-none p-0 focus:ring-0 text-slate-400 dark:text-zinc-600 w-16"
          />
        </form>
      </div>

      {/* Text Area Editor Box */}
      <div className="flex-1 relative overflow-hidden flex flex-col mb-4">
        <textarea
          ref={textareaRef}
          value={note.content}
          onChange={handleTextChange}
          className="w-full flex-1 bg-transparent border-none text-slate-800 dark:text-zinc-200 p-0 text-xs font-mono leading-relaxed resize-none focus:ring-0 overflow-y-auto"
          placeholder="Start writing markdown or type '/' to open slash commands..."
        />

        {/* Slash Trigger Floating Menu */}
        {showSlashMenu && (
          <div
            style={{
              position: 'absolute',
              top: `${slashCoords.top}px`,
              left: `${slashCoords.left}px`
            }}
            className="w-56 glass border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1 z-40 animate-slide-up"
          >
            {SLASH_COMMANDS.map((cmd, idx) => {
              const isSelected = idx === slashIndex;
              return (
                <button
                  key={cmd.label}
                  onClick={() => executeSlashCommand(cmd)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${isSelected
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                    }`}
                >
                  <div className={isSelected ? 'text-white' : ''}>{cmd.icon}</div>
                  <div>
                    <span className="block font-medium">{cmd.label}</span>
                    <span className={`text-[9px] block opacity-85 ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-zinc-500'}`}>
                      {cmd.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Backlinks Panel (scans note references) */}
      {backlinks.length > 0 && (
        <div className="border-t border-slate-200 dark:border-zinc-900 pt-3 select-none">
          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Link size={10} className="text-blue-500" /> Backlinks to this page
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {backlinks.map((n) => (
              <span
                key={n.id}
                className="bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 px-2.5 py-1 rounded-md text-[10px] font-medium"
              >
                {n.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default MarkdownEditor;
