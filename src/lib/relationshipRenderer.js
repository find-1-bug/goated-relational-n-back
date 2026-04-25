import { drawShape } from './shapeRenderer';
import { SHAPES, COLORS, pickRandom, pickRandomExcluding, randomBetween } from './gameConstants';

// Generates random visual props, ensuring they differ from previous turn
function randomVisuals(prevVisuals) {
  let shapeA, shapeB, colorA, colorB;
  
  // Keep regenerating until we get something different from prev
  do {
    shapeA = pickRandom(SHAPES);
    shapeB = pickRandom(SHAPES);
    colorA = pickRandom(COLORS);
    colorB = pickRandomExcluding(COLORS, colorA);
  } while (
    prevVisuals &&
    shapeA === prevVisuals.shapeA &&
    shapeB === prevVisuals.shapeB &&
    colorA === prevVisuals.colorA &&
    colorB === prevVisuals.colorB
  );

  return { shapeA, shapeB, colorA, colorB };
}

// Main render function — draws the relationship onto the canvas
export function renderRelationship(ctx, canvasW, canvasH, relationship, prevVisuals) {
  const visuals = randomVisuals(prevVisuals);
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  ctx.clearRect(0, 0, canvasW, canvasH);

  switch (relationship) {
    case 'INSIDE':
      renderInside(ctx, cx, cy, visuals);
      break;
    case 'OVERLAPPING':
      renderOverlapping(ctx, cx, cy, visuals);
      break;
    case 'TOUCHING':
      renderTouching(ctx, cx, cy, visuals);
      break;
    case 'SIZE_MISMATCH':
      renderSizeMismatch(ctx, cx, cy, visuals);
      break;
    case 'HOLLOW_VS_SOLID':
      renderHollowVsSolid(ctx, cx, cy, visuals);
      break;
    case 'ONE_SHARED_TRAIT':
      renderOneSharedTrait(ctx, cx, cy, visuals);
      break;
    case 'ONE_TO_MANY':
      renderOneToMany(ctx, cx, cy, canvasW, canvasH, visuals);
      break;
    case 'ABOVE_BELOW':
      renderAboveBelow(ctx, cx, cy, visuals);
      break;
    case 'DIAGONAL':
      renderDiagonal(ctx, cx, cy, visuals);
      break;
    case 'ROTATED':
      renderRotated(ctx, cx, cy, visuals);
      break;
    case 'EQUAL_COUNT':
      renderEqualCount(ctx, cx, cy, visuals);
      break;
    case 'TWO_TO_ONE':
      renderTwoToOne(ctx, cx, cy, visuals);
      break;
    case 'PYRAMID':
      renderPyramid(ctx, cx, cy, visuals);
      break;
    case 'CONNECTED':
      renderConnected(ctx, cx, cy, visuals);
      break;
    case 'SURROUNDED':
      renderSurrounded(ctx, cx, cy, visuals);
      break;
    case 'BETWEEN':
      renderBetween(ctx, cx, cy, visuals);
      break;
  }

  return visuals;
}

function renderInside(ctx, cx, cy, v) {
  const outerSize = randomBetween(120, 160);
  const innerSize = randomBetween(30, outerSize * 0.4);
  // Draw outer first (behind), then inner
  drawShape(ctx, v.shapeB, cx, cy, outerSize, v.colorB, true);
  drawShape(ctx, v.shapeA, cx + randomBetween(-10, 10), cy + randomBetween(-10, 10), innerSize, v.colorA, true);
}

function renderOverlapping(ctx, cx, cy, v) {
  const sizeA = randomBetween(70, 110);
  const sizeB = randomBetween(70, 110);
  // Offset so they overlap but neither is fully inside
  const offset = Math.min(sizeA, sizeB) * 0.4;
  ctx.globalAlpha = 0.85;
  drawShape(ctx, v.shapeA, cx - offset, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + offset, cy, sizeB, v.colorB, true);
  ctx.globalAlpha = 1;
}

