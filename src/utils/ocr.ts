import type { Note } from '../store/useStore';

export interface SearchResult {
  id: string;
  noteId: string;
  noteTitle: string;
  type: 'title' | 'content' | 'tag' | 'sticky' | 'code' | 'handwriting';
  text: string;
  preview: string;
  targetCoords?: { x: number; y: number } | null;
  score: number; // For sorting ranked results
}

/**
 * Perform custom fuzzy search across the workspace document graph.
 */
export function searchWorkspace(notes: Note[], query: string): SearchResult[] {
  if (!query || query.trim() === '') return [];
  
  const results: SearchResult[] = [];
  const normalizedQuery = query.toLowerCase().trim();

  notes.forEach((note) => {
    // 1. Check Note Title
    const titleLower = note.title.toLowerCase();
    if (titleLower.includes(normalizedQuery)) {
      const idx = titleLower.indexOf(normalizedQuery);
      results.push({
        id: `${note.id}-title`,
        noteId: note.id,
        noteTitle: note.title,
        type: 'title',
        text: note.title,
        preview: `Document Title: ${note.title}`,
        score: idx === 0 ? 100 : 80, // higher score if it starts with query
        targetCoords: null
      });
    }

    // 2. Check Tags
    note.tags.forEach(tag => {
      if (tag.toLowerCase().includes(normalizedQuery)) {
        results.push({
          id: `${note.id}-tag-${tag}`,
          noteId: note.id,
          noteTitle: note.title,
          type: 'tag',
          text: tag,
          preview: `#${tag} (Note tag)`,
          score: 90,
          targetCoords: null
        });
      }
    });

    // 3. Check Note Content (Markdown Editor text)
    const contentLower = note.content.toLowerCase();
    if (contentLower.includes(normalizedQuery)) {
      const idx = contentLower.indexOf(normalizedQuery);
      // Grab snippet of context (40 chars before and after)
      const start = Math.max(0, idx - 20);
      const end = Math.min(note.content.length, idx + normalizedQuery.length + 30);
      const snippet = note.content.substring(start, end).replace(/\n/g, ' ');
      
      results.push({
        id: `${note.id}-content-${idx}`,
        noteId: note.id,
        noteTitle: note.title,
        type: 'content',
        text: normalizedQuery,
        preview: `...${snippet}...`,
        score: 60,
        targetCoords: null
      });
    }

    // 4. Check Text Cards (Markdown text cards and Sticky notes)
    note.textCards.forEach((card) => {
      const cardLower = card.content.toLowerCase();
      if (cardLower.includes(normalizedQuery)) {
        const idx = cardLower.indexOf(normalizedQuery);
        const snippet = card.content.substring(Math.max(0, idx - 15), Math.min(card.content.length, idx + 25)).replace(/\n/g, ' ');
        results.push({
          id: card.id,
          noteId: note.id,
          noteTitle: note.title,
          type: card.type === 'sticky' ? 'sticky' : 'content',
          text: card.content,
          preview: `${card.type === 'sticky' ? 'Sticky Note' : 'Text Card'}: ...${snippet}...`,
          score: 70,
          targetCoords: { x: card.x, y: card.y } // Targets coordinates on canvas!
        });
      }
    });

    // 5. Check Handwritten Sketches / Drawing OCR Indexing
    note.canvasObjects.forEach((obj) => {
      if (obj.recognizedText) {
        const ocrLower = obj.recognizedText.toLowerCase();
        if (ocrLower.includes(normalizedQuery)) {
          // Calculate center of drawn coordinates as target
          let sumX = 0, sumY = 0;
          obj.points.forEach(p => {
            sumX += p[0];
            sumY += p[1];
          });
          const targetCoords = obj.points.length > 0 
            ? { x: sumX / obj.points.length, y: sumY / obj.points.length }
            : null;

          results.push({
            id: obj.id,
            noteId: note.id,
            noteTitle: note.title,
            type: 'handwriting',
            text: obj.recognizedText,
            preview: `Handwritten Drawing OCR: "${obj.recognizedText}"`,
            score: 75,
            targetCoords
          });
        }
      }
    });
  });

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
