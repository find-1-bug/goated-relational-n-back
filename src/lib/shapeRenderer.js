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
  }

  if (filled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }

  ctx.restore();
}