function renderTouching(ctx, cx, cy, v) {
  const sizeA = randomBetween(60, 90);
  const sizeB = randomBetween(60, 90);
  // Place them so edges are flush
  const gap = (sizeA + sizeB) / 2;
  drawShape(ctx, v.shapeA, cx - gap / 2, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + gap / 2, cy, sizeB, v.colorB, true);
}

function renderSizeMismatch(ctx, cx, cy, v) {
  const bigSize = randomBetween(130, 170);
  const smallSize = bigSize / randomBetween(3, 4.5);
  // Place side by side with some space
  drawShape(ctx, v.shapeA, cx - 60, cy, bigSize, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 80, cy, smallSize, v.colorB, true);
}

function renderHollowVsSolid(ctx, cx, cy, v) {
  const sizeA = randomBetween(70, 110);
  const sizeB = randomBetween(70, 110);
  // A is solid, B is hollow
  drawShape(ctx, v.shapeA, cx - 70, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 70, cy, sizeB, v.colorB, false);
}

function renderOneSharedTrait(ctx, cx, cy, v) {
  // Decide which trait to share: color or shape
  const shareColor = Math.random() < 0.5;
  
  let shapeA, shapeB, colorA, colorB;
  
  if (shareColor) {
    // Same color, different shapes
    colorA = v.colorA;
    colorB = v.colorA; // share the color
    shapeA = v.shapeA;
    shapeB = pickRandomExcluding(SHAPES, shapeA);
  } else {
    // Same shape, different colors
    shapeA = v.shapeA;
    shapeB = v.shapeA; // share the shape
    colorA = v.colorA;
    colorB = pickRandomExcluding(COLORS, colorA);
  }

  const sizeA = randomBetween(60, 100);
  const sizeB = randomBetween(60, 100);
  
  drawShape(ctx, shapeA, cx - 75, cy, sizeA, colorA, true);
  drawShape(ctx, shapeB, cx + 75, cy, sizeB, colorB, true);
}

function renderOneToMany(ctx, cx, cy, canvasW, canvasH, v) {
  // One of shape A, three of shape B
  const sizeA = randomBetween(60, 90);
  const sizeB = randomBetween(40, 65);
  
  // Draw A on left side
  drawShape(ctx, v.shapeA, cx - 100, cy, sizeA, v.colorA, true);
  
  // Draw 3x B on right side, arranged in a triangle pattern
  const positions = [
    { x: cx + 70, y: cy - 55 },
    { x: cx + 130, y: cy - 55 },
    { x: cx + 100, y: cy + 30 },
  ];
  
  for (const pos of positions) {
    drawShape(ctx, v.shapeB, pos.x, pos.y, sizeB, v.colorB, true);
  }
}

// ── NEW RELATIONSHIPS ─────────────────────────────────────────────────────────

function renderAboveBelow(ctx, cx, cy, v) {
  // A is strictly above B — no horizontal offset
  const sizeA = randomBetween(55, 85);
  const sizeB = randomBetween(55, 85);
  const gap = (sizeA + sizeB) / 2 + 20;
  drawShape(ctx, v.shapeA, cx, cy - gap / 2, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx, cy + gap / 2, sizeB, v.colorB, true);
}

function renderDiagonal(ctx, cx, cy, v) {
  // Both horizontally AND vertically offset
  const sizeA = randomBetween(55, 85);
  const sizeB = randomBetween(55, 85);
  const dx = randomBetween(60, 90) * (Math.random() < 0.5 ? -1 : 1);
  const dy = randomBetween(40, 70) * (dx > 0 ? -1 : 1);
  drawShape(ctx, v.shapeA, cx + dx, cy + dy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx - dx, cy - dy, sizeB, v.colorB, true);
}

