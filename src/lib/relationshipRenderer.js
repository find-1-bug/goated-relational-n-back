import { drawShape } from './shapeRenderer';
import { SHAPES, COLORS, pickRandom, pickRandomExcluding, randomBetween, isVerbal, getVerbalPair, buildVerbalDisplay, pickTokenType, pickTokenWord } from './gameConstants';

// Visuals are now always taken from the stimulus entry (pre-generated in gameEngine).
// This ensures target replays look identical to the original stimulus.
function getVisuals(stimulus) {
  return {
    shapeA: stimulus?.shapeA || pickRandom(SHAPES),
    shapeB: stimulus?.shapeB || pickRandom(SHAPES),
    colorA: stimulus?.colorA || pickRandom(COLORS),
    colorB: stimulus?.colorB || pickRandomExcluding(COLORS, stimulus?.colorA || '#000'),
  };
}

// ── Verbal renderer ───────────────────────────────────────────────────────────

function drawVerbalPill(ctx, cx, cy, canvasW, canvasH) {
  const pillW = canvasW * 0.88;
  const pillH = canvasH * 0.64;
  ctx.save();
  ctx.fillStyle = 'hsla(220,18%,13%,0.75)';
  ctx.beginPath();
  ctx.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 20);
  ctx.fill();
  ctx.strokeStyle = 'hsla(168,80%,50%,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  return pillH;
}

// ── Full-canvas Voronoi renderer ──────────────────────────────────────────────
// Renders a proper Voronoi diagram filling the entire canvas (like the reference images).
// Uses a clipping-region approach: for each cell, clip to a polygon formed by the
// perpendicular bisectors with all other cells, then fill. Fast and accurate.
export function renderVoronoiCanvas(ctx, canvasW, canvasH, seed) {
  const N = 4 + (seed % 4); // 4–7 cells
  // Seeded RNG
  let h = seed | 1;
  const rng = () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0xffffffff;
  };

  const PALETTES = [
    ['#1DB88A', '#151D2E', '#0F3460'],
    ['#F4A261', '#264653', '#2EC4B6', '#E9C46A'],
    ['#A8DADC', '#457B9D', '#1D3557'],
    ['#95D5B2', '#B5838D', '#E5989B', '#6D6875'],
    ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    ['#A29BFE', '#6C5CE7', '#FD79A8'],
    ['#74B9FF', '#0984E3', '#2D3436'],
    ['#81ECEC', '#6C5CE7', '#FDCB6E', '#E17055'],
  ];
  const palette = PALETTES[seed % PALETTES.length];

  // Cell centers — well-spread using a jittered grid
  const cols = Math.ceil(Math.sqrt(N));
  const rows = Math.ceil(N / cols);
  const pts = [];
  for (let r = 0; r < rows && pts.length < N; r++) {
    for (let c = 0; c < cols && pts.length < N; c++) {
      const jx = (rng() - 0.5) * 0.5;
      const jy = (rng() - 0.5) * 0.5;
      pts.push({
        x: canvasW * ((c + 0.5 + jx) / cols),
        y: canvasH * ((r + 0.5 + jy) / rows),
        color: palette[pts.length % palette.length],
      });
    }
  }

  // For each cell, compute its Voronoi region via half-plane intersection
  // Start with full canvas rectangle, then clip by each bisector
  for (let i = 0; i < pts.length; i++) {
    // Polygon = canvas corners
    let poly = [
      { x: 0, y: 0 }, { x: canvasW, y: 0 },
      { x: canvasW, y: canvasH }, { x: 0, y: canvasH },
    ];

    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      // Half-plane: points closer to pts[i] than pts[j]
      // Bisector midpoint and normal
      const mx = (pts[i].x + pts[j].x) / 2;
      const my = (pts[i].y + pts[j].y) / 2;
      const nx = pts[j].x - pts[i].x; // normal points toward pts[j]
      const ny = pts[j].y - pts[i].y;
      // Keep side where dot(p - mid, n) <= 0 (i.e., closer to pts[i])
      poly = clipPolygonByHalfPlane(poly, mx, my, -nx, -ny);
      if (poly.length === 0) break;
    }

    if (poly.length < 3) continue;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k].x, poly[k].y);
    ctx.closePath();
    ctx.fillStyle = pts[i].color;
    ctx.fill();
    ctx.restore();
  }
}

