import React, { useState } from 'react';
import { useStore, type Note } from '../store/useStore';
import {
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Hash,
  Search,
  BookOpen,
  Keyboard,
  Folder as FolderIcon,
  PinOff,
  Pin,
  Menu,
  X,
  Plus
} from 'lucide-react';

interface SidebarProps {
  onOpenShortcuts: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenShortcuts, isCollapsed, setIsCollapsed }) => {
  const {
    workspaces,
    folders,
    notes,
    activeWorkspaceId,
    activeNoteId,
    selectedTag,
    addFolder,
    addNote,
    deleteNote,
    togglePinNote,
    setActiveWorkspaceId,
    setActiveNoteId,
    setSelectedTag,
    addWorkspace,
  } = useStore();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'f-docs': true });
  const [searchFilter, setSearchFilter] = useState('');
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const workspaceFolders = folders.filter(f => f.workspaceId === activeWorkspaceId);
  const workspaceNotes = notes.filter(n => n.workspaceId === activeWorkspaceId);

  // Filter notes by search input and tags
  const filteredNotes = workspaceNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

  // Calculate unique tags for sidebar display
  const allTags = Array.from(
    new Set(workspaceNotes.flatMap(n => n.tags))
  );

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim(), activeWorkspaceId);
      setNewFolderName('');
      setShowAddFolderInput(false);
    }
  };

  const handleCreateNoteInFolder = (folderId: string | null) => {
    const noteId = addNote('Untitled Note', activeWorkspaceId, folderId);
    setActiveNoteId(noteId);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute top-4 left-4 p-2 bg-white dark:bg-[#12131a] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 z-40 transition-transform hover:scale-105"
        title="Open Sidebar"
      >
        <Menu size={16} />
      </button>
    );
  }

  return (
    <div className="h-full flex z-40 relative select-none">
      {/* 1. Left Narrow Workspace Dock */}
      <div className="w-14 bg-slate-100 dark:bg-[#0c0d12] border-r border-slate-200 dark:border-zinc-900 flex flex-col items-center py-4 gap-3">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const initials = ws.name.split(' ').pop()?.substring(0, 2) || ws.name.substring(0, 2);

          return (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative ${isActive
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                  : 'bg-slate-200/50 hover:bg-slate-200 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              title={ws.name}
            >
              {initials}
              {isActive && (
                <div className="absolute left-0 w-1 h-4 bg-violet-500 rounded-r-md top-1/2 -translate-y-1/2" />
              )}
            </button>
          );
        })}

        <div className="w-6 h-px bg-slate-200 dark:bg-zinc-800 my-2" />

        <button
          onClick={() => {
            const name = prompt('Enter workspace name:');
            if (name) {
              setSelectedTag(null);
              const newWsId = addWorkspace(name);
              setActiveWorkspaceId(newWsId);
            }
          }}
          className="w-9 h-9 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 hover:border-violet-500 text-slate-400 hover:text-violet-500 flex items-center justify-center transition-all hover:scale-105"
          title="New Workspace"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* 2. Main Navigation Panel */}
      <div className="w-60 h-full glass border-r border-slate-200 dark:border-zinc-900 flex flex-col p-4">
        {/* Workspace Title & Controls */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 truncate max-w-[140px]">
            {activeWorkspace?.name || 'Workspace'}
          </h2>
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
            <button
              onClick={() => handleCreateNoteInFolder(null)}
              className="hover:text-slate-800 dark:hover:text-white p-0.5 rounded"
              title="Add Note"
            >
              <FilePlus size={14} />
            </button>
            <button
              onClick={() => setShowAddFolderInput(!showAddFolderInput)}
              className="hover:text-slate-800 dark:hover:text-white p-0.5 rounded"
              title="Add Folder"
            >
              <FolderPlus size={14} />
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="hover:text-slate-800 dark:hover:text-white p-0.5 rounded pl-1 border-l border-slate-200 dark:border-zinc-800 ml-1"
              title="Collapse Sidebar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Inline Folder Creation Form */}
        {showAddFolderInput && (
          <form onSubmit={handleCreateFolder} className="flex gap-1 mb-3 animate-slide-down">
            <input
              type="text"
              autoFocus
              placeholder="Folder Name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 text-[11px] bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-slate-800 dark:text-white outline-none"
            />
            <button type="submit" className="bg-violet-500 hover:bg-violet-600 text-white rounded px-2 py-1 text-[10px] font-semibold">
              Add
            </button>
          </form>
        )}

        {/* Note Search Input */}
        <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 dark:text-zinc-500 mb-4 select-none">
          <Search size={13} />
          <input
            id="sidebar-search-input"
            type="text"
            placeholder="Filter pages..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 bg-transparent border-none text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 p-0 text-[11px]"
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter('')} className="hover:text-slate-900 dark:hover:text-white">✕</button>
          )}
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs select-none">

          {/* Pinned List */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Pin size={10} className="text-violet-500" /> Pinned Notes
              </span>
              <div className="space-y-0.5">
                {pinnedNotes.map((note) => (
                  <NoteItem key={note.id} note={note} isActive={note.id === activeNoteId} onSelect={setActiveNoteId} onDelete={deleteNote} onPin={togglePinNote} />
                ))}
              </div>
            </div>
          )}

          {/* Folder Hierarchy List */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <BookOpen size={10} className="text-violet-500" /> Folders & Notes
            </span>
            <div className="space-y-1">
              {workspaceFolders.map((folder) => {
                const isExpanded = expandedFolders[folder.id];
                const folderNotes = filteredNotes.filter(n => n.folderId === folder.id);

                return (
                  <div key={folder.id} className="space-y-0.5">
                    {/* Folder Row */}
                    <div
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800/40 rounded-md text-slate-700 dark:text-zinc-300 font-semibold cursor-pointer group"
                    >
                      <div className="flex items-center gap-1 truncate">
                        {isExpanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                        <FolderIcon size={12} className="text-violet-500" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateNoteInFolder(folder.id);
                          setExpandedFolders(prev => ({ ...prev, [folder.id]: true }));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* Folder Notes Sub-list */}
                    {isExpanded && (
                      <div className="pl-3.5 border-l border-slate-200 dark:border-zinc-800 ml-2 space-y-0.5">
                        {folderNotes.map((note) => (
                          <NoteItem key={note.id} note={note} isActive={note.id === activeNoteId} onSelect={setActiveNoteId} onDelete={deleteNote} onPin={togglePinNote} />
                        ))}
                        {folderNotes.length === 0 && (
                          <span className="text-[9px] text-slate-400 italic block py-0.5 pl-2 select-none">Empty folder</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Notes not in folders */}
              <div className="space-y-0.5 pt-1">
                {unpinnedNotes.filter(n => n.folderId === null).map((note) => (
                  <NoteItem key={note.id} note={note} isActive={note.id === activeNoteId} onSelect={setActiveNoteId} onDelete={deleteNote} onPin={togglePinNote} />
                ))}
              </div>
            </div>
          </div>

          {/* Tags list */}
          {allTags.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Tags
              </span>
              <div className="flex flex-wrap gap-1 py-1">
                {allTags.map((tag) => {
                  const isActive = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isActive ? null : tag)}
                      className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors border ${isActive
                          ? 'bg-violet-500 text-white border-violet-600 font-semibold'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800'
                        }`}
                    >
                      <Hash size={8} /> {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Panel Actions */}
        <div className="border-t border-slate-200 dark:border-zinc-800 pt-3 flex flex-col gap-1.5 select-none">
          <button
            onClick={onOpenShortcuts}
            className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white text-xs font-semibold"
          >
            <Keyboard size={14} className="text-violet-500" />
            <span>Shortcuts Manager</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Note Item Row
interface NoteItemProps {
  note: Note;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, isActive, onSelect, onDelete, onPin }) => {
  return (
    <div
      onClick={() => onSelect(note.id)}
      className={`flex items-center justify-between p-1.5 rounded-md text-xs cursor-pointer group truncate border border-transparent ${isActive
          ? 'bg-violet-500 text-white font-semibold shadow-sm'
          : 'hover:bg-slate-100 dark:hover:bg-zinc-850/45 text-slate-600 dark:text-zinc-400'
        }`}
    >
      <span className="truncate pr-2">{note.title || 'Untitled Note'}</span>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onPin(note.id)}
          className={`p-0.5 rounded ${isActive ? 'hover:bg-violet-600' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'}`}
          title={note.isPinned ? 'Unpin page' : 'Pin page'}
        >
          {note.isPinned ? <PinOff size={10} /> : <Pin size={10} />}
        </button>
        <button
          onClick={() => onDelete(note.id)}
          className={`p-0.5 rounded text-red-500 hover:text-red-600 ${isActive ? 'hover:bg-violet-600' : 'hover:bg-slate-200 dark:hover:bg-zinc-800'}`}
          title="Delete Note"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
};