function renderRotated(ctx, cx, cy, v) {
  // Same shape: one upright, one rotated 45°
  const shape = v.shapeA;
  const size = randomBetween(65, 95);
  
  // Draw normal on left
  drawShape(ctx, shape, cx - 75, cy, size, v.colorA, true);
  
  // Draw rotated 45° on right
  ctx.save();
  ctx.translate(cx + 75, cy);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-(cx + 75), -cy);
  drawShape(ctx, shape, cx + 75, cy, size, v.colorB, true);
  ctx.restore();
}

function renderEqualCount(ctx, cx, cy, v) {
  // 2 of A on left, 2 of B on right
  const sizeA = randomBetween(45, 65);
  const sizeB = randomBetween(45, 65);
  drawShape(ctx, v.shapeA, cx - 90, cy - 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeA, cx - 90, cy + 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 90, cy - 38, sizeB, v.colorB, true);
  drawShape(ctx, v.shapeB, cx + 90, cy + 38, sizeB, v.colorB, true);
}

function renderTwoToOne(ctx, cx, cy, v) {
  // 2 of A on left, 1 of B on right
  const sizeA = randomBetween(50, 70);
  const sizeB = randomBetween(60, 90);
  drawShape(ctx, v.shapeA, cx - 90, cy - 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeA, cx - 90, cy + 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 70, cy, sizeB, v.colorB, true);
}

function renderPyramid(ctx, cx, cy, v) {
  // 1 of shapeA on top, 2 of shapeB below in a row
  const sizeA = randomBetween(50, 70);
  const sizeB = randomBetween(45, 65);
  const vertGap = (sizeA + sizeB) / 2 + 15;
  drawShape(ctx, v.shapeA, cx, cy - vertGap / 2, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx - sizeB - 10, cy + vertGap / 2, sizeB, v.colorB, true);
  drawShape(ctx, v.shapeB, cx + sizeB + 10, cy + vertGap / 2, sizeB, v.colorB, true);
}

function renderConnected(ctx, cx, cy, v) {
  // A line bridges the two shapes
  const sizeA = randomBetween(55, 80);
  const sizeB = randomBetween(55, 80);
  const leftX = cx - 90;
  const rightX = cx + 90;
  
  drawShape(ctx, v.shapeA, leftX, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, rightX, cy, sizeB, v.colorB, true);
  
  // Draw connecting line between the two shapes
  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(leftX + sizeA / 2, cy);
  ctx.lineTo(rightX - sizeB / 2, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function renderSurrounded(ctx, cx, cy, v) {
  // Shape A in center, 4 copies of shape B around it
  const sizeA = randomBetween(50, 70);
  const sizeB = randomBetween(35, 50);
  const radius = sizeA / 2 + sizeB / 2 + 20;
  
  drawShape(ctx, v.shapeA, cx, cy, sizeA, v.colorA, true);
  
  const offsets = [
    { x: 0,      y: -radius },
    { x: radius, y: 0       },
    { x: 0,      y: radius  },
    { x: -radius, y: 0      },
  ];
  for (const o of offsets) {
    drawShape(ctx, v.shapeB, cx + o.x, cy + o.y, sizeB, v.colorB, true);
  }
}

function renderBetween(ctx, cx, cy, v) {
  // Shape A on far left, shape B on far right, shape C (third color/shape) between them
  const sizeOuter = randomBetween(55, 75);
  const sizeMiddle = randomBetween(45, 65);

  // Pick a distinct third color and shape for the middle element
  const colorC = pickRandomExcluding(COLORS, v.colorA) === v.colorB
    ? COLORS.find(c => c !== v.colorA && c !== v.colorB) || v.colorA
    : pickRandomExcluding(COLORS, v.colorA);
  const shapeC = pickRandomExcluding(SHAPES, v.shapeA);

  drawShape(ctx, v.shapeA, cx - 110, cy, sizeOuter, v.colorA, true);
  drawShape(ctx, shapeC,   cx,       cy, sizeMiddle, colorC,  true);
  drawShape(ctx, v.shapeB, cx + 110, cy, sizeOuter, v.colorB, true);
}