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