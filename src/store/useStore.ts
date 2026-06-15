import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for Zenith Data Model
export interface Workspace {
  id: string;
  name: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  workspaceId: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface CanvasObject {
  id: string;
  type: 'pencil' | 'highlighter' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow';
  points: [number, number, number][]; // x, y, pressure
  color: string;
  strokeWidth: number;
  opacity: number;
  layerId: string;
  recognizedText?: string | null; // For handwriting OCR indexing
}

export interface TextCard {
  id: string;
  type: 'text' | 'sticky' | 'code';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // bg color for sticky notes
  language?: string | null; // language for code snippets
  layerId: string;
}

export interface Note {
  id: string;
  title: string;
  folderId: string | null;
  workspaceId: string;
  isPinned: boolean;
  tags: string[];
  lastModified: number;
  content: string; // Markdown document description
  canvasObjects: CanvasObject[];
  textCards: TextCard[];
  layers: Layer[];
}

export interface ShortcutMapping {
  id: string;
  name: string;
  keys: string; // e.g. "cmd+k", "cmd+shift+d"
  description: string;
  category: 'global' | 'canvas' | 'editor';
}

interface UndoRedoState {
  canvasObjects: CanvasObject[];
  textCards: TextCard[];
  content: string;
}

interface ZenithState {
  // Navigation & Hierarchy
  workspaces: Workspace[];
  folders: Folder[];
  notes: Note[];
  activeWorkspaceId: string;
  activeNoteId: string | null;
  selectedTag: string | null;
  
  // Canvas Viewport Configuration
  zoom: number;
  pan: { x: number; y: number };
  activeTool: 'select' | 'pencil' | 'highlighter' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'eraser' | 'text' | 'sticky' | 'code' | 'lasso';
  currentColor: string;
  currentStrokeWidth: number;
  currentOpacity: number;
  activeLayerId: string | null;
  selectedObjectIds: string[];
  
  // Custom Keyboard Shortcuts Map
  shortcuts: ShortcutMapping[];
  
  // Theme & Preferences
  theme: 'dark' | 'light';
  vimMode: boolean;
  
  // Undo/Redo Stacks (Kept in memory, not persisted)
  undoStack: UndoRedoState[];
  redoStack: UndoRedoState[];
  