// Sutherland-Hodgman clip polygon against half-plane defined by point (mx,my) and inward normal (nx,ny)
function clipPolygonByHalfPlane(poly, mx, my, nx, ny) {
  if (poly.length === 0) return [];
  const inside = p => (p.x - mx) * nx + (p.y - my) * ny >= 0;
  const intersect = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const denom = dx * nx + dy * ny;
    if (Math.abs(denom) < 1e-10) return a;
    const t = ((mx - a.x) * nx + (my - a.y) * ny) / denom;
    return { x: a.x + t * dx, y: a.y + t * dy };
  };
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur), prevIn = inside(prev);
    if (curIn) { if (!prevIn) out.push(intersect(prev, cur)); out.push(cur); }
    else if (prevIn) out.push(intersect(prev, cur));
  }
  return out;
}

// ── Small Voronoi token renderer (for verbal stimuli tokens) ──────────────────
function drawVoronoiToken(ctx, seed, cx, cy, size, color) {
  const N = 6;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  const rng = (offset) => { let x = Math.sin(h + offset) * 43758.5453123; return x - Math.floor(x); };
  const pts = [];
  for (let i = 0; i < N; i++) {
    pts.push({ x: cx + (rng(i * 2) - 0.5) * size, y: cy + (rng(i * 2 + 1) - 0.5) * size });
  }
  const ri = parseInt(color.slice(1,3),16), gi = parseInt(color.slice(3,5),16), bi = parseInt(color.slice(5,7),16);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, size/2, 0, Math.PI*2); ctx.clip();
  for (let pi = 0; pi < N; pi++) {
    const alpha = 0.5 + (pi/N)*0.5;
    ctx.fillStyle = `rgba(${ri},${gi},${bi},${alpha.toFixed(2)})`;
    ctx.beginPath(); ctx.arc(pts[pi].x, pts[pi].y, size*0.22, 0, Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle = `rgba(${ri},${gi},${bi},0.5)`; ctx.lineWidth = 0.8;
  for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++) {
    const dx=pts[j].x-pts[i].x, dy=pts[j].y-pts[i].y;
    if (Math.sqrt(dx*dx+dy*dy) < size*0.55) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke(); }
  }
  ctx.fillStyle = `rgba(${ri},${gi},${bi},0.9)`;
  pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,2.2,0,Math.PI*2); ctx.fill(); });
  ctx.restore();
}

// Determine if a token is an emoji/symbol (render larger, no quotes)
function isSymbol(tok) {
  return /\p{Emoji}/u.test(tok) || /^[◈◉◊◌◍◎●○◐◑◒◓▲△▴▵▶▷▸▹►▻▼▽◆◇❋✦✧✩✪✫✬✭✮⬡⬢⬣⬟⬠⬤⭕🔷🔶🔹🔸🔺🔻💠🔘🔳🔲⌬⎔⏣⟁⟐⟡]/.test(tok);
}

// (Voronoi as a full-canvas stimulus is handled at the relationship level, not token level)

