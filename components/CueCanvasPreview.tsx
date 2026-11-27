'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CueConfiguration } from '@/types/cue';
import { generateLayers } from '@/lib/cueEngine';
import { Download, ZoomIn, ZoomOut, RotateCcw, Loader2, Sparkles } from 'lucide-react';

interface CueCanvasPreviewProps {
  cue: CueConfiguration;
}

export const CueCanvasPreview: React.FC<CueCanvasPreviewProps> = ({ cue }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // In-memory image cache
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Canvas base dimensions
  const CANVAS_WIDTH = 2304;
  const CANVAS_HEIGHT = 1536;

  // Load an image with caching
  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (imageCacheRef.current.has(src)) {
        resolve(imageCacheRef.current.get(src)!);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCacheRef.current.set(src, img);
        resolve(img);
      };
      img.onerror = (e) => {
        console.warn(`Failed to load image layer: ${src}`, e);
        reject(e);
      };
      img.src = src;
    });
  }, []);

  // Draw elegant Master Cue watermark logo in the open background space
  const drawMasterCueWatermark = (ctx: CanvasRenderingContext2D) => {
    ctx.save();

    const cx = 900;
    const cy = 485;

    // Watermark palette (refined luxury slate with crisp visibility)
    const watermarkSlate = 'rgba(71, 85, 105, 0.42)';
    const watermarkDark = 'rgba(15, 23, 42, 0.55)';
    const watermarkLight = 'rgba(100, 116, 139, 0.32)';

    // 1. Crossed Cues Emblem
    ctx.save();
    ctx.translate(cx, cy - 85);

    // Crossed Cue Shafts
    ctx.strokeStyle = watermarkSlate;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';

    // Shaft 1: bottom-left to top-right
    ctx.beginPath();
    ctx.moveTo(-140, 75);
    ctx.lineTo(140, -75);
    ctx.stroke();

    // Shaft 2: bottom-right to top-left
    ctx.beginPath();
    ctx.moveTo(140, 75);
    ctx.lineTo(-140, -75);
    ctx.stroke();

    // Butt sections (thicker hardwood butts at lower ends)
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-140, 75);
    ctx.lineTo(-95, 51);
    ctx.moveTo(140, 75);
    ctx.lineTo(95, 51);
    ctx.stroke();

    // Brass ferrules & tips at upper ends
    ctx.lineWidth = 5;
    ctx.strokeStyle = watermarkDark;
    ctx.beginPath();
    ctx.moveTo(125, -67);
    ctx.lineTo(140, -75);
    ctx.moveTo(-125, -67);
    ctx.lineTo(-140, -75);
    ctx.stroke();

    // Center Medallion Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = watermarkSlate;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner decorative ring
    ctx.strokeStyle = watermarkLight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Monogram "M" inside medallion
    ctx.fillStyle = watermarkDark;
    ctx.font = '700 24px "Cinzel", "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', 0, 2);

    // Flanking Heraldic Stars
    ctx.fillStyle = watermarkSlate;
    ctx.font = '20px sans-serif';
    ctx.fillText('★', -65, -3);
    ctx.fillText('★', 65, -3);

    ctx.restore();

    // 2. Main Brand Title: "MASTER CUE"
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = watermarkDark;
    ctx.font = '700 62px "Cinzel", "Georgia", "Times New Roman", serif';
    ctx.fillText('M A S T E R   C U E', cx, cy + 22);

    // 3. Elegant Horizontal Accent Lines with Diamond Center
    ctx.strokeStyle = watermarkLight;
    ctx.lineWidth = 2;

    // Left accent line
    ctx.beginPath();
    ctx.moveTo(cx - 300, cy + 68);
    ctx.lineTo(cx - 70, cy + 68);
    ctx.stroke();

    // Center diamond motif
    ctx.fillStyle = watermarkSlate;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 62);
    ctx.lineTo(cx + 6, cy + 68);
    ctx.lineTo(cx, cy + 74);
    ctx.lineTo(cx - 6, cy + 68);
    ctx.closePath();
    ctx.fill();

    // Right accent line
    ctx.beginPath();
    ctx.moveTo(cx + 70, cy + 68);
    ctx.lineTo(cx + 300, cy + 68);
    ctx.stroke();

    // 4. Subtitle: "HAND CRAFTED · CUSTOM MADE ENGLAND"
    ctx.fillStyle = watermarkSlate;
    ctx.font = '600 20px "Roboto", "Helvetica Neue", sans-serif';
    ctx.fillText('HAND CRAFTED  ·  CUSTOM MADE ENGLAND', cx, cy + 100);

    ctx.restore();
  };

  // Main Canvas Render loop
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setLoading(true);

    try {
      const layers = generateLayers(cue);

      // Preload all layer images
      const layerPromises = layers.map(async (layer) => {
        const url = `/api/cue-image/layers/${layer.thumb}.png?v=purev3`;
        try {
          const img = await loadImage(url);
          return { layer, img, success: true };
        } catch {
          return { layer, img: null, success: false };
        }
      });

      const loaded = await Promise.all(layerPromises);

      // Clear Canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Render layers sequentially
      for (const item of loaded) {
        if (!item.success || !item.img) continue;

        if (item.layer.thumb === 'Bground') {
          // Draw Pristine Studio Background (Made in England flag in top-right, clean backdrop)
          ctx.drawImage(item.img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          // Draw Master Cue background logo watermark
          drawMasterCueWatermark(ctx);
        } else if (item.layer.label === 'ENGRAVING' && item.layer.extra) {
          // Draw the engraving disc image first
          ctx.drawImage(item.img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          // If the disc is the round Disc (ENGDISK), draw the MasterCue brand crest and typography
          if (item.layer.thumb === 'ENGDISK') {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 1. Subtle crest
            ctx.fillStyle = '#6b5e51';
            ctx.font = '22px sans-serif';
            ctx.fillText('★ 🎱 ★', 2050, 485);

            // 2. "MASTER CUE" brand title
            ctx.fillStyle = '#1c1917';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = 1;
            ctx.shadowOffsetX = 0.5;
            ctx.shadowOffsetY = 0.5;
            ctx.font = '700 40px "Cinzel", "Georgia", "Times New Roman", serif';
            ctx.fillText('MASTER CUE', 2050, 545);

            // 3. "HAND CRAFTED" subtitle
            ctx.fillStyle = '#786c5e';
            ctx.font = '600 17px "Roboto", sans-serif';
            ctx.fillText('HAND CRAFTED', 2050, 595);

            ctx.restore();
          }

          // Draw the custom engraved text only if allowed by selected plate
          const allowsEngraving = cue.namePlate?.allowEngraving !== false;
          const engravingText = item.layer.extra.engraving?.trim();
          if (allowsEngraving && engravingText) {
            const bounds = item.layer.extra.bounds || '1893,651,2213,781';
            const parts = bounds.split(',').map(Number);
            const x1 = parts[0] || 1893;
            const y1 = parts[1] || 651;
            const x2 = parts[2] || 2213;
            const y2 = parts[7] || 781;

            const centerX = (x1 + x2) / 2;
            const centerY = (y1 + y2) / 2;
            const fontName = item.layer.extra.font || 'Roboto';

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#262422';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 1;
            ctx.shadowOffsetX = 0.5;
            ctx.shadowOffsetY = 0.5;

            // Calculate dynamic font size based on text length
            const baseFontSize = Math.min(32, Math.max(16, Math.floor(280 / (engravingText.length * 0.7))));
            ctx.font = `600 ${baseFontSize}px "${fontName}", sans-serif`;

            ctx.fillText(engravingText.toUpperCase(), centerX, centerY);
            ctx.restore();
          }
        } else {
          // Normal layer
          ctx.drawImage(item.img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      }
    } catch (err) {
      console.error('Error rendering cue canvas:', err);
    } finally {
      setLoading(false);
    }
  }, [cue, loadImage]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle Export / Download design image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `custom-cue-${cue.shaft?.name || 'design'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Zoom and Pan Handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex flex-col">
      {/* Top Visualizer Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-slate-200/90 z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
            Live 2304px Studio Preview
          </span>
          {cue.engraving && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
              <Sparkles className="w-3 h-3 text-amber-600" /> &quot;{cue.engraving}&quot;
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-600 min-w-10 text-center font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Reset Zoom"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <button
            onClick={handleDownload}
            title="Download Cue Blueprint (PNG)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full aspect-[2304/1536] max-h-[500px] overflow-hidden flex items-center justify-center select-none bg-slate-100/70 ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2 text-slate-700 transition-opacity">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="text-xs font-semibold tracking-wide">Rendering Cue Layers...</span>
          </div>
        )}

        {/* HTML5 Canvas */}
        <div
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain pointer-events-none drop-shadow-md"
          />
        </div>

        {/* Cue Spec Quick Overlay Badge at Bottom Left */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur border border-slate-200 shadow-md rounded-xl px-3 py-2 text-xs text-slate-700 hidden md:flex items-center gap-3">
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-medium block">Shaft</span>
            <span className="font-semibold text-slate-900">{cue.shaft?.name || 'Unselected'}</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-medium block">Joint</span>
            <span className="font-semibold text-slate-900">{cue.buttJoint?.name}</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-medium block">Splices</span>
            <span className="font-semibold text-amber-700">
              {cue.largeSplices ? `${cue.largeSplices}-Way Splice` : 'Plain Ebony'}
            </span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-medium block">Tip</span>
            <span className="font-semibold text-slate-900">{cue.tipSize?.name}</span>
          </div>
          {cue.largeVeneers && cue.largeVeneers.filter((v) => v.name && v.name !== 'None').length > 0 && (
            <>
              <div className="w-px h-6 bg-slate-200" />
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-medium block">Veneers</span>
                <span className="font-semibold text-amber-700">
                  {cue.largeVeneers.filter((v) => v.name && v.name !== 'None').length} Layers
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
