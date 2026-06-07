// Heuristics-based Geometric Shape Snapping Recognition

export type SnappedShapeType = 'line' | 'rect' | 'circle' | 'triangle' | 'arrow' | null;

export interface SnappedShape {
  type: SnappedShapeType;
  // Generated points for the snapped clean shape
  points: [number, number, number][];
}

// Distance helper
function distance(p1: [number, number, number], p2: [number, number, number]): number {
  return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
}

// Path length helper
function getPathLength(points: [number, number, number][]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += distance(points[i], points[i + 1]);
  }
  return len;
}

/**
 * Main entry point: analyzes a sequence of drawn freehand points and determines
 * if it matches a geometric primitive. If it does, returns the clean coordinates.
 */
export function recognizeAndSnapShape(points: [number, number, number][]): SnappedShape {
  if (points.length < 5) {
    return { type: null, points };
  }

  const start = points[0];
  const end = points[points.length - 1];
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  
  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  const diagonal = Math.hypot(boxWidth, boxHeight);
  const centerX = minX + boxWidth / 2;
  const centerY = minY + boxHeight / 2;
  
  const startEndDist = distance(start, end);
  const pathLength = getPathLength(points);
  
  // 1. Line Check: If path is straight, length is close to start-to-end distance
  if (pathLength / startEndDist < 1.15) {
    // Check if it's an arrow: does it have a "hook" at the end?
    // We analyze the last 15% of the stroke to see if it turns back sharply
    const isArrow = detectArrowHead(points);
    if (isArrow) {
      return {
        type: 'arrow',
        points: [start, end]
      };
    }
    
    return {
      type: 'line',
      points: [start, end]
    };
  }

  // 2. Circle Check: Start and end are close, and points are equidistant to center
  const isClosed = startEndDist < diagonal * 0.25;
  if (isClosed) {
    const radius = (boxWidth + boxHeight) / 4;
    let distanceVariance = 0;
    
    for (const p of points) {
      const distToCenter = Math.hypot(p[0] - centerX, p[1] - centerY);
      distanceVariance += Math.abs(distToCenter - radius);
    }
    
    const avgVariance = distanceVariance / points.length;
    
    // Circle detected if average variance from perfect circle radius is small
    if (avgVariance / radius < 0.15) {
      // Re-create points for a perfect circle
      const circlePoints: [number, number, number][] = [];
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        circlePoints.push([
          centerX + radius * Math.cos(theta),
          centerY + radius * Math.sin(theta),
          0.5
        ]);
      }
      return { type: 'circle', points: circlePoints };
    }
  }

  // 3. Triangle or Rectangle Check
  // We can count corners using simplified RDP (Ramer-Douglas-Peucker) algorithm or similar path simplification.
  const simplified = simplifyPath(points, diagonal * 0.08);
  
  if (simplified.length === 3 || (simplified.length === 4 && isClosed)) {
    // Snapped Triangle
    // Ensure it's closed nicely
    const vertices: [number, number, number][] = [simplified[0], simplified[1], simplified[2], simplified[0]];
    return { type: 'triangle', points: vertices };
  }
  
  if (simplified.length === 4 || (simplified.length === 5 && isClosed)) {
    // Snapped Rectangle
    // We snap it to the clean bounding box edges
    const rectPoints: [number, number, number][] = [
      [minX, minY, 0.5],
      [maxX, minY, 0.5],
      [maxX, maxY, 0.5],
      [minX, maxY, 0.5],
      [minX, minY, 0.5],
    ];
    return { type: 'rect', points: rectPoints };
  }

  // Fallback: Default to drawing as-is if no shape is recognized
  return { type: null, points };
}

/**
 * Simplifies a point path using Ramer-Douglas-Peucker algorithm to identify sharp turns.
 */
function simplifyPath(points: [number, number, number][], epsilon: number): [number, number, number][] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const results1 = simplifyPath(points.slice(0, index + 1), epsilon);
    const results2 = simplifyPath(points.slice(index), epsilon);
    return results1.slice(0, results1.length - 1).concat(results2);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(
  p: [number, number, number],
  lineStart: [number, number, number],
  lineEnd: [number, number, number]
): number {
  const [x, y] = p;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const numerator = Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1));
  const denominator = Math.hypot(x2 - x1, y2 - y1);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Checks if the user drew an arrow head at the end of a line.
 */
function detectArrowHead(points: [number, number, number][]): boolean {
  if (points.length < 10) return false;
  
  const end = points[points.length - 1];
  const start = points[0];
  
  // Calculate general direction of the line
  const lineAngle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  
  // Check the last few points: do they turn backwards sharp?
  // We check the angle from mid to end vs end to last points
  let hasHook = false;
  for (let i = points.length - 4; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segmentAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    
    // Difference between segment and general direction
    let diff = Math.abs(segmentAngle - lineAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    
    if (diff > Math.PI * 0.6) {
      // The path returned backwards, indicating an arrowhead stroke
      hasHook = true;
      break;
    }
  }
  
  return hasHook;
}