// Draw a single token (word, nonsense, emoji, symbol) centered at (x,y)
function drawToken(ctx, token, x, y, canvasW, color) {
  const sym = isSymbol(token);
  const fontSize = sym ? Math.min(canvasW * 0.12, 48) : Math.min(canvasW * 0.082, 34);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = sym
    ? `${fontSize}px serif`
    : `bold ${fontSize}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = color;
  ctx.fillText(token, x, y);
  ctx.restore();
}

// Pick tokens for a verbal stimulus — both sides use the same token type family
// but can vary between meaningful/nonsense/garbage/emoji
function pickVerbalTokens(wordA, wordB) {
  // 40% chance: use semantic pair from pool; 60%: replace with random tokens
  const usePool = Math.random() < 0.40;
  if (usePool) return [wordA, wordB];
  const typeA = pickTokenType();
  const typeB = pickTokenType();
  return [pickTokenWord(typeA), pickTokenWord(typeB)];
}

// Mode 0: pure text/token (tokenA — verb — tokenB), stacked vertically
function renderVerbalText(ctx, cx, cy, canvasW, canvasH, tokenA, verb, tokenB, relationship) {
  const pillH = drawVerbalPill(ctx, cx, cy, canvasW, canvasH);
  drawToken(ctx, tokenA, cx, cy - canvasH * 0.15, canvasW, '#22d3ee');
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(canvasW * 0.052, 20)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = 'hsla(210,20%,65%,0.9)';
  ctx.fillText(verb, cx, cy);
  ctx.restore();
  drawToken(ctx, tokenB, cx, cy + canvasH * 0.15, canvasW, '#a78bfa');
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(canvasW * 0.034, 12)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = 'hsla(210,10%,40%,0.65)';
  ctx.fillText(relationship.replace(/_/g, ' '), cx, cy + pillH / 2 - 14);
  ctx.restore();
}

// Mode 1: shape A — verb text — shape B (shapes replace words entirely)
function renderVerbalShapes(ctx, cx, cy, canvasW, canvasH, verb, relationship) {
  drawVerbalPill(ctx, cx, cy, canvasW, canvasH);
  const shapeA = pickRandom(SHAPES);
  const shapeB = pickRandomExcluding(SHAPES, shapeA);
  const colorA = pickRandom(COLORS);
  const colorB = pickRandomExcluding(COLORS, colorA);
  const shapeSize = Math.min(canvasW, canvasH) * 0.18;
  drawShape(ctx, shapeA, cx - canvasW * 0.28, cy, shapeSize, colorA, true);
  drawShape(ctx, shapeB, cx + canvasW * 0.28, cy, shapeSize, colorB, true);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(canvasW * 0.052, 19)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = 'hsla(210,20%,70%,0.9)';
  ctx.fillText(verb, cx, cy);
  ctx.font = `${Math.min(canvasW * 0.034, 12)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = 'hsla(210,10%,40%,0.65)';
  ctx.fillText(relationship.replace(/_/g, ' '), cx, cy + canvasH * 0.24);
  ctx.restore();
}

// Mode 2: blended — token/shape on each side, verb center (horizontal layout)
function renderVerbalBlended(ctx, cx, cy, canvasW, canvasH, tokenA, verb, tokenB, relationship) {
  drawVerbalPill(ctx, cx, cy, canvasW, canvasH);
  const lx = cx - canvasW * 0.28;
  const rx = cx + canvasW * 0.28;

  // 50%: each side is a shape + token stacked; 50%: each side is just a token (no shape)
  if (Math.random() < 0.5) {
    const shapeA = pickRandom(SHAPES);
    const shapeB = pickRandomExcluding(SHAPES, shapeA);
    const colorA = pickRandom(COLORS);
    const colorB = pickRandomExcluding(COLORS, colorA);
    const shapeSize = Math.min(canvasW, canvasH) * 0.13;
    drawShape(ctx, shapeA, lx, cy - canvasH * 0.1, shapeSize, colorA, true);
    drawToken(ctx, tokenA, lx, cy + canvasH * 0.1, canvasW, '#22d3ee');
    drawShape(ctx, shapeB, rx, cy - canvasH * 0.1, shapeSize, colorB, true);
    drawToken(ctx, tokenB, rx, cy + canvasH * 0.1, canvasW, '#a78bfa');
  } else {
    // token only, larger
    drawToken(ctx, tokenA, lx, cy, canvasW, '#22d3ee');
    drawToken(ctx, tokenB, rx, cy, canvasW, '#a78bfa');
  }

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(canvasW * 0.046, 17)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = 'hsla(210,20%,65%,0.9)';
  ctx.fillText(verb, cx, cy);
  ctx.font = `${Math.min(canvasW * 0.034, 12)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = 'hsla(210,10%,40%,0.65)';
  ctx.fillText(relationship.replace(/_/g, ' '), cx, cy + canvasH * 0.27);
  ctx.restore();
}

// Mode 3: token A left, shape center (as verb stand-in), token B right
function renderVerbalSymbolVerb(ctx, cx, cy, canvasW, canvasH, tokenA, verb, tokenB, relationship) {
  drawVerbalPill(ctx, cx, cy, canvasW, canvasH);
  drawToken(ctx, tokenA, cx - canvasW * 0.28, cy, canvasW, '#22d3ee');
  // Verb as styled badge in center
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const verbSize = Math.min(canvasW * 0.044, 16);
  ctx.font = `${verbSize}px 'JetBrains Mono', monospace`;
  // badge bg
  const tw = ctx.measureText(verb).width + 16;
  ctx.fillStyle = 'hsla(168,80%,50%,0.12)';
  ctx.beginPath(); ctx.roundRect(cx - tw/2, cy - verbSize - 4, tw, verbSize*2 + 8, 8); ctx.fill();
  ctx.strokeStyle = 'hsla(168,80%,50%,0.3)';
  ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'hsl(168,80%,60%)';
  ctx.fillText(verb, cx, cy);
  ctx.restore();
  drawToken(ctx, tokenB, cx + canvasW * 0.28, cy, canvasW, '#a78bfa');
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(canvasW * 0.034, 12)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = 'hsla(210,10%,40%,0.65)';
  ctx.fillText(relationship.replace(/_/g, ' '), cx, cy + canvasH * 0.27);
  ctx.restore();
}

function renderVerbal(ctx, canvasW, canvasH, relationship, fixedWordA, fixedWordB, renderMode) {
  const pair = (fixedWordA && fixedWordB) ? [fixedWordA, fixedWordB] : getVerbalPair(relationship);
  const [wordA, verb, wordB] = buildVerbalDisplay(relationship, pair);
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Use the stored renderMode so target replays look identical to the original.
  const mode = renderMode !== undefined ? renderMode : Math.floor(Math.random() * 3);
  if (mode === 0) renderVerbalText(ctx, cx, cy, canvasW, canvasH, wordA, verb, wordB, relationship);
  else if (mode === 1) renderVerbalBlended(ctx, cx, cy, canvasW, canvasH, wordA, verb, wordB, relationship);
  else renderVerbalSymbolVerb(ctx, cx, cy, canvasW, canvasH, wordA, verb, wordB, relationship);

  return {};
}

// ── Main dispatch ──────────────────────────────────────────────────────────────
// stimulus: {rel, wordA?, wordB?, shapeA, shapeB, colorA, colorB, renderMode} — always provided
export function renderRelationship(ctx, canvasW, canvasH, relationship, prevVisuals, stimulus) {
  if (relationship === 'VORONOI') {
    ctx.clearRect(0, 0, canvasW, canvasH);
    const seed = stimulus?.voronoiSeed ?? Math.floor(Math.random() * 10000);
    renderVoronoiCanvas(ctx, canvasW, canvasH, seed);
    return {};
  }

  if (isVerbal(relationship)) {
    return renderVerbal(ctx, canvasW, canvasH, relationship, stimulus?.wordA, stimulus?.wordB, stimulus?.renderMode);
  }

  const visuals = getVisuals(stimulus);
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  ctx.clearRect(0, 0, canvasW, canvasH);

  switch (relationship) {
    case 'INSIDE':             renderInside(ctx, cx, cy, visuals); break;
    case 'OVERLAPPING':        renderOverlapping(ctx, cx, cy, visuals); break;
    case 'TOUCHING':           renderTouching(ctx, cx, cy, visuals); break;
    case 'SIZE_MISMATCH':      renderSizeMismatch(ctx, cx, cy, visuals); break;
    case 'HOLLOW_VS_SOLID':    renderHollowVsSolid(ctx, cx, cy, visuals); break;
    case 'ONE_SHARED_TRAIT':   renderOneSharedTrait(ctx, cx, cy, visuals); break;
    case 'ONE_TO_MANY':        renderOneToMany(ctx, cx, cy, canvasW, canvasH, visuals); break;
    case 'ABOVE_BELOW':        renderAboveBelow(ctx, cx, cy, visuals); break;
    case 'DIAGONAL':           renderDiagonal(ctx, cx, cy, visuals); break;
    case 'ROTATED':            renderRotated(ctx, cx, cy, visuals); break;
    case 'EQUAL_COUNT':        renderEqualCount(ctx, cx, cy, visuals); break;
    case 'TWO_TO_ONE':         renderTwoToOne(ctx, cx, cy, visuals); break;
    case 'PYRAMID':            renderPyramid(ctx, cx, cy, visuals); break;
    case 'CONNECTED':          renderConnected(ctx, cx, cy, visuals); break;
    case 'SURROUNDED':         renderSurrounded(ctx, cx, cy, visuals); break;
    case 'BETWEEN':            renderBetween(ctx, cx, cy, visuals); break;
    // NEW SPATIAL
    case 'LEFT_RIGHT':         renderLeftRight(ctx, cx, cy, visuals); break;
    case 'STACKED':            renderStacked(ctx, cx, cy, visuals); break;
    case 'NESTED_3':           renderNested3(ctx, cx, cy, visuals); break;
    case 'MIRRORED':           renderMirrored(ctx, cx, cy, visuals); break;
    case 'SCATTERED':          renderScattered(ctx, cx, cy, canvasW, canvasH, visuals); break;
    // NEW TRAIT
    case 'SAME_COLOR':         renderSameColor(ctx, cx, cy, visuals); break;
    case 'SAME_SHAPE':         renderSameShape(ctx, cx, cy, visuals); break;
    case 'OPPOSITE_COLORS':    renderOppositeColors(ctx, cx, cy, visuals); break;
    case 'SIZE_GRADIENT':      renderSizeGradient(ctx, cx, cy, visuals); break;
    case 'BORDER_ONLY':        renderBorderOnly(ctx, cx, cy, visuals); break;
    case 'SHADOW_COPY':        renderShadowCopy(ctx, cx, cy, visuals); break;
    case 'STRIPED':            renderStriped(ctx, cx, cy, visuals); break;
    case 'DASHED_OUTLINE':     renderDashedOutline(ctx, cx, cy, visuals); break;
    // NEW QUANT
    case 'THREE_TO_ONE':       renderThreeToOne(ctx, cx, cy, visuals); break;
    case 'ONE_TO_FIVE':        renderOneToFive(ctx, cx, cy, canvasW, canvasH, visuals); break;
    case 'DECREASING_ROW':     renderDecreasingRow(ctx, cx, cy, visuals); break;
    case 'INCREASING_ROW':     renderIncreasingRow(ctx, cx, cy, visuals); break;
    case 'BALANCED_SCALE':     renderBalancedScale(ctx, cx, cy, visuals); break;
    default: break;
  }

  return visuals;
}

// ─── Original visuals ──────────────────────────────────────────────────────────

function renderInside(ctx, cx, cy, v) {
  const outerSize = randomBetween(120, 160);
  const innerSize = randomBetween(30, outerSize * 0.4);
  drawShape(ctx, v.shapeB, cx, cy, outerSize, v.colorB, true);
  drawShape(ctx, v.shapeA, cx + randomBetween(-10, 10), cy + randomBetween(-10, 10), innerSize, v.colorA, true);
}

function renderOverlapping(ctx, cx, cy, v) {
  const sizeA = randomBetween(70, 110);
  const sizeB = randomBetween(70, 110);
  const offset = Math.min(sizeA, sizeB) * 0.4;
  ctx.globalAlpha = 0.85;
  drawShape(ctx, v.shapeA, cx - offset, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + offset, cy, sizeB, v.colorB, true);
  ctx.globalAlpha = 1;
}

function renderTouching(ctx, cx, cy, v) {
  const sizeA = randomBetween(60, 90);
  const sizeB = randomBetween(60, 90);
  const gap = (sizeA + sizeB) / 2;
  drawShape(ctx, v.shapeA, cx - gap / 2, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + gap / 2, cy, sizeB, v.colorB, true);
}

function renderSizeMismatch(ctx, cx, cy, v) {
  const bigSize = randomBetween(130, 170);
  const smallSize = bigSize / randomBetween(3, 4.5);
  drawShape(ctx, v.shapeA, cx - 60, cy, bigSize, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 80, cy, smallSize, v.colorB, true);
}

function renderHollowVsSolid(ctx, cx, cy, v) {
  const sizeA = randomBetween(70, 110);
  const sizeB = randomBetween(70, 110);
  drawShape(ctx, v.shapeA, cx - 70, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 70, cy, sizeB, v.colorB, false);
}

function renderOneSharedTrait(ctx, cx, cy, v) {
  const shareColor = Math.random() < 0.5;
  let shapeA, shapeB, colorA, colorB;
  if (shareColor) {
    colorA = v.colorA; colorB = v.colorA;
    shapeA = v.shapeA; shapeB = pickRandomExcluding(SHAPES, shapeA);
  } else {
    shapeA = v.shapeA; shapeB = v.shapeA;
    colorA = v.colorA; colorB = pickRandomExcluding(COLORS, colorA);
  }
  drawShape(ctx, shapeA, cx - 75, cy, randomBetween(60, 100), colorA, true);
  drawShape(ctx, shapeB, cx + 75, cy, randomBetween(60, 100), colorB, true);
}

function renderOneToMany(ctx, cx, cy, canvasW, canvasH, v) {
  drawShape(ctx, v.shapeA, cx - 100, cy, randomBetween(60, 90), v.colorA, true);
  const sizeB = randomBetween(40, 65);
  [{ x: cx + 70, y: cy - 55 }, { x: cx + 130, y: cy - 55 }, { x: cx + 100, y: cy + 30 }]
    .forEach(p => drawShape(ctx, v.shapeB, p.x, p.y, sizeB, v.colorB, true));
}

function renderAboveBelow(ctx, cx, cy, v) {
  const sizeA = randomBetween(55, 85);
  const sizeB = randomBetween(55, 85);
  const gap = (sizeA + sizeB) / 2 + 20;
  drawShape(ctx, v.shapeA, cx, cy - gap / 2, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx, cy + gap / 2, sizeB, v.colorB, true);
}

function renderDiagonal(ctx, cx, cy, v) {
  const sizeA = randomBetween(55, 85);
  const sizeB = randomBetween(55, 85);
  const dx = randomBetween(60, 90) * (Math.random() < 0.5 ? -1 : 1);
  const dy = randomBetween(40, 70) * (dx > 0 ? -1 : 1);
  drawShape(ctx, v.shapeA, cx + dx, cy + dy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx - dx, cy - dy, sizeB, v.colorB, true);
}

function renderRotated(ctx, cx, cy, v) {
  const shape = v.shapeA;
  const size = randomBetween(65, 95);
  drawShape(ctx, shape, cx - 75, cy, size, v.colorA, true);
  ctx.save();
  ctx.translate(cx + 75, cy);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-(cx + 75), -cy);
  drawShape(ctx, shape, cx + 75, cy, size, v.colorB, true);
  ctx.restore();
}

function renderEqualCount(ctx, cx, cy, v) {
  const sizeA = randomBetween(45, 65);
  const sizeB = randomBetween(45, 65);
  drawShape(ctx, v.shapeA, cx - 90, cy - 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeA, cx - 90, cy + 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 90, cy - 38, sizeB, v.colorB, true);
  drawShape(ctx, v.shapeB, cx + 90, cy + 38, sizeB, v.colorB, true);
}

function renderTwoToOne(ctx, cx, cy, v) {
  const sizeA = randomBetween(50, 70);
  drawShape(ctx, v.shapeA, cx - 90, cy - 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeA, cx - 90, cy + 38, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 70, cy, randomBetween(60, 90), v.colorB, true);
}

function renderPyramid(ctx, cx, cy, v) {
  const sizeA = randomBetween(50, 70);
  const sizeB = randomBetween(45, 65);
  const vertGap = (sizeA + sizeB) / 2 + 15;
  drawShape(ctx, v.shapeA, cx, cy - vertGap / 2, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx - sizeB - 10, cy + vertGap / 2, sizeB, v.colorB, true);
  drawShape(ctx, v.shapeB, cx + sizeB + 10, cy + vertGap / 2, sizeB, v.colorB, true);
}

function renderConnected(ctx, cx, cy, v) {
  const sizeA = randomBetween(55, 80);
  const sizeB = randomBetween(55, 80);
  const leftX = cx - 90, rightX = cx + 90;
  drawShape(ctx, v.shapeA, leftX, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, rightX, cy, sizeB, v.colorB, true);
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
  const sizeA = randomBetween(50, 70);
  const sizeB = randomBetween(35, 50);
  const radius = sizeA / 2 + sizeB / 2 + 20;
  drawShape(ctx, v.shapeA, cx, cy, sizeA, v.colorA, true);
  [{ x: 0, y: -radius }, { x: radius, y: 0 }, { x: 0, y: radius }, { x: -radius, y: 0 }]
    .forEach(o => drawShape(ctx, v.shapeB, cx + o.x, cy + o.y, sizeB, v.colorB, true));
}

function renderBetween(ctx, cx, cy, v) {
  const sizeOuter = randomBetween(55, 75);
  const sizeMiddle = randomBetween(45, 65);
  const colorC = COLORS.find(c => c !== v.colorA && c !== v.colorB) || v.colorA;
  const shapeC = pickRandomExcluding(SHAPES, v.shapeA);
  drawShape(ctx, v.shapeA, cx - 110, cy, sizeOuter, v.colorA, true);
  drawShape(ctx, shapeC,   cx,       cy, sizeMiddle, colorC,  true);
  drawShape(ctx, v.shapeB, cx + 110, cy, sizeOuter, v.colorB, true);
}

// ─── New Spatial ───────────────────────────────────────────────────────────────

function renderLeftRight(ctx, cx, cy, v) {
  const sizeA = randomBetween(55, 90);
  const sizeB = randomBetween(55, 90);
  drawShape(ctx, v.shapeA, cx - 90, cy, sizeA, v.colorA, true);
  drawShape(ctx, v.shapeB, cx + 90, cy, sizeB, v.colorB, true);
  // label
  ctx.save();
  ctx.fillStyle = 'hsla(210,10%,50%,0.5)';
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('L', cx - 90, cy + sizeA / 2 + 18);
  ctx.fillText('R', cx + 90, cy + sizeB / 2 + 18);
  ctx.restore();
}

function renderStacked(ctx, cx, cy, v) {
  // 3 shapes vertically stacked
  const size = randomBetween(48, 65);
  const gap = size + 12;
  const colorC = COLORS.find(c => c !== v.colorA && c !== v.colorB) || v.colorA;
  const shapeC = pickRandomExcluding(SHAPES, v.shapeA, v.shapeB);
  drawShape(ctx, v.shapeA, cx, cy - gap, size, v.colorA, true);
  drawShape(ctx, shapeC,   cx, cy,       size, colorC,  true);
  drawShape(ctx, v.shapeB, cx, cy + gap, size, v.colorB, true);
}

function renderNested3(ctx, cx, cy, v) {
  // 3 concentric shapes
  const colorC = COLORS.find(c => c !== v.colorA && c !== v.colorB) || '#14B8A6';
  drawShape(ctx, v.shapeB, cx, cy, 160, v.colorB, false);
  drawShape(ctx, v.shapeA, cx, cy, 105, v.colorA, false);
  drawShape(ctx, 'circle', cx, cy, 50,  colorC,   true);
}

function renderMirrored(ctx, cx, cy, v) {
  const size = randomBetween(60, 90);
  drawShape(ctx, v.shapeA, cx - 75, cy, size, v.colorA, true);
  ctx.save();
  ctx.translate(cx + 75, cy);
  ctx.scale(-1, 1);
  drawShape(ctx, v.shapeA, 0, 0, size, v.colorB, true);
  ctx.restore();
}

function renderScattered(ctx, cx, cy, canvasW, canvasH, v) {
  // 5 random small shapes scattered across canvas
  const size = randomBetween(30, 50);
  const positions = [
    { x: cx - 110, y: cy - 55 },
    { x: cx + 95,  y: cy - 70 },
    { x: cx - 60,  y: cy + 65 },
    { x: cx + 120, y: cy + 40 },
    { x: cx - 10,  y: cy - 10 },
  ];
  const colors = [v.colorA, v.colorB, v.colorA, v.colorB, v.colorA];
  positions.forEach((p, i) =>
    drawShape(ctx, i % 2 === 0 ? v.shapeA : v.shapeB, p.x, p.y, size, colors[i], true)
  );
}

// ─── New Trait ────────────────────────────────────────────────────────────────

function renderSameColor(ctx, cx, cy, v) {
  const size = randomBetween(60, 90);
  const shapeB = pickRandomExcluding(SHAPES, v.shapeA);
  drawShape(ctx, v.shapeA, cx - 80, cy, size, v.colorA, true);
  drawShape(ctx, shapeB,   cx + 80, cy, size, v.colorA, true); // same color!
}

function renderSameShape(ctx, cx, cy, v) {
  const size = randomBetween(60, 90);
  drawShape(ctx, v.shapeA, cx - 80, cy, size, v.colorA, true);
  drawShape(ctx, v.shapeA, cx + 80, cy, size, v.colorB, true); // same shape, diff color
}

function renderOppositeColors(ctx, cx, cy, v) {
  const size = randomBetween(65, 95);
  // Draw one on dark bg, one inverted
  ctx.save();
  ctx.fillStyle = v.colorA;
  ctx.beginPath(); ctx.roundRect(cx - 120, cy - size / 1.4, size * 1.4, size * 1.4 * 1.2 + 2, 8); ctx.fill();
  ctx.restore();
  drawShape(ctx, v.shapeA, cx - 75, cy, size * 0.7, '#1e293b', true);
  drawShape(ctx, v.shapeB, cx + 75, cy, size * 0.7, v.colorA,  true);
}

function renderSizeGradient(ctx, cx, cy, v) {
  // 4 same shapes in a row, increasing size
  const sizes = [28, 44, 62, 82];
  const xs = [cx - 105, cx - 45, cx + 25, cx + 105];
  sizes.forEach((s, i) => drawShape(ctx, v.shapeA, xs[i], cy, s, v.colorA, true));
}

function renderBorderOnly(ctx, cx, cy, v) {
  const size = randomBetween(65, 95);
  drawShape(ctx, v.shapeA, cx - 80, cy, size, v.colorA, false); // outline only
  drawShape(ctx, v.shapeB, cx + 80, cy, size, v.colorB, false); // outline only
}

function renderShadowCopy(ctx, cx, cy, v) {
  const size = randomBetween(65, 90);
  // Draw shadow (offset, semi-transparent)
  ctx.save();
  ctx.globalAlpha = 0.25;
  drawShape(ctx, v.shapeA, cx + 12, cy + 12, size, '#000000', true);
  ctx.globalAlpha = 1;
  drawShape(ctx, v.shapeA, cx, cy, size, v.colorA, true);
  ctx.restore();
}

function renderStriped(ctx, cx, cy, v) {
  const size = randomBetween(70, 100);
  // Draw shape then clip stripes inside
  ctx.save();
  ctx.beginPath();
  // Use a circle clip for simplicity
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = v.colorA;
  ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
  ctx.strokeStyle = 'hsla(220,20%,6%,0.5)';
  ctx.lineWidth = 7;
  for (let i = -size; i < size * 2; i += 16) {
    ctx.beginPath();
    ctx.moveTo(cx - size + i, cy - size);
    ctx.lineTo(cx - size + i, cy + size);
    ctx.stroke();
  }
  ctx.restore();
  drawShape(ctx, v.shapeA, cx, cy, size, v.colorA, false);
}

function renderDashedOutline(ctx, cx, cy, v) {
  const sizeA = randomBetween(65, 90);
  const sizeB = randomBetween(65, 90);
  // A = solid, B = dashed outline
  drawShape(ctx, v.shapeA, cx - 80, cy, sizeA, v.colorA, true);
  ctx.save();
  ctx.setLineDash([8, 5]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = v.colorB;
  drawShape(ctx, v.shapeB, cx + 80, cy, sizeB, v.colorB, false);
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── New Quant ────────────────────────────────────────────────────────────────

function renderThreeToOne(ctx, cx, cy, v) {
  const sizeA = randomBetween(42, 58);
  const sizeB = randomBetween(65, 90);
  [{ x: cx - 105, y: cy - 38 }, { x: cx - 105, y: cy + 38 }, { x: cx - 60, y: cy }]
    .forEach(p => drawShape(ctx, v.shapeA, p.x, p.y, sizeA, v.colorA, true));
  drawShape(ctx, v.shapeB, cx + 80, cy, sizeB, v.colorB, true);
}

function renderOneToFive(ctx, cx, cy, canvasW, canvasH, v) {
  drawShape(ctx, v.shapeA, cx - 105, cy, randomBetween(55, 75), v.colorA, true);
  const sizeB = randomBetween(30, 42);
  const positions = [
    { x: cx + 40, y: cy - 55 }, { x: cx + 90, y: cy - 55 },
    { x: cx + 140, y: cy - 55 }, { x: cx + 65, y: cy + 20 },
    { x: cx + 115, y: cy + 20 },
  ];
  positions.forEach(p => drawShape(ctx, v.shapeB, p.x, p.y, sizeB, v.colorB, true));
}

function renderDecreasingRow(ctx, cx, cy, v) {
  // 4 shapes in a row, decreasing size left→right
  const sizes = [85, 65, 46, 30];
  const xs = [cx - 105, cx - 38, cx + 22, cx + 72];
  sizes.forEach((s, i) => drawShape(ctx, v.shapeA, xs[i], cy, s, v.colorA, true));
}

function renderIncreasingRow(ctx, cx, cy, v) {
  const sizes = [30, 46, 65, 85];
  const xs = [cx - 105, cx - 52, cx + 15, cx + 90];
  sizes.forEach((s, i) => drawShape(ctx, v.shapeA, xs[i], cy, s, v.colorB, true));
}

function renderBalancedScale(ctx, cx, cy, v) {
  // Beam
  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 120, cy - 10); ctx.lineTo(cx + 120, cy - 10); ctx.stroke();
  // Pivot
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 30); ctx.stroke();
  ctx.restore();
  // Pans
  const sizeA = randomBetween(42, 60);
  const sizeB = randomBetween(42, 60);
  // Left pan
  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(cx - 100, cy - 10); ctx.lineTo(cx - 100, cy + 20); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  drawShape(ctx, v.shapeA, cx - 100, cy + 20 + sizeA / 2, sizeA, v.colorA, true);
  // Right pan
  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(cx + 100, cy - 10); ctx.lineTo(cx + 100, cy + 20); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  drawShape(ctx, v.shapeB, cx + 100, cy + 20 + sizeB / 2, sizeB, v.colorB, true);
}