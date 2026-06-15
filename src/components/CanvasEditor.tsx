import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { CanvasObject, TextCard } from '../store/useStore';
import { drawSmoothedStroke, smoothPoints } from '../utils/smoothing';
import { recognizeAndSnapShape } from '../utils/shapeRecognition';
import { 
  MousePointer, 
  Edit3, 
  Highlighter, 
  Sparkles, 
  Eraser, 
  Layers, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Maximize2, 
  FileText, 
  Terminal, 
  Grid,
  Undo2,
  Redo2,
  Download,

} from 'lucide-react';

const STICKY_COLORS = [
  { name: 'Yellow', value: '#fef08a' }, // yellow-200
  { name: 'Teal', value: '#99f6e4' },   // teal-200
  { name: 'Pink', value: '#fbcfe8' },   // pink-200
  { name: 'Purple', value: '#e9d5ff' }, // purple-200
  { name: 'Green', value: '#bbf7d0' },  // green-200
];

export const CanvasEditor: React.FC = () => {
  const {
    notes,
    activeNoteId,
    activeTool,
    currentColor,
    currentStrokeWidth,
    currentOpacity,
    zoom,
    pan,
    activeLayerId,
    selectedObjectIds,
    theme,
    undoStack,
    redoStack,
    setActiveTool,
    setCurrentColor,
    setCurrentStrokeWidth,

    setZoom,
    setPan,
    setSelectedObjectIds,
    addCanvasObject,

    deleteCanvasObject,
    addTextCard,
    updateTextCard,
    deleteTextCard,
    addLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    deleteLayer,
    setActiveLayerId,
    undo,
    redo
  } = useStore();

  const activeNote = notes.find(n => n.id === activeNoteId);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Refs for live drawing (avoids React state lag during active strokes)
  const drawnPointsRef = useRef<[number, number, number][]>([]);
  const rafRef = useRef<number | null>(null);

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });


  // Dragging/Resizing card states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 });
  
  const [resizedCardId, setResizedCardId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Floating Panel Visibility
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Key listener for Spacebar panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT' && !document.activeElement?.hasAttribute('contenteditable')) {
        setSpacePressed(true);
        if (activeTool !== 'select') {
          setActiveTool('select');
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool, setActiveTool]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Adjust Canvas Resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    
    drawCanvas();
  }, [activeNoteId, zoom, pan, activeNote?.canvasObjects, activeNote?.layers]);

  // Clear selections on changing active tools
  useEffect(() => {
    if (activeTool !== 'select') {
      setSelectedObjectIds([]);
    }
  }, [activeTool, setSelectedObjectIds]);

  // Main canvas renderer loop
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !activeNote) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply Zoom & Pan conversions
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid bounds guide if Zoom is low
    const visibleLayers = activeNote.layers.filter(l => l.visible);
    const visibleLayerIds = visibleLayers.map(l => l.id);

    // Render Canvas Objects (strokes/shapes)
    activeNote.canvasObjects.forEach((co) => {
      // Skip if layer is not visible
      if (!visibleLayerIds.includes(co.layerId)) return;

      const isSelected = selectedObjectIds.includes(co.id);
      ctx.save();
      
      // Draw highlight ring if selected
      if (isSelected && activeTool === 'select') {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = co.strokeWidth + 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        drawRawPoints(ctx, co.points);
        ctx.stroke();
      }

      ctx.strokeStyle = co.color;
      ctx.fillStyle = co.color;
      ctx.lineWidth = co.strokeWidth;
      ctx.globalAlpha = co.opacity;

      if (co.type === 'pencil' || co.type === 'highlighter') {
        if (co.type === 'highlighter') {
          ctx.strokeStyle = '#fef08a'; // Highlighter color preset
          ctx.globalAlpha = 0.45;
        }
        drawSmoothedStroke(ctx, co.points, co.strokeWidth, co.type === 'highlighter');
      } else {
        // Draw Snap Shapes
        drawSnappedShape(ctx, co);
      }
      ctx.restore();
    });

    // Render current active drawing stroke preview
    if (isDrawing && drawnPointsRef.current.length > 0) {
      ctx.save();
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.lineWidth = currentStrokeWidth;
      ctx.globalAlpha = activeTool === 'highlighter' ? 0.45 : currentOpacity;
      
      if (activeTool === 'pencil' || activeTool === 'highlighter') {
        const smoothed = smoothPoints(drawnPointsRef.current);
        drawSmoothedStroke(ctx, smoothed, currentStrokeWidth, activeTool === 'highlighter');
      } else if (activeTool === 'lasso') {
        // Draw lasso polygon dotted
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        drawnPointsRef.current.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        });
        ctx.stroke();
      } else {
        // Render preview of snapping shape (line, circle, rect, etc.)
        const simulatedObj: CanvasObject = {
          id: 'preview',
          type: activeTool as any,
          points: drawnPointsRef.current,
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          opacity: currentOpacity,
          layerId: 'preview'
        };
        drawSnappedShape(ctx, simulatedObj);
      }
      ctx.restore();
    }

    ctx.restore();
  };

  const drawRawPoints = (ctx: CanvasRenderingContext2D, points: [number, number, number][]) => {
    if (points.length === 0) return;
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
  };

  const drawSnappedShape = (ctx: CanvasRenderingContext2D, co: CanvasObject) => {
    if (co.points.length < 2) return;
    const start = co.points[0];
    const end = co.points[co.points.length - 1];

    if (co.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();
    } else if (co.type === 'arrow') {
      // Draw main line
      ctx.beginPath();
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();

      // Draw arrow head
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const headLength = Math.max(12, co.strokeWidth * 3);
      ctx.beginPath();
      ctx.moveTo(end[0], end[1]);
      ctx.lineTo(
        end[0] - headLength * Math.cos(angle - Math.PI / 6),
        end[1] - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        end[0] - headLength * Math.cos(angle + Math.PI / 6),
        end[1] - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (co.type === 'rect') {
      // Calculate bounding box from points
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const p of co.points) {
        minX = Math.min(minX, p[0]);
        maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
      }
      ctx.beginPath();
      ctx.rect(minX, minY, maxX - minX, maxY - minY);
      ctx.stroke();
    } else if (co.type === 'circle') {
      // Calculate circle metrics
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const p of co.points) {
        minX = Math.min(minX, p[0]);
        maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
      }
      const radius = (maxX - minX + (maxY - minY)) / 4;
      const cx = minX + (maxX - minX) / 2;
      const cy = minY + (maxY - minY) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (co.type === 'triangle') {
      if (co.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(co.points[0][0], co.points[0][1]);
        ctx.lineTo(co.points[1][0], co.points[1][1]);
        ctx.lineTo(co.points[2][0], co.points[2][1]);
        ctx.closePath();
        ctx.stroke();
      }
    }
  };

  // Convert client cursor screen coordinate to zoomed-and-panned Canvas coordinate
  const screenToCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeNote) return;
    
    // Check if dragging workspace (Space + click or middle click)
    if (spacePressed || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);

    // Lasso selection check
    if (activeTool === 'lasso') {
      setIsDrawing(true);
      drawnPointsRef.current = [[x, y, e.pressure || 0.5]];
      return;
    }

    // Freehand/Drawing tool logic
    if (activeTool !== 'select' && activeTool !== 'eraser') {
      // Make sure active layer is unlocked
      const activeLayer = activeNote.layers.find(l => l.id === activeLayerId);
      if (activeLayer?.locked) return; // Locked layer!

      setIsDrawing(true);
      drawnPointsRef.current = [[x, y, e.pressure || 0.5]];
      return;
    }

    // Eraser logic
    if (activeTool === 'eraser') {
      eraseAtCoords(x, y);
      setIsDrawing(true);
      return;
    }

    // Selection logic: check if clicked a stroke
    if (activeTool === 'select') {
      const clickedStroke = findStrokeAtCoords(x, y);
      if (clickedStroke) {
        // Toggle selection with Command / Shift key, or single select
        if (e.metaKey || e.shiftKey) {
          if (selectedObjectIds.includes(clickedStroke.id)) {
            setSelectedObjectIds(selectedObjectIds.filter(id => id !== clickedStroke.id));
          } else {
            setSelectedObjectIds([...selectedObjectIds, clickedStroke.id]);
          }
        } else {
          setSelectedObjectIds([clickedStroke.id]);
        }
      } else if (!e.metaKey && !e.shiftKey) {
        // Clicked empty space: clear select
        setSelectedObjectIds([]);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing) return;

    const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);

    if (activeTool === 'eraser') {
      eraseAtCoords(x, y);
      return;
    }

    // Append drawing coordinate (ref, not state — avoids stale closure lag)
    drawnPointsRef.current = [...drawnPointsRef.current, [x, y, e.pressure || 0.5]];
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        drawCanvas();
      });
    }
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPanning(false);
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'eraser') {
      return;
    }

    if (activeTool === 'lasso') {
      performLassoSelection();
      drawnPointsRef.current = [];
      return;
    }

    if (drawnPointsRef.current.length < 2) {
      drawnPointsRef.current = [];
      return;
    }

    // Make sure layer is unlocked
    const activeLayer = activeNote?.layers.find(l => l.id === activeLayerId);
    if (activeLayer?.locked) {
      drawnPointsRef.current = [];
      return;
    }

    // Drawing finishes
    if (activeTool === 'pencil' || activeTool === 'highlighter') {
      const smoothed = smoothPoints(drawnPointsRef.current);
      addCanvasObject({
        type: activeTool,
        points: smoothed,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        opacity: activeTool === 'highlighter' ? 0.45 : currentOpacity
      });
    } else if (activeTool === 'arrow' || activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle' || activeTool === 'triangle') {
      // Shape Snapping mode explicitly chosen
      addCanvasObject({
        type: activeTool,
        points: drawnPointsRef.current,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        opacity: currentOpacity
      });
    } else if (activeTool === 'select') {
      // Recognition shape snap check (if drawing a path inside select mode, it can auto snap if resembling standard shapes)
      const snapResult = recognizeAndSnapShape(drawnPointsRef.current);
      if (snapResult.type) {
        addCanvasObject({
          type: snapResult.type,
          points: snapResult.points,
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          opacity: currentOpacity,
          recognizedText: `${snapResult.type} drawing shape`
        });
      } else {
        // Fallback: don't draw in pure selection mode unless it's a recognized shape!
      }
    }

    drawnPointsRef.current = [];
  };

  // Click double-tap logic to spawn markdown / code blocks
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (activeTool !== 'select' && activeTool !== 'text' && activeTool !== 'sticky' && activeTool !== 'code') return;
    if (!activeNote) return;

    const { x, y } = screenToCanvasCoords(e.clientX, e.clientY);
    
    // Spawn type based on active tool, default to sticky note in selection mode
    let type: 'text' | 'sticky' | 'code' = 'sticky';
    if (activeTool === 'text') type = 'text';
    if (activeTool === 'code') type = 'code';

    addTextCard({
      type,
      content: type === 'sticky' ? 'Write idea...' : type === 'code' ? '// write code...' : 'Rich markdown card...',
      x: x - 100, // center it
      y: y - 50,
      width: type === 'code' ? 300 : 200,
      height: type === 'code' ? 160 : 120,
      color: type === 'sticky' ? STICKY_COLORS[0].value : undefined,
      language: type === 'code' ? 'typescript' : undefined
    });
  };

  // Finder Helpers
  const findStrokeAtCoords = (x: number, y: number) => {
    if (!activeNote) return null;
    // Walk backwards to select topmost drawn object
    for (let i = activeNote.canvasObjects.length - 1; i >= 0; i--) {
      const co = activeNote.canvasObjects[i];
      // Skip locked/hidden layer
      const layer = activeNote.layers.find(l => l.id === co.layerId);
      if (!layer?.visible || layer?.locked) continue;

      // Check distance of click to all points in the path
      for (const p of co.points) {
        const dist = Math.hypot(p[0] - x, p[1] - y);
        if (dist < co.strokeWidth + 6) {
          return co;
        }
      }
    }
    return null;
  };

  const eraseAtCoords = (x: number, y: number) => {
    if (!activeNote) return;
    activeNote.canvasObjects.forEach((co) => {
      // Check if layer is locked
      const layer = activeNote.layers.find(l => l.id === co.layerId);
      if (layer?.locked) return;

      for (const p of co.points) {
        const dist = Math.hypot(p[0] - x, p[1] - y);
        if (dist < co.strokeWidth + 12) {
          deleteCanvasObject(co.id);
          return;
        }
      }
    });
  };

  // Lasso algorithm: checks which objects fall inside drawn path
  const performLassoSelection = () => {
    if (!activeNote || drawnPointsRef.current.length < 3) return;
    
    // Polygon points represent the closed lasso path
    const polygon = drawnPointsRef.current.map(p => [p[0], p[1]] as [number, number]);
    const selectedIds: string[] = [];

    // Ray-casting check for containment
    const isPointInLasso = (px: number, py: number) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > py) !== (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    // Check drawing strokes
    activeNote.canvasObjects.forEach((co) => {
      // Only select if stroke has at least one point inside the lasso
      const someInside = co.points.some(p => isPointInLasso(p[0], p[1]));
      if (someInside) {
        selectedIds.push(co.id);
      }
    });

    // Check text/sticky cards
    activeNote.textCards.forEach((card) => {
      // Check center of the card
      const cx = card.x + card.width / 2;
      const cy = card.y + card.height / 2;
      if (isPointInLasso(cx, cy)) {
        selectedIds.push(card.id);
      }
    });

    setSelectedObjectIds(selectedIds);
    if (selectedIds.length > 0) {
      setActiveTool('select');
    }
  };

  // Card Drag & Resize Handlers
  const handleCardDragStart = (e: React.MouseEvent, card: TextCard) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    
    setDraggedCardId(card.id);
    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);
    setDragStart({ x: canvasCoords.x, y: canvasCoords.y });
    setCardOffset({ x: card.x, y: card.y });
    setSelectedObjectIds([card.id]);
  };

  const handleCardResizeStart = (e: React.MouseEvent, card: TextCard) => {
    e.stopPropagation();
    e.preventDefault();
    if (activeTool !== 'select') return;

    setResizedCardId(card.id);
    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);
    setResizeStart({ 
      width: card.width, 
      height: card.height, 
      x: canvasCoords.x, 
      y: canvasCoords.y 
    });
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    const canvasCoords = screenToCanvasCoords(e.clientX, e.clientY);

    // Card Dragging
    if (draggedCardId) {
      const dx = canvasCoords.x - dragStart.x;
      const dy = canvasCoords.y - dragStart.y;
      updateTextCard(draggedCardId, {
        x: cardOffset.x + dx,
        y: cardOffset.y + dy
      });
    }

    // Card Resizing
    if (resizedCardId) {
      const dx = canvasCoords.x - resizeStart.x;
      const dy = canvasCoords.y - resizeStart.y;
      updateTextCard(resizedCardId, {
        width: Math.max(100, resizeStart.width + dx),
        height: Math.max(60, resizeStart.height + dy)
      });
    }
  };

  const handleContainerMouseUp = () => {
    setDraggedCardId(null);
    setResizedCardId(null);
  };

  // Add Layer Helper
  const handleAddLayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLayerName.trim()) {
      addLayer(newLayerName.trim());
      setNewLayerName('');
    }
  };

  // Export Canvas Functions
  const exportCanvasAsJSON = () => {
    if (!activeNote) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeNote, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeNote.title.toLowerCase().replace(/\s+/g, '_')}_zenith.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!activeNote) {
    return (
      <div className="relative w-full h-full flex-1 flex flex-col items-center justify-center gap-3 select-none bg-[#fafafa] dark:bg-[#07080b]">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
          <Edit3 size={18} className="text-slate-400 dark:text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-slate-400 dark:text-zinc-500">No note selected</p>
        <p className="text-[11px] text-slate-400 dark:text-zinc-600">Select or create a note from the sidebar</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden select-none bg-[#fafafa] dark:bg-[#07080b] dot-grid"
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
    >
      {/* 2D HTML5 Canvas Drawing Layer */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair z-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      />

      {/* HTML Overlays (Rich Text, Sticky notes, Code Blocks) */}
      {activeNote && (
        <div 
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {activeNote.textCards.map((card) => {
            const isSelected = selectedObjectIds.includes(card.id);
            const isEditing = editingCardId === card.id;
            const layer = activeNote.layers.find(l => l.id === card.layerId);
            
            // Skip rendering if card layer is hidden
            if (layer && !layer.visible) return null;

            return (
              <div
                key={card.id}
                style={{
                  position: 'absolute',
                  left: `${card.x}px`,
                  top: `${card.y}px`,
                  width: `${card.width}px`,
                  height: `${card.height}px`,
                  backgroundColor: card.type === 'sticky' ? card.color : undefined,
                }}
                className={`pointer-events-auto rounded-lg shadow-lg flex flex-col group transition-shadow ${
                  card.type === 'sticky' 
                    ? 'text-slate-800 border-none p-4 font-sans font-medium' 
                    : 'bg-white dark:bg-[#12131a] border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200'
                } ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'hover:shadow-md'
                }`}
                onMouseDown={(e) => handleCardDragStart(e, card)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingCardId(card.id);
                }}
              >
                {/* Drag handle banner for standard and code cards */}
                {card.type !== 'sticky' && (
                  <div className="h-6 w-full flex items-center justify-between px-2 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-[10px] text-slate-500 dark:text-zinc-400 select-none cursor-move rounded-t-lg">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {card.type === 'code' ? (
                        <>
                          <Terminal size={10} />
                          <span>Code snippet ({card.language || 'text'})</span>
                        </>
                      ) : (
                        <>
                          <FileText size={10} />
                          <span>Markdown card</span>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTextCard(card.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}

                {/* Card Main Content Area */}
                <div className={`flex-1 overflow-auto ${card.type !== 'sticky' ? 'p-3' : ''}`}>
                  {isEditing ? (
                    <textarea
                      autoFocus
                      defaultValue={card.content}
                      onBlur={(e) => {
                        updateTextCard(card.id, { content: e.target.value });
                        setEditingCardId(null);
                      }}
                      onKeyDown={(e) => {
                        // Cmd + Enter finishes editing
                        if (e.metaKey && e.key === 'Enter') {
                          updateTextCard(card.id, { content: e.currentTarget.value });
                          setEditingCardId(null);
                        }
                        e.stopPropagation();
                      }}
                      className="w-full h-full bg-transparent resize-none border-none text-inherit focus:ring-0 p-0"
                    />
                  ) : (
                    <div className="w-full h-full break-words prose prose-sm dark:prose-invert">
                      {card.type === 'code' ? (
                        <pre className="font-mono text-xs bg-slate-50 dark:bg-zinc-950 p-2 rounded border border-slate-200 dark:border-zinc-800 overflow-x-auto text-blue-600 dark:text-blue-400">
                          <code>{card.content}</code>
                        </pre>
                      ) : (
                        // Standard Markdown parser simulation
                        card.content.split('\n').map((line, lIdx) => {
                          if (line.startsWith('# ')) return <h1 key={lIdx} className="text-lg font-bold my-1">{line.slice(2)}</h1>;
                          if (line.startsWith('## ')) return <h2 key={lIdx} className="text-base font-semibold my-1">{line.slice(3)}</h2>;
                          if (line.startsWith('- ')) return <li key={lIdx} className="list-disc ml-4 text-xs my-0.5">{line.slice(2)}</li>;
                          return <p key={lIdx} className="text-xs my-0.5 leading-relaxed">{line}</p>;
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Sticky Note actions (Color Picker & Trash) */}
                {card.type === 'sticky' && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center justify-between mt-2 pt-2 border-t border-slate-900/10 text-slate-800 select-none">
                    <div className="flex gap-1">
                      {STICKY_COLORS.map((col) => (
                        <button
                          key={col.value}
                          style={{ backgroundColor: col.value }}
                          className={`w-3.5 h-3.5 rounded-full border border-slate-900/20 ${
                            card.color === col.value ? 'ring-1 ring-slate-800' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTextCard(card.id, { color: col.value });
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTextCard(card.id);
                      }}
                      className="hover:text-red-600 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}

                {/* Corner Resizing Handles */}
                {isSelected && activeTool === 'select' && (
                  <div
                    onMouseDown={(e) => handleCardResizeStart(e, card)}
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center pointer-events-auto"
                  >
                    <Maximize2 size={10} className="text-blue-500 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Layers Panel */}
      {showLayersPanel && activeNote && (
        <div className="absolute right-4 top-20 w-64 glass rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-4 z-40 select-none animate-scale-in">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-zinc-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Layers size={13} className="text-blue-500" /> Layer Manager
            </span>
            <button 
              onClick={() => setShowLayersPanel(false)}
              className="text-[10px] hover:text-slate-950 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* List of Layers */}
          <div className="space-y-1 max-h-48 overflow-y-auto mb-3 pr-1">
            {activeNote.layers.map((l) => (
              <div 
                key={l.id} 
                onClick={() => setActiveLayerId(l.id)}
                className={`flex items-center justify-between p-1.5 rounded-md text-xs cursor-pointer ${
                  activeLayerId === l.id 
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20' 
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border border-transparent'
                }`}
              >
                <span className="truncate pr-2">{l.name}</span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => toggleLayerVisibility(l.id)}
                    className="hover:text-slate-900 dark:hover:text-white"
                  >
                    {l.visible ? <Eye size={12} /> : <EyeOff size={12} className="opacity-50" />}
                  </button>
                  <button 
                    onClick={() => toggleLayerLock(l.id)}
                    className="hover:text-slate-900 dark:hover:text-white"
                  >
                    {l.locked ? <Lock size={12} className="text-amber-500" /> : <Unlock size={12} className="opacity-50" />}
                  </button>
                  {activeNote.layers.length > 1 && (
                    <button 
                      onClick={() => deleteLayer(l.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Layer Input */}
          <form onSubmit={handleAddLayer} className="flex gap-1">
            <input
              type="text"
              placeholder="Add Layer..."
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              className="flex-1 text-[11px] bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-2 py-1 text-slate-800 dark:text-white"
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded p-1"
            >
              <Plus size={12} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Canvas Action Bar (Undo, Redo, Zoom, Layers, Export) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-30 select-none">
        <div className="flex items-center bg-white dark:bg-[#12131a]/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-zinc-800 p-1 shadow-lg">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 disabled:opacity-30"
            title="Redo"
          >
            <Redo2 size={14} />
          </button>
        </div>

        <div className="flex items-center bg-white dark:bg-[#12131a]/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-zinc-800 p-1 shadow-lg text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <button
            onClick={() => setZoom(zoom - 0.1)}
            className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-l-lg"
          >
            -
          </button>
          <span className="px-2 text-[10px] w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(zoom + 0.1)}
            className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-r-lg"
          >
            +
          </button>
        </div>

        <button
          onClick={() => setShowLayersPanel(!showLayersPanel)}
          className={`p-2 rounded-xl border shadow-lg flex items-center justify-center transition-colors ${
            showLayersPanel 
              ? 'bg-blue-500 border-blue-600 text-white' 
              : 'bg-white dark:bg-[#12131a]/90 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
          title="Layers"
        >
          <Layers size={14} />
        </button>

        <button
          onClick={exportCanvasAsJSON}
          className="p-2 bg-white dark:bg-[#12131a]/90 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 rounded-xl shadow-lg hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center"
          title="Export Workspace JSON"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Floating Canvas Tool Options Bar (Thickness, Color) */}
      {(activeTool === 'pencil' || activeTool === 'highlighter' || activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle' || activeTool === 'triangle' || activeTool === 'arrow') && (
        <div className="absolute left-4 top-4 flex items-center gap-3 bg-white dark:bg-[#12131a]/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-2 shadow-lg z-30 select-none animate-slide-down">
          {/* Colors */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-zinc-800 pr-3">
            {['#8b5cf6', '#14b8a6', '#ec4899', '#f59e0b', '#ef4444', '#3b82f6', theme === 'dark' ? '#ffffff' : '#0f172a'].map((c) => (
              <button
                key={c}
                style={{ backgroundColor: c }}
                onClick={() => setCurrentColor(c)}
                className={`w-4 h-4 rounded-full border border-slate-200 dark:border-zinc-700 transition-transform ${
                  currentColor === c ? 'scale-125 ring-1 ring-blue-500' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
          
          {/* Stroke Thickness */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 select-none">Thickness</span>
            <input
              type="range"
              min="1"
              max="20"
              value={currentStrokeWidth}
              onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))}
              className="w-16 h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-zinc-400 w-4 select-none">
              {currentStrokeWidth}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Main Floating Toolbar (Selection, Drawing tools, Eraser, Spawners) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 dark:bg-[#12131a]/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-zinc-800/95 px-3 py-2 shadow-mac-shadow z-30 select-none">
        
        {/* Pointer Select */}
        <button
          onClick={() => setActiveTool('select')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'select' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Selection Mode (Tab)"
        >
          <MousePointer size={15} />
        </button>

        {/* Lasso selection */}
        <button
          onClick={() => setActiveTool('lasso')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'lasso' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Lasso select path"
        >
          <Grid size={15} className="rotate-45" />
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* Freehand Pencil */}
        <button
          onClick={() => setActiveTool('pencil')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'pencil' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Pressure-sensitive Pencil"
        >
          <Edit3 size={15} />
        </button>

        {/* Highlighter */}
        <button
          onClick={() => setActiveTool('highlighter')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'highlighter' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Highlighter"
        >
          <Highlighter size={15} />
        </button>

        {/* Snap shapes */}
        <button
          onClick={() => setActiveTool('circle')} // Circle as representative for Snapping
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            ['circle', 'rect', 'line', 'triangle', 'arrow'].includes(activeTool)
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Snap-to-Shape Draw Tool"
        >
          <Sparkles size={15} />
        </button>

        {/* Eraser */}
        <button
          onClick={() => setActiveTool('eraser')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'eraser' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Path Eraser"
        >
          <Eraser size={15} />
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* Add text overlay cards */}
        <button
          onClick={() => setActiveTool('text')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'text' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Add Text Card (double-click canvas)"
        >
          <FileText size={15} />
        </button>

        <button
          onClick={() => setActiveTool('sticky')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'sticky' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Add Sticky Note"
        >
          <Plus size={15} />
        </button>

        <button
          onClick={() => setActiveTool('code')}
          className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
            activeTool === 'code' 
              ? 'bg-blue-500 text-white font-semibold' 
              : 'hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-500 dark:text-zinc-400'
          }`}
          title="Add Code Snippet Widget"
        >
          <Terminal size={15} />
        </button>

      </div>
    </div>
  );
};
