import { useEffect } from 'react';
import { useStore } from '../store/useStore';

interface ShortcutCallbacks {
  onToggleSearch: () => void;
  onOpenShortcuts: () => void;
  onFocusSidebarSearch: () => void;
}

export const useShortcuts = (callbacks: ShortcutCallbacks) => {
  const {
    shortcuts,
    workspaces,
    activeWorkspaceId,
    activeTool,
    setActiveWorkspaceId,
    setActiveTool,
    addNote,
    undo,
    redo,
    deleteCanvasObject,
    deleteTextCard,
    selectedObjectIds,
    setSelectedObjectIds
  } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Build string representation of pressed keys (e.g., 'cmd+k', 'cmd+shift+d')
      const keysPressed: string[] = [];
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const meta = isMac ? e.metaKey : e.ctrlKey;
      
      if (meta) keysPressed.push('cmd');
      if (e.shiftKey) keysPressed.push('shift');
      if (e.altKey) keysPressed.push('alt');
      
      const keyName = e.key.toLowerCase();
      
      // Filter out modifier keys themselves from being added as the primary key
      if (keyName !== 'meta' && keyName !== 'control' && keyName !== 'shift' && keyName !== 'alt') {
        // Normalize arrow keys and backspace/delete
        if (keyName === 'arrowup') keysPressed.push('up');
        else if (keyName === 'arrowdown') keysPressed.push('down');
        else if (keyName === 'arrowleft') keysPressed.push('left');
        else if (keyName === 'arrowright') keysPressed.push('right');
        else if (keyName === ' ') keysPressed.push('space');
        else keysPressed.push(keyName);
      }

      const keyCombo = keysPressed.join('+');
      if (!keyCombo) return;

      // 2. Identify if target element is an input/textarea
      const isInputActive = 
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable');

      // 3. Find if shortcut matches a registered command
      const matchedShortcut = shortcuts.find(s => s.keys.toLowerCase() === keyCombo);
      if (!matchedShortcut) return;

      // Check if command is blocked inside inputs
      // Commands like cmd+k should execute even inside inputs. Drawing tools or workspace jumps should be ignored.
      if (isInputActive && matchedShortcut.id !== 'search' && matchedShortcut.id !== 'undo' && matchedShortcut.id !== 'redo') {
        return;
      }

      // 4. Dispatch Actions
      e.preventDefault();
      
      switch (matchedShortcut.id) {
        case 'search':
          callbacks.onToggleSearch();
          break;
          
        case 'new-note':
          addNote('New Note', activeWorkspaceId);
          setActiveTool('select');
          break;

        case 'mode-switch':
          // TAB: switches between selection (cursor) and drawing brush (pencil)
          const nextTool = activeTool === 'select' ? 'pencil' : 'select';
          setActiveTool(nextTool);
          break;

        case 'draw-mode':
          setActiveTool('pencil');
          break;

        case 'global-search':
          callbacks.onFocusSidebarSearch();
          break;

        case 'undo':
          undo();
          break;

        case 'redo':
          redo();
          break;

        case 'delete':
          if (selectedObjectIds.length > 0) {
            selectedObjectIds.forEach(id => {
              if (id.startsWith('co-')) {
                deleteCanvasObject(id);
              } else if (id.startsWith('tc-')) {
                deleteTextCard(id);
              }
            });
            setSelectedObjectIds([]);
          }
          break;

        case 'workspace-1':
          if (workspaces[0]) setActiveWorkspaceId(workspaces[0].id);
          break;
        case 'workspace-2':
          if (workspaces[1]) setActiveWorkspaceId(workspaces[1].id);
          break;
        case 'workspace-3':
          if (workspaces[2]) setActiveWorkspaceId(workspaces[2].id);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    shortcuts,
    workspaces,
    activeWorkspaceId,
    activeTool,
    selectedObjectIds,
    setActiveWorkspaceId,
    setActiveTool,
    addNote,
    undo,
    redo,
    deleteCanvasObject,
    deleteTextCard,
    setSelectedObjectIds,
    callbacks
  ]);
};
export default useShortcuts;
