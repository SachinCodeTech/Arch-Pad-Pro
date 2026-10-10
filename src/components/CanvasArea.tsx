import React, { useEffect, useRef } from 'react';
import { ToolType } from '../types';

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gridCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTool: ToolType;
  gridVisible: boolean;
  currentScale: string;
  autoSaveStatus: 'saved' | 'saving' | 'none';
  textInputState: {
    visible: boolean;
    x: number;
    y: number;
    value: string;
  };
  setTextInputState: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      x: number;
      y: number;
      value: string;
    }>
  >;
  onCommitText: (text: string) => void;
  pencilSize: number;
  pencilColor: string;
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  
  // Zoom & Pan states
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setTool: React.Dispatch<React.SetStateAction<ToolType>>;
}

export default function CanvasArea({
  canvasRef,
  gridCanvasRef,
  currentTool,
  gridVisible,
  currentScale,
  autoSaveStatus,
  textInputState,
  setTextInputState,
  onCommitText,
  pencilSize,
  pencilColor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  zoom,
  setZoom,
  panOffset,
  setPanOffset,
  setTool
}: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  const zoomRef = useRef(zoom);
  const panOffsetRef = useRef(panOffset);

  // Sync zoom and panOffset refs
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // Keep input focused when visible
  useEffect(() => {
    if (textInputState.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputState.visible]);

  // High performance native mouse-wheel zoom and mobile pinch-to-zoom gesture hook
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Center zooming on pointer/mouse cursor
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panOffsetRef.current;

      // Current world position under cursor before zoom
      const worldX = (mouseX - currentPan.x) / currentZoom;
      const worldY = (mouseY - currentPan.y) / currentZoom;

      // Zoom factor speed
      const zoomFactor = 1.08;
      let newZoom = currentZoom;

      if (e.deltaY < 0) {
        newZoom = Math.min(currentZoom * zoomFactor, 6.0); // zoom in
      } else {
        newZoom = Math.max(currentZoom / zoomFactor, 0.15); // zoom out
      }

      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;

      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    };

    let lastTouchDist = 0;
    let isPinching = false;
    let startTouchCenter = { x: 0, y: 0 };
    let startZoom = 1;
    let startPan = { x: 0, y: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        // Measure separation distance between fingers
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        lastTouchDist = dist;

        const rect = container.getBoundingClientRect();
        const centerX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const centerY = (t1.clientY + t2.clientY) / 2 - rect.top;

        startTouchCenter = { x: centerX, y: centerY };
        startZoom = zoomRef.current;
        startPan = { ...panOffsetRef.current };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (dist === 0) return;

        const scale = dist / lastTouchDist;
        let newZoom = startZoom * scale;
        newZoom = Math.max(0.15, Math.min(newZoom, 6.0));

        const rect = container.getBoundingClientRect();
        const currentCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const currentCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;

        // Trace center world point
        const worldX = (startTouchCenter.x - startPan.x) / startZoom;
        const worldY = (startTouchCenter.y - startPan.y) / startZoom;

        const newPanX = currentCenterX - worldX * newZoom;
        const newPanY = currentCenterY - worldY * newZoom;

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      }
    };

    const handleTouchEnd = () => {
      if (isPinching) {
        isPinching = false;
        lastTouchDist = 0;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [setZoom, setPanOffset]);

  const getBadgeText = () => {
    switch (currentTool) {
      case 'pen':
        return 'DRAW · FREEHAND';
      case 'eraser':
        return 'ERASE MODE';
      case 'text':
        return 'TEXT ANNOTATION';
      case 'line':
        return 'SHAPE · LINE';
      case 'rect':
        return 'SHAPE · RECTANGLE';
      case 'circle':
        return 'SHAPE · CIRCLE';
      case 'arrow':
        return 'SHAPE · ARROW';
      case 'pan':
        return 'PAN VIEW ACTIVE';
      default:
        return 'DRAFT';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onCommitText(textInputState.value);
    } else if (e.key === 'Escape') {
      setTextInputState((prev) => ({ ...prev, visible: false, value: '' }));
    }
  };

  const handleBlur = () => {
    // Commit on blur with minor delay to prevent conflict
    setTimeout(() => {
      if (textInputState.visible) {
        onCommitText(textInputState.value);
      }
    }, 120);
  };

  return (
    <div id="canvas-wrap" className="flex-1 relative overflow-hidden bg-[var(--bg)]" ref={containerRef}>
      
      {/* Canvas Viewport containing stationary high performance drawing canvas */}
      <div
        id="canvas-viewport"
        className="absolute top-0 left-0 w-full h-full"
      >
        {/* Active Sketch Canvas with perpetual blinking animation */}
        <canvas
          id="sketchCanvas"
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full block bg-[var(--canvas-bg)] transition-colors duration-200 touch-none canvas-blink-effect"
          style={{
            cursor: currentTool === 'pan' ? 'grab' : 'crosshair'
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />

        {/* Background CAD Grid Overlay */}
        <canvas
          id="grid-canvas"
          ref={gridCanvasRef}
          className={`absolute top-0 left-0 w-full h-full pointer-events-none block transition-opacity duration-200 ${
            gridVisible ? 'opacity-100 visible' : 'opacity-0 Gym-invisible hidden'
          }`}
        />
      </div>

      {/* Mode Badge Indicator */}
      <div
        id="mode-badge"
        className="canvas-mode-badge absolute top-2 left-2 bg-[#0a0a0f]/80 backdrop-blur-[8px] border border-[var(--border)] rounded-[6px] font-mono text-[9px] text-[var(--text)] p-[3px_8px] pointer-events-none tracking-[0.5px] uppercase z-40"
      >
        {getBadgeText()}
      </div>

      {/* Scale Badge Indicator */}
      <div
        id="scale-badge"
        className="scale-badge absolute top-2 right-2 bg-[#0a0a0f]/80 backdrop-blur-[8px] border border-[var(--border)] rounded-[6px] font-mono text-[9px] text-[#4f8ef7] p-[3px_9px] pointer-events-none tracking-[1px] transition-all duration-300 z-40"
      >
        {currentScale}
      </div>

      {/* AutoSave Status Notification Banner */}
      <div
        id="autosave-badge"
        className={`autosave-badge absolute bottom-2 right-2 bg-[#0a0a0f]/80 backdrop-blur-[8px] border border-[var(--border)] rounded-[6px] font-mono text-[9px] p-[3px_9px] pointer-events-none transition-opacity duration-400 z-40 ${
          autoSaveStatus !== 'none' ? 'opacity-100' : 'opacity-0'
        } ${autoSaveStatus === 'saving' ? 'text-[var(--yellow)]' : 'text-[var(--green)]'}`}
      >
        {autoSaveStatus === 'saving' ? '● SAVING…' : '● SAVED'}
      </div>

      {/* Floating CAD Text Annotation overlay */}
      {textInputState.visible && (
        <div
          id="text-overlay"
          className="absolute z-50 pointer-events-none"
          style={{
            left: `${textInputState.x * zoom + panOffset.x}px`,
            top: `${(textInputState.y - 18) * zoom + panOffset.y}px`
          }}
        >
          <input
            ref={textInputRef}
            id="text-input-el"
            type="text"
            placeholder="Type annotation…"
            className="absolute bg-white/95 border-2 border-[#4f8ef7] rounded-[4px] font-mono p-[3px_6px] outline-none min-w-[120px] text-[#111] pointer-events-auto z-[51]"
            style={{
              fontSize: `${Math.max(12, pencilSize * zoom * 3)}px`,
              color: pencilColor
            }}
            value={textInputState.value}
            onChange={(e) => setTextInputState((prev) => ({ ...prev, value: e.target.value }))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </div>
      )}
    </div>
  );
}
