import { useState, useEffect, useRef } from 'react';
import { ToolType, ThemeType, PEN_SIZES, ArchSymbolType, PaperGridType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (t: ToolType) => void;
  currentSymbol: ArchSymbolType;
  setSymbol: (s: ArchSymbolType) => void;
  paperGrid: PaperGridType;
  setPaperGrid: (g: PaperGridType) => void;
  pencilSize: number;
  setPencilSize: (s: number) => void;
  setPencilNamedColor: (name: 'light' | 'medium' | 'dark') => void;
  pencilColor: string;
  setPencilColor: (c: string) => void;
  gridVisible: boolean;
  toggleGrid: () => void;
  undo: () => void;
  redo: () => void;
  onSave: () => void;
  onClear: () => void;
  onFullscreen: () => void;
  openModal: (id: string) => void;
  onShare: () => void;
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  zoom: number;
  setZoom: (f: number | ((prev: number) => number)) => void;
  setPanOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
}

type TabCategory = 'pen' | 'cad' | 'shapes' | 'actions' | 'view';

export default function Toolbar({
  currentTool,
  setTool,
  currentSymbol,
  setSymbol,
  paperGrid,
  setPaperGrid,
  pencilSize,
  setPencilSize,
  setPencilNamedColor,
  pencilColor,
  setPencilColor,
  gridVisible,
  toggleGrid,
  undo,
  redo,
  onSave,
  onClear,
  onFullscreen,
  openModal,
  onShare,
  theme,
  setTheme,
  zoom,
  setZoom,
  setPanOffset
}: ToolbarProps) {
  const [pullupOpen, setPullupOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<TabCategory>('pen');
  const [paletteMode, setPaletteMode] = useState<'standard' | 'mono'>('standard');
  const sizeScrollRef = useRef<HTMLDivElement>(null);

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    } catch {}
  };

  // Auto-switch tabs based on selected tool
  useEffect(() => {
    const shapeTools = ['line', 'rect', 'circle', 'arrow'];
    if (currentTool === 'dimension' || currentTool === 'symbol') {
      setActiveCat('cad');
    } else if (shapeTools.includes(currentTool)) {
      setActiveCat('shapes');
    } else if (['pen', 'eraser', 'text'].includes(currentTool)) {
      setActiveCat('pen');
    }
  }, [currentTool]);

  const standardColors = [
    { rgb: '#e74c3c', name: 'Red' },
    { rgb: '#f1c40f', name: 'Yellow' },
    { rgb: '#2ecc71', name: 'Green' },
    { rgb: '#1abc9c', name: 'Cyan' },
    { rgb: '#3498db', name: 'Blue' },
    { rgb: '#e91e63', name: 'Magenta' },
    { rgb: '#1a1a1a', name: 'Black' },
    { rgb: '#ffffff', name: 'White' }
  ];

  const monoColors = [
    { rgb: '#000000', name: 'Black' },
    { rgb: '#1a1a1a', name: 'Ink' },
    { rgb: '#333333', name: 'Dark Grey' },
    { rgb: '#555555', name: 'Mid Grey' },
    { rgb: '#777777', name: 'Grey' },
    { rgb: '#999999', name: 'Light Grey' },
    { rgb: '#bbbbbb', name: 'Pale Grey' },
    { rgb: '#dddddd', name: 'Near White' }
  ];

  const togglePullup = () => {
    triggerHaptic();
    setPullupOpen(!pullupOpen);
  };

  const handleSetColor = (c: string) => {
    triggerHaptic();
    setPencilColor(c);
    if (currentTool === 'eraser') {
      setTool('pen');
    }
  };

  const findClosestSizeIndex = () => {
    let closestIndex = 6;
    let minDiff = Infinity;
    PEN_SIZES.forEach(([px], i) => {
      const diff = Math.abs(px - pencilSize);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });
    return closestIndex;
  };

  const currentSizeIndex = findClosestSizeIndex();
  const currentSizeMM = PEN_SIZES[currentSizeIndex] ? PEN_SIZES[currentSizeIndex][1] : '0.20mm';
  const currentSizeDesc = PEN_SIZES[currentSizeIndex] ? PEN_SIZES[currentSizeIndex][2] : 'Technical Fine';

  useEffect(() => {
    if (activeCat === 'pen' && sizeScrollRef.current) {
      const container = sizeScrollRef.current;
      const activeBtn = container.querySelector(`#btn-sz-${currentSizeIndex}`) as HTMLElement;
      if (activeBtn) {
        const targetScrollLeft = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
        container.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [currentSizeIndex, activeCat]);

  const handleSetPencilSizeIndex = (idx: number) => {
    triggerHaptic();
    if (idx < 0 || idx >= PEN_SIZES.length) return;
    const [pxValue] = PEN_SIZES[idx];
    setPencilSize(pxValue);
    if (currentTool === 'eraser') {
      setTool('pen');
    }
  };

  const handleSetShapeTool = (t: ToolType) => {
    triggerHaptic();
    if (currentTool === t) {
      setTool('pen');
    } else {
      setTool(t);
    }
  };

  const isShadeActive = (col: string) => {
    return pencilColor.toLowerCase() === col.toLowerCase();
  };

  const symbolsList: { id: ArchSymbolType; label: string; icon: string }[] = [
    { id: 'north_arrow', label: 'North Arrow', icon: '🧭' },
    { id: 'door_swing', label: 'Door 90°', icon: '🚪' },
    { id: 'double_door', label: 'Double Door', icon: '🚪🚪' },
    { id: 'window', label: 'Window Sill', icon: '🪟' },
    { id: 'column_bubble', label: 'Grid Bubble', icon: '⭕' },
    { id: 'level_datum', label: 'Level Datum', icon: '📐' },
    { id: 'scale_bar', label: 'Scale Bar', icon: '📏' }
  ];

  const gridStylesList: { id: PaperGridType; label: string; icon: string }[] = [
    { id: 'cad', label: 'CAD Grid', icon: '▦' },
    { id: 'blueprint', label: 'Blueprint', icon: '🟦' },
    { id: 'metric', label: 'Metric Graph', icon: '◫' },
    { id: 'isometric', label: 'Isometric 30°', icon: '⬡' },
    { id: 'dots', label: 'Dot Matrix', icon: '⁘' },
    { id: 'plain', label: 'Plain Vellum', icon: '◻' }
  ];

  return (
    <div id="toolbar-wrap" className="shrink-0 bg-[var(--bg2)] border-t border-[var(--border)] relative select-none z-[100]">
      {/* Pull-up panel */}
      <div
        id="pullup-panel"
        className={`absolute bottom-full left-0 right-0 bg-[var(--bg2)] border-t border-[var(--border2)] overflow-hidden transition-all duration-320 ease-out z-[50] ${
          pullupOpen ? 'max-h-[75vh] open' : 'max-h-0'
        }`}
      >
        <div id="pullup-inner" className="p-[10px_12px_6px] max-h-[75vh] overflow-y-auto font-sans">
          {/* Category tabs */}
          <div className="cat-tabs">
            <div
              className={`cat-tab ${activeCat === 'pen' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic();
                setActiveCat('pen');
              }}
            >
              ✏ Pen
            </div>
            <div
              className={`cat-tab ${activeCat === 'cad' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic();
                setActiveCat('cad');
              }}
            >
              📐 CAD & Dim
            </div>
            <div
              className={`cat-tab ${activeCat === 'shapes' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic();
                setActiveCat('shapes');
              }}
            >
              ◻ Shapes
            </div>
            <div
              className={`cat-tab ${activeCat === 'actions' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic();
                setActiveCat('actions');
              }}
            >
              ⚡ Actions
            </div>
            <div
              className={`cat-tab ${activeCat === 'view' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic();
                setActiveCat('view');
              }}
            >
              ◈ View
            </div>
          </div>

          {/* TAB 1: PEN */}
          {activeCat === 'pen' && (
            <div className="cat-panel active flex flex-col items-center">
              <div className="tb-row">
                <span className="tb-label font-mono text-[9px] text-[var(--text2)] tracking-[0.5px] font-[600] mr-1 uppercase">TOOL</span>
                <button
                  className={`tb-btn ${currentTool === 'pen' ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setTool('pen');
                  }}
                >
                  ✏ Pen
                </button>
                <button
                  className={`tb-btn ${currentTool === 'eraser' ? 'eraser-active active' : ''}`}
                  onClick={() => handleSetShapeTool('eraser')}
                >
                  ⌫ Erase
                </button>
                <button
                  className={`tb-btn ${currentTool === 'text' ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setTool('text');
                  }}
                >
                  𝐀 Text
                </button>
              </div>

              {/* SHADE ROW */}
              <div className="tb-row shade-row border-t border-[var(--border)] pt-2 mt-1">
                <span className="tb-label font-mono text-[9px] text-[var(--text2)] tracking-[0.5px] font-[600] mr-1 uppercase">SHADE</span>
                <button
                  className={`tb-btn shade-btn ${isShadeActive('#bbbbbb') ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setPencilNamedColor('light');
                    if (currentTool === 'eraser') setTool('pen');
                  }}
                  style={{ background: '#cccccc', color: '#111', borderColor: '#bbb' }}
                >
                  LT
                </button>
                <button
                  className={`tb-btn shade-btn ${isShadeActive('#555555') ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setPencilNamedColor('medium');
                    if (currentTool === 'eraser') setTool('pen');
                  }}
                  style={{ background: '#666', color: '#fff', borderColor: '#555' }}
                >
                  MD
                </button>
                <button
                  className={`tb-btn shade-btn ${isShadeActive('#111111') ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setPencilNamedColor('dark');
                    if (currentTool === 'eraser') setTool('pen');
                  }}
                  style={{ background: '#111', color: '#fff', borderColor: '#000' }}
                >
                  DK
                </button>
              </div>

              {/* NIB THICKNESS ROW */}
              <div className="thickness-wrap">
                <div className="thickness-header flex items-center gap-[6px] mb-[6px]">
                  <span className="tb-label font-mono text-[9px] text-[var(--text2)] tracking-[0.5px] font-[600] uppercase">✒ NIB</span>
                  <span className="size-label-live font-mono text-[9px] text-[var(--accent)] font-[700]">
                    {currentSizeMM} · {currentSizeDesc}
                  </span>
                </div>
                <div id="size-scroll" ref={sizeScrollRef} className="w-full">
                  {PEN_SIZES.map(([pxValue, mmLabel, desc_label], idx) => (
                    <button
                      key={idx}
                      id={`btn-sz-${idx}`}
                      className={`nib-btn shrink-0 ${currentSizeIndex === idx ? 'active' : ''}`}
                      onClick={() => handleSetPencilSizeIndex(idx)}
                      title={desc_label}
                    >
                      <span
                        className="nib-preview rounded-[1px] transition-all bg-[var(--text)]"
                        style={{
                          height: `${Math.max(1, Math.min(pxValue, 14))}px`,
                          backgroundColor: currentSizeIndex === idx ? 'var(--accent)' : 'var(--text)'
                        }}
                      />
                      <span className="nib-label">{mmLabel.replace('mm', '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAD & DIMENSIONS (ARCHITECTURAL WORKSTATION SUITE) */}
          {activeCat === 'cad' && (
            <div className="cat-panel active flex flex-col items-center">
              {/* PRIMARY CAD TOOL ROW */}
              <div className="tb-row">
                <button
                  className={`tb-btn ${currentTool === 'dimension' ? 'active bg-[#4f8ef7]/20 border border-[#4f8ef7]' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setTool('dimension');
                  }}
                >
                  ⤢ CAD Dimension Line
                </button>
                <button
                  className={`tb-btn ${currentTool === 'symbol' ? 'active bg-[#4f8ef7]/20 border border-[#4f8ef7]' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setTool('symbol');
                  }}
                >
                  🧭 Stamp Symbol
                </button>
                {currentTool !== 'pen' && (
                  <button
                    className="tb-btn text-[var(--accent)] font-semibold"
                    onClick={() => {
                      triggerHaptic();
                      setTool('pen');
                    }}
                  >
                    ✏ Pen
                  </button>
                )}
              </div>

              {/* ARCHITECTURAL SYMBOLS PALETTE */}
              <div className="w-full border-t border-[var(--border)] pt-2 mt-2">
                <div className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-wider text-center mb-1.5">
                  ARCHITECTURAL STAMPS LIBRARY
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {symbolsList.map((sym) => (
                    <button
                      key={sym.id}
                      className={`tb-btn text-[11px] flex items-center gap-1.5 py-1 px-2.5 rounded-lg border transition ${
                        currentTool === 'symbol' && currentSymbol === sym.id
                          ? 'bg-[#4f8ef7]/25 border-[#4f8ef7] text-white font-semibold'
                          : 'border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
                      }`}
                      onClick={() => {
                        triggerHaptic();
                        setSymbol(sym.id);
                        setTool('symbol');
                      }}
                    >
                      <span>{sym.icon}</span>
                      <span>{sym.label}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[8px] font-mono text-center text-[var(--text3)] mt-1.5 opacity-70">
                  {currentTool === 'dimension'
                    ? 'DRAG BETWEEN TWO POINTS TO MEASURE & CREATE CAD DIMENSION'
                    : 'TAP ON CANVAS TO PLACE SELECTED ARCHITECTURAL STAMP'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHAPES */}
          {activeCat === 'shapes' && (
            <div className="cat-panel active flex flex-col items-center">
              <div className="tb-row">
                <button
                  className={`tb-btn ${currentTool === 'line' ? 'tool-shape-active active' : ''}`}
                  onClick={() => handleSetShapeTool('line')}
                >
                  ╱ Line
                </button>
                <button
                  className={`tb-btn ${currentTool === 'rect' ? 'tool-shape-active active' : ''}`}
                  onClick={() => handleSetShapeTool('rect')}
                >
                  ▭ Rect
                </button>
                <button
                  className={`tb-btn ${currentTool === 'circle' ? 'tool-shape-active active' : ''}`}
                  onClick={() => handleSetShapeTool('circle')}
                >
                  ○ Circle
                </button>
                <button
                  className={`tb-btn ${currentTool === 'arrow' ? 'tool-shape-active active' : ''}`}
                  onClick={() => handleSetShapeTool('arrow')}
                >
                  ➜ Arrow
                </button>
                {['line', 'rect', 'circle', 'arrow'].includes(currentTool) && (
                  <>
                    <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                    <button
                      className="tb-btn bg-gradient-to-r from-[#4f8ef7]/15 to-[#7c5cf7]/15 border-[#4f8ef7] text-[#4f8ef7] font-[700]"
                      onClick={() => {
                        triggerHaptic();
                        setTool('pen');
                      }}
                    >
                      ✏ Draw
                    </button>
                  </>
                )}
              </div>
              <div className="tb-row justify-center w-full mt-0">
                <span className="tb-label text-[8px] opacity-60 text-center tracking-[0.8px]">
                  TAP ACTIVE SHAPE AGAIN TO RETURN TO PEN
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIONS */}
          {activeCat === 'actions' && (
            <div className="cat-panel active flex flex-col items-center">
              <div className="tb-row">
                <button
                  className="tb-btn"
                  onClick={() => {
                    triggerHaptic();
                    undo();
                  }}
                >
                  ↩ Undo
                </button>
                <button
                  className="tb-btn"
                  onClick={() => {
                    triggerHaptic();
                    redo();
                  }}
                >
                  ↪ Redo
                </button>
                <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                <button
                  className="tb-btn success"
                  onClick={() => {
                    triggerHaptic();
                    onSave();
                  }}
                >
                  💾 Save
                </button>
                <button
                  className="tb-btn"
                  onClick={() => {
                    triggerHaptic();
                    openModal('export-modal');
                  }}
                >
                  ⤓ Export
                </button>
                <button
                  className="tb-btn"
                  onClick={() => {
                    triggerHaptic();
                    onShare();
                  }}
                >
                  ⤴ Share
                </button>
                <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                <button
                  className="tb-btn danger"
                  onClick={() => {
                    triggerHaptic();
                    onClear();
                  }}
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: VIEW & PAPER GRIDS */}
          {activeCat === 'view' && (
            <div className="cat-panel active flex flex-col items-center">
              <div className="tb-row">
                <button
                  className={`tb-btn ${gridVisible ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    toggleGrid();
                  }}
                >
                  ⊞ Grid: {gridVisible ? 'ON' : 'OFF'}
                </button>
                <button
                  className="tb-btn"
                  onClick={() => {
                    triggerHaptic();
                    openModal('scale-modal');
                  }}
                >
                  ⊟ Scale
                </button>
                <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                <button
                  className="tb-btn"
                  onClick={() => {
                    triggerHaptic();
                    onFullscreen();
                  }}
                >
                  ⛶ Fullscreen
                </button>
                <button
                  className={`tb-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setTheme('light');
                  }}
                >
                  ☀ Light
                </button>
                <button
                  className={`tb-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setTheme('dark');
                  }}
                >
                  ◗ Dark
                </button>
              </div>

              {/* ARCHITECTURAL PAPER GRID STYLES */}
              <div className="w-full border-t border-[var(--border)] pt-2 mt-2">
                <div className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-wider text-center mb-1.5">
                  ARCHITECTURAL DRAFTING PAPER STYLE
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {gridStylesList.map((g) => (
                    <button
                      key={g.id}
                      className={`tb-btn text-[11px] py-1 px-2.5 rounded-lg border transition flex items-center gap-1.5 ${
                        paperGrid === g.id
                          ? 'bg-[#4f8ef7]/25 border-[#4f8ef7] text-white font-semibold'
                          : 'border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
                      }`}
                      onClick={() => {
                        triggerHaptic();
                        setPaperGrid(g.id);
                        if (!gridVisible) toggleGrid();
                      }}
                    >
                      <span>{g.icon}</span>
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pull handle & Centered Inline Zoom/Pan Control Bar */}
      <div
        id="pullup-handle"
        className="flex items-center justify-center gap-4 p-[4px_12px_4px] select-none border-b-0 border-t border-[var(--border)] bg-[var(--bg2)]"
      >
        <div
          title={pullupOpen ? 'Close Tools Panel' : 'Open Tools Panel'}
          className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition py-1"
          onClick={togglePullup}
        >
          <span className="handle-label text-[var(--accent)] font-sans text-[11px] tracking-[0.5px] font-[900] uppercase select-none flex items-center gap-1">
            {pullupOpen ? 'v CAD Tools' : '^ CAD Tools'}
          </span>
        </div>

        <span className="text-[var(--text3)] opacity-40 font-mono text-[11px] select-none mx-0.5">|</span>

        {/* Floating Zoom / Pan Controls */}
        <div className="flex items-center gap-2">
          <button
            title="Zoom In"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              const oldZoom = zoom;
              const newZoom = Math.min(Math.round((oldZoom + 0.15) * 100) / 100, 3.0);
              if (newZoom === oldZoom) return;
              const cx = window.innerWidth / 2;
              const cy = window.innerHeight / 2;
              setPanOffset((prev) => ({
                x: cx - (cx - prev.x) * (newZoom / oldZoom),
                y: cy - (cy - prev.y) * (newZoom / oldZoom)
              }));
              setZoom(newZoom);
            }}
            className="w-[20px] h-[20px] flex items-center justify-center font-sans text-[11px] font-[900] bg-[var(--bg3)] hover:bg-[var(--bg4)] border border-[var(--border2)] rounded-[4px] text-[#4f8ef7] hover:scale-[1.05] active:scale-[0.95] transition cursor-pointer"
          >
            ＋
          </button>
          
          <span className="text-[8px] font-mono font-[800] text-center text-[#5a73a3] select-none min-w-[30px]">
            {Math.round(zoom * 100)}%
          </span>

          <button
            title="Zoom Out"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              const oldZoom = zoom;
              const newZoom = Math.max(Math.round((oldZoom - 0.15) * 100) / 100, 0.4);
              if (newZoom === oldZoom) return;
              const cx = window.innerWidth / 2;
              const cy = window.innerHeight / 2;
              setPanOffset((prev) => ({
                x: cx - (cx - prev.x) * (newZoom / oldZoom),
                y: cy - (cy - prev.y) * (newZoom / oldZoom)
              }));
              setZoom(newZoom);
            }}
            className="w-[20px] h-[20px] flex items-center justify-center font-sans text-[11px] font-[900] bg-[var(--bg3)] hover:bg-[var(--bg4)] border border-[var(--border2)] rounded-[4px] text-white hover:scale-[1.05] active:scale-[0.95] transition cursor-pointer"
          >
            －
          </button>

          <span className="text-[var(--text3)] opacity-40 font-mono text-[11px] select-none mx-0.5">|</span>

          <button
            title="Pan Workspace"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              setTool(currentTool === 'pan' ? 'pen' : 'pan');
            }}
            className={`w-[22px] h-[22px] flex items-center justify-center text-[11px] rounded-[4px] transition cursor-pointer ${
              currentTool === 'pan'
                ? 'bg-[#4f8ef7] text-white border border-[#4f8ef7]'
                : 'bg-[var(--bg3)] hover:bg-[var(--bg4)] border border-[var(--border2)] text-[#5a73a3]'
            }`}
          >
            🖐️
          </button>
        </div>
      </div>

      {/* Always-visible color strip */}
      <div id="color-strip" className="flex items-center justify-center gap-[12px] p-[6px_10px_5px] flex-nowrap w-full overflow-hidden">
        <button
          id="palette-toggle"
          className="bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-mono text-[8px] font-[700] p-[4px_6px] rounded-[6px] cursor-pointer tracking-[0.5px] whitespace-nowrap outline-none hover:opacity-90 active:scale-[0.96] transition font-bold"
          onClick={() => {
            triggerHaptic();
            setPaletteMode((prev) => (prev === 'standard' ? 'mono' : 'standard'));
          }}
          style={{
            color: paletteMode === 'mono' ? 'var(--accent)' : 'var(--text)',
            borderColor: paletteMode === 'mono' ? 'var(--accent)' : 'var(--border2)'
          }}
        >
          {paletteMode === 'mono' ? 'MONO' : 'STD'}
        </button>

        {paletteMode === 'standard' ? (
          <div id="palette-standard" className="palette-set flex items-center gap-[12px] flex-wrap">
            {standardColors.map((color) => (
              <div
                key={color.rgb}
                className={`color-dot w-[20px] h-[20px] rounded-full cursor-pointer border-2 transition-all hover:scale-125 shrink-0 ${
                  pencilColor === color.rgb ? 'border-white scale-115 active' : 'border-transparent'
                }`}
                style={{ backgroundColor: color.rgb }}
                onClick={() => handleSetColor(color.rgb)}
                title={color.name}
              />
            ))}
          </div>
        ) : (
          <div id="palette-mono" className="palette-set flex items-center gap-[12px] flex-wrap">
            {monoColors.map((color) => (
              <div
                key={color.rgb}
                className={`color-dot w-[20px] h-[20px] rounded-full cursor-pointer border transition-all hover:scale-125 shrink-0 ${
                  pencilColor === color.rgb ? 'border-white scale-115 border-2 active' : 'border-[#aaa]/40'
                }`}
                style={{ backgroundColor: color.rgb }}
                onClick={() => handleSetColor(color.rgb)}
                title={color.name}
              />
            ))}
          </div>
        )}

        <input
          type="color"
          id="custom-color"
          value={pencilColor.startsWith('#') && pencilColor.length === 7 ? pencilColor : '#000000'}
          title="Custom color"
          className="w-[20px] h-[20px] rounded-full border border-[var(--border)] cursor-pointer p-0 bg-transparent shrink-0 outline-none hover:scale-105 active:scale-95 transition"
          onChange={(e) => handleSetColor(e.target.value)}
        />
      </div>
    </div>
  );
}