  // Actions
  setActiveWorkspaceId: (id: string) => void;
  setActiveNoteId: (id: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setVimMode: (enabled: boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setActiveTool: (tool: ZenithState['activeTool']) => void;
  setCurrentColor: (color: string) => void;
  setCurrentStrokeWidth: (w: number) => void;
  setCurrentOpacity: (o: number) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  updateShortcut: (id: string, newKeys: string) => void;
  resetShortcuts: () => void;
  
  // Note Operations
  addWorkspace: (name: string) => string;
  addFolder: (name: string, workspaceId: string, parentId?: string | null) => string;
  addNote: (title: string, workspaceId: string, folderId?: string | null) => string;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  updateNoteMetadata: (id: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'tags'>>) => void;
  updateActiveNoteText: (content: string) => void;
  
  // Hybrid Canvas Object Operations
  pushHistoryState: () => void;
  undo: () => void;
  redo: () => void;
  addCanvasObject: (obj: Omit<CanvasObject, 'id' | 'layerId'>) => void;
  updateCanvasObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteCanvasObject: (id: string) => void;
  addTextCard: (card: Omit<TextCard, 'id' | 'layerId'>) => void;
  updateTextCard: (id: string, updates: Partial<TextCard>) => void;
  deleteTextCard: (id: string) => void;
  
  // Layer Operations
  addLayer: (name: string) => string;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  deleteLayer: (layerId: string) => void;
  setActiveLayerId: (layerId: string) => void;
}

const DEFAULT_SHORTCUTS: ShortcutMapping[] = [
  { id: 'search', name: 'Universal Search', keys: 'cmd+k', description: 'Trigger the Spotlight universal search command palette', category: 'global' },
  { id: 'new-note', name: 'New Note', keys: 'cmd+n', description: 'Instantly create a new note in current folder', category: 'global' },
  { id: 'mode-switch', name: 'Toggle Edit Mode', keys: 'tab', description: 'Instantly toggle between drawing and selection tool', category: 'canvas' },
  { id: 'draw-mode', name: 'Toggle Drawing Mode', keys: 'cmd+shift+d', description: 'Switch active tool to Pencil drawing mode', category: 'canvas' },
  { id: 'global-search', name: 'Global Tags Search', keys: 'cmd+shift+f', description: 'Focus global search filter in sidebar', category: 'global' },
  { id: 'workspace-1', name: 'Switch to Workspace 1', keys: 'cmd+1', description: 'Jump to first workspace', category: 'global' },
  { id: 'workspace-2', name: 'Switch to Workspace 2', keys: 'cmd+2', description: 'Jump to second workspace', category: 'global' },
  { id: 'workspace-3', name: 'Switch to Workspace 3', keys: 'cmd+3', description: 'Jump to third workspace', category: 'global' },
  { id: 'undo', name: 'Undo Canvas Action', keys: 'cmd+z', description: 'Undo last drawing or element movement', category: 'canvas' },
  { id: 'redo', name: 'Redo Canvas Action', keys: 'cmd+shift+z', description: 'Redo last undone action', category: 'canvas' },
  { id: 'delete', name: 'Delete Selection', keys: 'backspace', description: 'Delete selected drawing strokes or cards', category: 'canvas' },
  { id: 'zoom-in', name: 'Zoom In', keys: 'cmd+=', description: 'Zoom into the infinite workspace', category: 'canvas' },
  { id: 'zoom-out', name: 'Zoom Out', keys: 'cmd+-', description: 'Zoom out of the infinite workspace', category: 'canvas' },
];

// Seed Data Helpers
const WORKSPACE_ONBOARDING_ID = 'ws-onboarding';
const WORKSPACE_PERSONAL_ID = 'ws-personal';
const FOLDER_DOCS_ID = 'f-docs';
const NOTE_WELCOME_ID = 'n-welcome';

const INITIAL_LAYERS: Layer[] = [
  { id: 'ly-drawing', name: 'Sketches & Notes', visible: true, locked: false },
  { id: 'ly-diagrams', name: 'Flowcharts', visible: true, locked: false },
  { id: 'ly-cards', name: 'Sticky Notes', visible: true, locked: false },
];

export const useStore = create<ZenithState>()(
  persist(
    (set, get) => ({
      // Navigation & Hierarchy
      workspaces: [
        { id: WORKSPACE_ONBOARDING_ID, name: 'Zenith' },
        { id: WORKSPACE_PERSONAL_ID, name: '🧠 Personal Space' },
      ],
      folders: [
        { id: FOLDER_DOCS_ID, name: 'Getting Started', parentId: null, workspaceId: WORKSPACE_ONBOARDING_ID },
      ],
      notes: [
        {
          id: NOTE_WELCOME_ID,
          title: 'Welcome to Zenith',
          folderId: FOLDER_DOCS_ID,
          workspaceId: WORKSPACE_ONBOARDING_ID,
          isPinned: true,
          tags: ['welcome', 'canvas', 'onboarding'],
          lastModified: Date.now(),
          content: `# Zenith Infinite Workspace\n\nWelcome to Zenith, a premium desktop experience bridging drawings, visual sketches, text editors, and keyboard shortcuts.\n\n### Core Mechanics:\n- **Infinite Canvas**: Scroll around using **Space + Drag** or standard mouse panning. Zoom with **CMD + Wheel**.\n- **Dual Editing Modes**: Draw sketches and annotate notes. Press **TAB** to switch instantly between \`Selection Mode\` and \`Pencil tool\`.\n- **Translucent Dashboard**: Hit **CMD + K** to open the Command Palette. Type queries to search notes, workspaces, and simulated OCR sketches.`,
          layers: INITIAL_LAYERS,
          canvasObjects: [
            // Sample Sketch: A hand drawn arrow pointing to a sticky note
            {
              id: 'co-arrow-1',
              type: 'arrow',
              points: [
                [180, 280, 0.5],
                [220, 270, 0.6],
                [280, 260, 0.7],
              ],
              color: '#a855f7',
              strokeWidth: 4,
              opacity: 1,
              layerId: 'ly-diagrams',
              recognizedText: 'flowchart arrow'
            },
            // Hand-drawn circle labeled OCR (simulated)
            {
              id: 'co-ocr-circle',
              type: 'circle',
              points: [
                [350, 480, 0.5],
                [380, 450, 0.6],
                [420, 480, 0.7],
                [380, 510, 0.5],
                [350, 480, 0.4]
              ],
              color: '#14b8a6',
              strokeWidth: 3,
              opacity: 0.9,
              layerId: 'ly-drawing',
              recognizedText: 'Mind Map Ideas'
            }
          ],
          textCards: [
            {
              id: 'tc-sticky-welcome',
              type: 'sticky',
              content: '💡 Double click anywhere on the canvas to place a note or card instantly!\n\nTry drawing inside or around this box.',
              x: 310,
              y: 180,
              width: 260,
              height: 140,
              color: '#fef08a', // Yellow sticky card
              layerId: 'ly-cards'
            },
            {
              id: 'tc-code-sample',
              type: 'code',
              content: `// Keyboard layout switch listener
window.addEventListener('keydown', (e) => {
  if (e.metaKey && e.key === 'k') {
    e.preventDefault();
    toggleCommandPalette();
  }
});`,
              x: 610,
              y: 200,
              width: 320,
              height: 180,
              language: 'typescript',
              layerId: 'ly-cards'
            }
          ],
        },
        {
          id: 'n-shortcuts',
          title: 'Keyboard Workflows',
          folderId: FOLDER_DOCS_ID,
          workspaceId: WORKSPACE_ONBOARDING_ID,
          isPinned: false,
          tags: ['shortcuts', 'speed'],
          lastModified: Date.now() - 1000 * 60,
          content: `# Keyboard Shortcuts Guide\n\nZenith is optimized for lightning-fast cursor-less execution. Press **CMD + K** to execute commands, open files, or switch layouts.\n\n### Common Shortcuts:\n- \`CMD + N\`: Create a new note\n- \`CMD + SHIFT + D\`: Enter drawing mode\n- \`TAB\`: Toggle select / draw tools\n- \`Backspace\`: Delete selection\n- \`CMD + 1..9\`: Switch active workspaces\n\nYou can click **Shortcuts Manager** in the bottom-left settings to map keys.`,
          layers: INITIAL_LAYERS,
          canvasObjects: [],
          textCards: [
            {
              id: 'tc-sticky-nav',
              type: 'sticky',
              content: '⚡ Press Cmd+K and type "theme" to toggle Dark/Light mode instantly!',
              x: 100,
              y: 100,
              width: 250,
              height: 100,
              color: '#fbcfe8', // Pink card
              layerId: 'ly-cards'
            }
          ]
        }
      ],
      activeWorkspaceId: WORKSPACE_ONBOARDING_ID,
      activeNoteId: NOTE_WELCOME_ID,
      selectedTag: null,
      
      // Viewport State
      zoom: 1,
      pan: { x: 0, y: 0 },
      activeTool: 'select',
      currentColor: '#8b5cf6', // Violet default
      currentStrokeWidth: 3,
      currentOpacity: 1,
      activeLayerId: 'ly-drawing',
      selectedObjectIds: [],
      
      // Shortcuts State
      shortcuts: DEFAULT_SHORTCUTS,
      
      // Themes & Toggles
      theme: 'dark',
      vimMode: false,
      
      // History Stacks
      undoStack: [],
      redoStack: [],
      
      // Setters
      setActiveWorkspaceId: (id) => {
        const workspaceNotes = get().notes.filter(n => n.workspaceId === id);
        const firstNoteId = workspaceNotes.length > 0 ? workspaceNotes[0].id : null;
        set({ 
          activeWorkspaceId: id, 
          activeNoteId: firstNoteId,
          zoom: 1,
          pan: { x: 0, y: 0 },
          selectedObjectIds: [],
          undoStack: [],
          redoStack: []
        });
      },
      setActiveNoteId: (id) => {
        set({ 
          activeNoteId: id,
          zoom: 1,
          pan: { x: 0, y: 0 },
          selectedObjectIds: [],
          undoStack: [],
          redoStack: []
        });
      },
      setSelectedTag: (tag) => set({ selectedTag: tag }),
      setTheme: (theme) => set({ theme }),
      setVimMode: (enabled) => set({ vimMode: enabled }),
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(zoom, 5)) }),
      setPan: (pan) => set({ pan }),
      setActiveTool: (activeTool) => set({ activeTool, selectedObjectIds: activeTool !== 'select' ? [] : get().selectedObjectIds }),
      setCurrentColor: (currentColor) => set({ currentColor }),
      setCurrentStrokeWidth: (currentStrokeWidth) => set({ currentStrokeWidth }),
      setCurrentOpacity: (currentOpacity) => set({ currentOpacity }),
      setSelectedObjectIds: (selectedObjectIds) => set({ selectedObjectIds }),
      
      updateShortcut: (id, newKeys) => set((state) => ({
        shortcuts: state.shortcuts.map(s => s.id === id ? { ...s, keys: newKeys } : s)
      })),
      
      resetShortcuts: () => set({ shortcuts: DEFAULT_SHORTCUTS }),
      
      // Workspaces & Folders Actions
      addWorkspace: (name) => {
        const id = 'ws-' + Math.random().toString(36).substring(2, 9);
        set((state) => ({
          workspaces: [...state.workspaces, { id, name }]
        }));
        return id;
      },
      addFolder: (name, workspaceId, parentId = null) => {
        const id = 'f-' + Math.random().toString(36).substring(2, 9);
        set((state) => ({
          folders: [...state.folders, { id, name, parentId, workspaceId }]
        }));
        return id;
      },
      addNote: (title, workspaceId, folderId = null) => {
        const id = 'n-' + Math.random().toString(36).substring(2, 9);
        const newNote: Note = {
          id,
          title,
          folderId,
          workspaceId,
          isPinned: false,
          tags: [],
          lastModified: Date.now(),
          content: `# ${title}\n\nStart editing this infinite page...`,
          layers: INITIAL_LAYERS,
          canvasObjects: [],
          textCards: []
        };
        set((state) => ({
          notes: [...state.notes, newNote],
          activeNoteId: id,
          zoom: 1,
          pan: { x: 0, y: 0 },
          selectedObjectIds: []
        }));
        return id;
      },
      deleteNote: (id) => {
        set((state) => {
          const filteredNotes = state.notes.filter(n => n.id !== id);
          let newActiveId = state.activeNoteId;
          if (state.activeNoteId === id) {
            const workspaceNotes = filteredNotes.filter(n => n.workspaceId === state.activeWorkspaceId);
            newActiveId = workspaceNotes.length > 0 ? workspaceNotes[0].id : null;
          }
          return {
            notes: filteredNotes,
            activeNoteId: newActiveId,
            selectedObjectIds: []
          };
        });
      },
      togglePinNote: (id) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned, lastModified: Date.now() } : n)
      })),
      updateNoteMetadata: (id, updates) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, ...updates, lastModified: Date.now() } : n)
      })),
      updateActiveNoteText: (content) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? { ...n, content, lastModified: Date.now() } : n)
        }));
      },
      
      // Undo/Redo Engine
      pushHistoryState: () => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        const note = get().notes.find(n => n.id === activeId);
        if (!note) return;
        
        const snapshot: UndoRedoState = {
          canvasObjects: JSON.parse(JSON.stringify(note.canvasObjects)),
          textCards: JSON.parse(JSON.stringify(note.textCards)),
          content: note.content
        };
        
        set((state) => ({
          undoStack: [...state.undoStack.slice(-49), snapshot], // Limit history size to 50
          redoStack: [] // Clear redo stack on new action
        }));
      },
      
      undo: () => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        const note = get().notes.find(n => n.id === activeId);
        if (!note || get().undoStack.length === 0) return;
        
        const prevStack = [...get().undoStack];
        const prev = prevStack.pop()!;
        
        const currentSnapshot: UndoRedoState = {
          canvasObjects: JSON.parse(JSON.stringify(note.canvasObjects)),
          textCards: JSON.parse(JSON.stringify(note.textCards)),
          content: note.content
        };
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            canvasObjects: prev.canvasObjects,
            textCards: prev.textCards,
            content: prev.content,
            lastModified: Date.now()
          } : n),
          undoStack: prevStack,
          redoStack: [...state.redoStack, currentSnapshot],
          selectedObjectIds: []
        }));
      },
      
      redo: () => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        const note = get().notes.find(n => n.id === activeId);
        if (!note || get().redoStack.length === 0) return;
        
        const nextStack = [...get().redoStack];
        const next = nextStack.pop()!;
        
        const currentSnapshot: UndoRedoState = {
          canvasObjects: JSON.parse(JSON.stringify(note.canvasObjects)),
          textCards: JSON.parse(JSON.stringify(note.textCards)),
          content: note.content
        };
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            canvasObjects: next.canvasObjects,
            textCards: next.textCards,
            content: next.content,
            lastModified: Date.now()
          } : n),
          undoStack: [...state.undoStack, currentSnapshot],
          redoStack: nextStack,
          selectedObjectIds: []
        }));
      },
      
      // Drawn Objects
      addCanvasObject: (obj) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        get().pushHistoryState();
        
        const activeLayer = get().activeLayerId || 'ly-drawing';
        const newObj: CanvasObject = {
          ...obj,
          id: 'co-' + Math.random().toString(36).substring(2, 9),
          layerId: activeLayer
        };
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            canvasObjects: [...n.canvasObjects, newObj],
            lastModified: Date.now()
          } : n)
        }));
      },
      
      updateCanvasObject: (id, updates) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            canvasObjects: n.canvasObjects.map(co => co.id === id ? { ...co, ...updates } : co),
            lastModified: Date.now()
          } : n)
        }));
      },
      
      deleteCanvasObject: (id) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        get().pushHistoryState();
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            canvasObjects: n.canvasObjects.filter(co => co.id !== id),
            lastModified: Date.now()
          } : n),
          selectedObjectIds: state.selectedObjectIds.filter(sid => sid !== id)
        }));
      },
      
      // Text Cards (Rich text / stickies)
      addTextCard: (card) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        get().pushHistoryState();
        
        const activeLayer = get().activeLayerId || 'ly-cards';
        const newCard: TextCard = {
          ...card,
          id: 'tc-' + Math.random().toString(36).substring(2, 9),
          layerId: activeLayer
        };
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            textCards: [...n.textCards, newCard],
            lastModified: Date.now()
          } : n)
        }));
      },
      
      updateTextCard: (id, updates) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            textCards: n.textCards.map(tc => tc.id === id ? { ...tc, ...updates } : tc),
            lastModified: Date.now()
          } : n)
        }));
      },
      
      deleteTextCard: (id) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        get().pushHistoryState();
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            textCards: n.textCards.filter(tc => tc.id !== id),
            lastModified: Date.now()
          } : n),
          selectedObjectIds: state.selectedObjectIds.filter(sid => sid !== id)
        }));
      },
      
      // Layer Actions
      addLayer: (name) => {
        const activeId = get().activeNoteId;
        if (!activeId) return '';
        const id = 'ly-' + Math.random().toString(36).substring(2, 9);
        const newLayer: Layer = { id, name, visible: true, locked: false };
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            layers: [...n.layers, newLayer]
          } : n),
          activeLayerId: id
        }));
        return id;
      },
      
      toggleLayerVisibility: (layerId) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            layers: n.layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
          } : n)
        }));
      },
      
      toggleLayerLock: (layerId) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        
        set((state) => ({
          notes: state.notes.map(n => n.id === activeId ? {
            ...n,
            layers: n.layers.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l)
          } : n)
        }));
      },
      
      deleteLayer: (layerId) => {
        const activeId = get().activeNoteId;
        if (!activeId) return;
        
        set((state) => {
          const note = state.notes.find(n => n.id === activeId);
          if (!note) return {};
          
          const filteredLayers = note.layers.filter(l => l.id !== layerId);
          const activeLayerId = state.activeLayerId === layerId
            ? (filteredLayers.length > 0 ? filteredLayers[0].id : null)
            : state.activeLayerId;
            
          return {
            notes: state.notes.map(n => n.id === activeId ? {
              ...n,
              layers: filteredLayers,
              // Move shapes on deleted layer to the first available layer
              canvasObjects: n.canvasObjects.map(co => co.layerId === layerId ? { ...co, layerId: filteredLayers[0]?.id || 'ly-drawing' } : co),
              textCards: n.textCards.map(tc => tc.layerId === layerId ? { ...tc, layerId: filteredLayers[0]?.id || 'ly-cards' } : tc)
            } : n),
            activeLayerId
          };
        });
      },
      
      setActiveLayerId: (activeLayerId) => set({ activeLayerId })
    }),
    {
      name: 'zenith-workspace-store',
      partialize: (state) => ({
        workspaces: state.workspaces,
        folders: state.folders,
        notes: state.notes,
        activeWorkspaceId: state.activeWorkspaceId,
        activeNoteId: state.activeNoteId,
        theme: state.theme,
        vimMode: state.vimMode,
        shortcuts: state.shortcuts
      })
    }
  )
);
