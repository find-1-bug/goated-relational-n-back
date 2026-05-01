// Draws a shape at (cx, cy) with given size, color, filled or outline
export function drawShape(ctx, shape, cx, cy, size, color, filled = true) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  ctx.beginPath();

  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      break;

    case 'square':
      ctx.rect(cx - size / 2, cy - size / 2, size, size);
      break;

    case 'triangle': {
      const h = (size * Math.sqrt(3)) / 2;
      ctx.moveTo(cx, cy - h / 2);
      ctx.lineTo(cx - size / 2, cy + h / 2);
      ctx.lineTo(cx + size / 2, cy + h / 2);
      ctx.closePath();
      break;
    }

    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + (size / 2) * Math.cos(angle);
        const y = cy + (size / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }

    case 'pentagon': {
      for (let i = 0; i < 5; i++) {
        const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
        const x = cx + (size / 2) * Math.cos(angle);
        const y = cy + (size / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }

    case 'star': {
      const outerR = size / 2;
      const innerR = size / 4.5;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }

    case 'diamond': {
      const half = size / 2;
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half * 0.6, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half * 0.6, cy);
      ctx.closePath();
      break;
    }

    case 'cross': {
      const arm = size / 6;
      const ext = size / 2;
      ctx.moveTo(cx - arm, cy - ext);
      ctx.lineTo(cx + arm, cy - ext);
      ctx.lineTo(cx + arm, cy - arm);
      ctx.lineTo(cx + ext, cy - arm);
      ctx.lineTo(cx + ext, cy + arm);
      ctx.lineTo(cx + arm, cy + arm);
      ctx.lineTo(cx + arm, cy + ext);
      ctx.lineTo(cx - arm, cy + ext);
      ctx.lineTo(cx - arm, cy + arm);
      ctx.lineTo(cx - ext, cy + arm);
      ctx.lineTo(cx - ext, cy - arm);
      ctx.lineTo(cx - arm, cy - arm);
      ctx.closePath();
      break;
    }

    case 'arrow': {
      const w = size * 0.35;
      const h2 = size / 2;
      ctx.moveTo(cx + h2, cy);
      ctx.lineTo(cx, cy - h2 * 0.6);
      ctx.lineTo(cx, cy - w * 0.4);
      ctx.lineTo(cx - h2, cy - w * 0.4);
      ctx.lineTo(cx - h2, cy + w * 0.4);
      ctx.lineTo(cx, cy + w * 0.4);
      ctx.lineTo(cx, cy + h2 * 0.6);
      ctx.closePath();
      break;
    }

    case 'heart': {
      const s = size / 2;
      ctx.moveTo(cx, cy + s * 0.8);
      ctx.bezierCurveTo(cx - s * 1.2, cy - s * 0.2, cx - s * 1.4, cy - s * 1.0, cx, cy - s * 0.4);
      ctx.bezierCurveTo(cx + s * 1.4, cy - s * 1.0, cx + s * 1.2, cy - s * 0.2, cx, cy + s * 0.8);
      ctx.closePath();
      break;
    }

    case 'crescent': {
      const r = size / 2;
      ctx.arc(cx, cy, r, 0.3, Math.PI * 2 - 0.3);
      ctx.closePath();
      // Cut out inner circle to make crescent (only visible when filled)
      if (filled) {
        ctx.fill();
        ctx.fillStyle = ctx.strokeStyle === color ? 'hsl(220 20% 6%)' : ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(cx + r * 0.35, cy, r * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      break;
    }

    case 'parallelogram': {
      const pw = size * 0.55;
      const ph = size * 0.35;
      const slant = size * 0.2;
      ctx.moveTo(cx - pw + slant, cy - ph);
      ctx.lineTo(cx + pw + slant, cy - ph);
      ctx.lineTo(cx + pw - slant, cy + ph);
      ctx.lineTo(cx - pw - slant, cy + ph);
      ctx.closePath();
      break;
    }

    default:
      // fallback: circle
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  }

  if (filled) ctx.fill();
  else ctx.stroke();

  ctx.restore();
}