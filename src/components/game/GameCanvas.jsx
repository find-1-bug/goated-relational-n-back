import React, { useRef, useEffect } from 'react';
import { renderRelationship } from '@/lib/relationshipRenderer';

export default function GameCanvas({ relationship, stimulus, clearCanvas }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set actual pixel dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    if (clearCanvas) {
      ctx.clearRect(0, 0, rect.width, rect.height);
      return;
    }

    if (relationship) {
      renderRelationship(ctx, rect.width, rect.height, relationship, null, stimulus);
    }
  }, [relationship, clearCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}