import React, { useRef, useEffect } from 'react';
import { renderRelationship, is3D } from '@/lib/relationshipRenderer';
import { render3DRelationship } from '@/lib/threeRenderer';

export default function GameCanvas({ relationship, stimulus, clearCanvas, rintChain }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (clearCanvas || !relationship) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
        }
      }
      return;
    }

    if (is3D(relationship)) {
      // Use 3D renderer
      if (cleanupRef.current) cleanupRef.current();
      const container = containerRef.current;
      if (!container) return;
      
      container.innerHTML = '';
      const tempCanvas = document.createElement('canvas');
      tempCanvas.style.width = '100%';
      tempCanvas.style.height = '100%';
      tempCanvas.className = 'rounded-lg';
      container.appendChild(tempCanvas);

      const colors = [Math.random() * 0xffffff, Math.random() * 0xffffff];
      cleanupRef.current = render3DRelationship(tempCanvas, relationship, colors, rintChain);
    } else {
      // Use 2D renderer
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      renderRelationship(ctx, rect.width, rect.height, relationship, null, stimulus);
    }
  }, [relationship, clearCanvas, stimulus, rintChain]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ display: 'block' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}