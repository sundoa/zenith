import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Keyboard, AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ShortcutsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsManager: React.FC<ShortcutsManagerProps> = ({ isOpen, onClose }) => {
  const { shortcuts, updateShortcut, resetShortcuts } = useStore();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string>('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Key recording listener
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const meta = isMac ? e.metaKey : e.ctrlKey;

      if (meta) keys.push('cmd');
      if (e.shiftKey) keys.push('shift');
      if (e.altKey) keys.push('alt');

      const keyName = e.key.toLowerCase();
      
      // Stop recording if Escape is pressed alone
      if (keyName === 'escape' && keys.length === 0) {
        setRecordingId(null);
        setConflictWarning(null);
        return;
      }

      if (keyName !== 'meta' && keyName !== 'control' && keyName !== 'shift' && keyName !== 'alt') {
        if (keyName === 'arrowup') keys.push('up');
        else if (keyName === 'arrowdown') keys.push('down');
        else if (keyName === 'arrowleft') keys.push('left');
        else if (keyName === 'arrowright') keys.push('right');
        else if (keyName === ' ') keys.push('space');
        else keys.push(keyName);
      }

      const combo = keys.join('+');
      setRecordedKeys(combo);

      // Collision Check
      const collision = shortcuts.find(s => s.keys.toLowerCase() === combo.toLowerCase() && s.id !== recordingId);
      if (collision) {
        setConflictWarning(`Conflict: Already bound to "${collision.name}"`);
      } else {
        setConflictWarning(null);
      }
    };

    const handleKeyUp = (_e: KeyboardEvent) => {
      // Save recorded keys on modifier release if we have a valid combo
      if (recordedKeys && !conflictWarning) {
        updateShortcut(recordingId, recordedKeys);
        setRecordingId(null);
        setRecordedKeys('');
        setConflictWarning(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [recordingId, recordedKeys, conflictWarning, shortcuts, updateShortcut]);

  if (!isOpen) return null;

  // Group shortcuts by categories
  const categories = {
    global: shortcuts.filter(s => s.category === 'global'),
    canvas: shortcuts.filter(s => s.category === 'canvas'),
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 select-none animate-fade-in"
      onClick={() => {
        if (!recordingId) onClose();
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg glass border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6 flex flex-col max-h-[85vh] mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="text-violet-500" size={18} />
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Shortcuts Manager
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetShortcuts}
              className="text-[10px] text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-800 font-medium"
              title="Reset all settings to default"
            >
              <RotateCcw size={10} /> Reset Defaults
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
          {/* Instructions */}
          <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-3 text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
            Click the key badge next to any command to map a new trigger. Press your keyboard combo to register it. Avoid remapping browser control shortcuts.
          </div>

          {Object.entries(categories).map(([catName, list]) => (
            <div key={catName} className="space-y-2">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {catName === 'global' ? 'Global Workflows' : 'Canvas Editing Controls'}
              </h3>
              <div className="space-y-1">
                {list.map((sh) => {
                  const isRecording = recordingId === sh.id;
                  return (
                    <div 
                      key={sh.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900/50 border border-transparent hover:border-slate-200/50 dark:hover:border-zinc-800/40"
                    >
                      <div className="pr-4">
                        <span className="font-semibold text-slate-800 dark:text-zinc-200 block">{sh.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">{sh.description}</span>
                      </div>
                      
                      {/* Remap badge trigger */}
                      {isRecording ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="bg-violet-500 text-white font-mono px-2 py-1 rounded border border-violet-600 animate-pulse text-[10px]">
                            {recordedKeys || 'Press keys...'}
                          </div>
                          {conflictWarning ? (
                            <span className="text-[9px] text-red-500 flex items-center gap-0.5 font-medium">
                              <AlertTriangle size={8} /> {conflictWarning}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">Press modifier + key</span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRecordingId(sh.id);
                            setRecordedKeys('');
                            setConflictWarning(null);
                          }}
                          className="bg-slate-200/60 dark:bg-zinc-800 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-500 text-slate-600 dark:text-zinc-400 font-mono px-2 py-1 rounded text-[10px] border border-slate-300/30 dark:border-zinc-700/50 transition-colors uppercase select-none min-w-[70px] text-center"
                        >
                          {sh.keys}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ShortcutsManager;
