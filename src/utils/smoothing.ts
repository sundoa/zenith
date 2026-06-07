// Stroke smoothing and interpolation calculations

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

/**
 * Applies a simple low-pass filter (Exponential Moving Average) to smooth raw inputs.
 * Useful for filtering pointer jitter.
 */
export function smoothPoints(points: [number, number, number][], smoothingFactor = 0.85): [number, number, number][] {
  if (points.length < 2) return points;
  
  const smoothed: [number, number, number][] = [points[0]];
  let prevX = points[0][0];
  let prevY = points[0][1];
  let prevP = points[0][2];
  
  for (let i = 1; i < points.length; i++) {
    const [rawX, rawY, rawP] = points[i];
    
    // Exponential Moving Average
    const x = prevX + (rawX - prevX) * (1 - smoothingFactor);
    const y = prevY + (rawY - prevY) * (1 - smoothingFactor);
    const p = prevP + (rawP - prevP) * (1 - smoothingFactor);
    
    smoothed.push([x, y, p]);
    prevX = x;
    prevY = y;
    prevP = p;
  }
  
  return smoothed;
}

/**
 * Draws a smoothed stroke onto a 2D canvas context using Quadratic Curves.
 * Automatically translates pressure values to variable stroke widths.
 */
export function drawSmoothedStroke(
  ctx: CanvasRenderingContext2D,
  points: [number, number, number][],
  baseWidth: number,
  isHighlighter = false
) {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0], points[0][1], baseWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Set line properties
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i][0] + points[i + 1][0]) / 2;
    const yc = (points[i][1] + points[i + 1][1]) / 2;
    
    // Vary line width based on pressure if available (points[i][2])
    const pressure = points[i][2];
    let strokeWidth = baseWidth;
    
    if (pressure > 0 && !isHighlighter) {
      // Scale stroke width: pressure ranges from 0.1 to 1.0 generally
      // Ensure we don't go to 0 width by adding a minimum scale of 0.3
      strokeWidth = baseWidth * (0.3 + pressure * 0.9);
    }
    
    ctx.lineWidth = strokeWidth;
    ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xc, yc);
  }

  // Connect last point
  const lastIndex = points.length - 1;
  ctx.lineWidth = baseWidth * (0.3 + (points[lastIndex][2] || 0.5) * 0.9);
  ctx.lineTo(points[lastIndex][0], points[lastIndex][1]);
  ctx.stroke();
}
