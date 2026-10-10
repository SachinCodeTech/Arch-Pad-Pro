import { useState, useEffect, useRef } from 'react';
import { ToolType, ThemeType, PEN_SIZES } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (t: ToolType) => void;
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

type TabCategory = 'pen' | 'shapes' | 'actions' | 'view';

export default function Toolbar({
  currentTool,
  setTool,
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

  // Auto-switch tabs based on selected tool
  useEffect(() => {
    const shapeTools = ['line', 'rect', 'circle', 'arrow'];
    if (shapeTools.includes(currentTool)) {
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
    setPullupOpen(!pullupOpen);
  };

  const handleSetColor = (c: string) => {
    setPencilColor(c);
    // If eraser active, toggle to pen when changing color
    if (currentTool === 'eraser') {
      setTool('pen');
    }
  };

  // Find the closest PEN_SIZES index based on pencilSize width
  const findClosestSizeIndex = () => {
    let closestIndex = 6; // default to index 6 (0.20mm)
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

  // Scroll active size into view when activeSize index changes or the drawer is opened without sliding the whole canvas viewport
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
    if (idx < 0 || idx >= PEN_SIZES.length) return;
    const [pxValue] = PEN_SIZES[idx];
    setPencilSize(pxValue);
    
    // Auto-switch to pen if eraser was active
    if (currentTool === 'eraser') {
      setTool('pen');
    }
  };

  // Function to toggle shapes back to 'pen' on duplicate click
  const handleSetShapeTool = (t: ToolType) => {
    if (currentTool === t) {
      setTool('pen');
    } else {
      setTool(t);
    }
  };

  // Detect which custom shade button should be active
  const isShadeActive = (col: string) => {
    return pencilColor.toLowerCase() === col.toLowerCase();
  };

  return (
    <div id="toolbar-wrap" className="shrink-0 bg-[var(--bg2)] border-t border-[var(--border)] relative select-none z-[100]">
      {/* Pull-up panel */}
      <div
        id="pullup-panel"
        className={`absolute bottom-full left-0 right-0 bg-[var(--bg2)] border-t border-[var(--border2)] overflow-hidden transition-all duration-320 ease-out z-[50] ${
          pullupOpen ? 'max-h-[70vh] open' : 'max-h-0'
        }`}
      >
        <div id="pullup-inner" className="p-[10px_12px_6px] max-h-[70vh] overflow-y-auto font-sans">
          {/* Category tabs */}
          <div className="cat-tabs">
            <div
              className={`cat-tab ${
                activeCat === 'pen' ? 'active' : ''
              }`}
              onClick={() => setActiveCat('pen')}
            >
              ✏ Pen
            </div>
            <div
              className={`cat-tab ${
                activeCat === 'shapes' ? 'active' : ''
              }`}
              onClick={() => setActiveCat('shapes')}
            >
              ◻ Shapes
            </div>
            <div
              className={`cat-tab ${
                activeCat === 'actions' ? 'active' : ''
              }`}
              onClick={() => setActiveCat('actions')}
            >
              ⚡ Actions
            </div>
            <div
              className={`cat-tab ${
                activeCat === 'view' ? 'active' : ''
              }`}
              onClick={() => setActiveCat('view')}
            >
              ◈ View
            </div>
          </div>

          {/* Tab Categories */}
          {activeCat === 'pen' && (
            <div className="cat-panel active flex flex-col items-center">
              {/* TOOL ROW */}
              <div className="tb-row">
                <span className="tb-label font-mono text-[9px] text-[var(--text2)] tracking-[0.5px] font-[600] mr-1 uppercase">TOOL</span>
                <button
                  className={`tb-btn ${
                    currentTool === 'pen' ? 'active' : ''
                  }`}
                  onClick={() => setTool('pen')}
                >
                  ✏ Pen
                </button>
                <button
                  className={`tb-btn ${
                    currentTool === 'eraser' ? 'eraser-active active' : ''
                  }`}
                  onClick={() => handleSetShapeTool('eraser')}
                >
                  ⌫ Erase
                </button>
                <button
                  className={`tb-btn ${
                    currentTool === 'text' ? 'active' : ''
                  }`}
                  onClick={() => setTool('text')}
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
                    setPencilNamedColor('dark');
                    if (currentTool === 'eraser') setTool('pen');
                  }}
                  style={{ background: '#111', color: '#fff', borderColor: '#000' }}
                >
                  DK
                </button>
              </div>

              {/* THICKNESS ROW (NIB) */}
              <div className="thickness-wrap">
                <div className="thickness-header flex items-center gap-[6px] mb-[6px]">
                  <span className="tb-label font-mono text-[9px] text-[var(--text2)] tracking-[0.5px] font-[600] uppercase">✒ NIB</span>
                  <span className="size-label-live font-mono text-[9px] text-[var(--accent)] font-[700]">
                    {currentSizeMM} · {currentSizeDesc}
                  </span>
                </div>
                <div
                  id="size-scroll"
                  ref={sizeScrollRef}
                  className="w-full"
                >
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

          {activeCat === 'shapes' && (
            <div className="cat-panel active flex flex-col items-center">
              <div className="tb-row">
                <button
                  className={`tb-btn ${
                    currentTool === 'line' ? 'tool-shape-active active' : ''
                  }`}
                  onClick={() => handleSetShapeTool('line')}
                >
                  ╱ Line
                </button>
                <button
                  className={`tb-btn ${
                    currentTool === 'rect' ? 'tool-shape-active active' : ''
                  }`}
                  onClick={() => handleSetShapeTool('rect')}
                >
                  ▭ Rect
                </button>
                <button
                  className={`tb-btn ${
                    currentTool === 'circle' ? 'tool-shape-active active' : ''
                  }`}
                  onClick={() => handleSetShapeTool('circle')}
                >
                  ○ Circle
                </button>
                <button
                  className={`tb-btn ${
                    currentTool === 'arrow' ? 'tool-shape-active active' : ''
                  }`}
                  onClick={() => handleSetShapeTool('arrow')}
                >
                  ➜ Arrow
                </button>
                {['line', 'rect', 'circle', 'arrow'].includes(currentTool) && (
                  <>
                    <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                    <button
                      className="tb-btn bg-gradient-to-r from-[#4f8ef7]/15 to-[#7c5cf7]/15 border-[#4f8ef7] text-[#4f8ef7] font-[700]"
                      onClick={() => setTool('pen')}
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

          {activeCat === 'actions' && (
            <div className="cat-panel active flex flex-col items-center">
              <div className="tb-row">
                <button
                  className="tb-btn"
                  onClick={undo}
                >
                  ↩ Undo
                </button>
                <button
                  className="tb-btn"
                  onClick={redo}
                >
                  ↪ Redo
                </button>
                <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                <button
                  className="tb-btn success"
                  onClick={onSave}
                >
                  💾 Save
                </button>
                <button
                  className="tb-btn"
                  onClick={() => openModal('export-modal')}
                >
                  ⤓ Export
                </button>
                <button
                  className="tb-btn"
                  onClick={onShare}
                >
                  ⤴ Share
                </button>
                <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                <button
                  className="tb-btn danger"
                  onClick={onClear}
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          {activeCat === 'view' && (
            <div className="cat-panel active flex flex-col items-center">
              <div className="tb-row">
                <button
                  className={`tb-btn ${
                    gridVisible ? 'active' : ''
                  }`}
                  onClick={toggleGrid}
                >
                  ⊞ Grid
                </button>
                <button
                  className="tb-btn"
                  onClick={() => openModal('scale-modal')}
                >
                  ⊟ Scale
                </button>
                <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                <button
                  className="tb-btn"
                  onClick={onFullscreen}
                >
                  ⛶ Fullscreen
                </button>
                <div className="tb-sep w-[1px] h-[20px] bg-[var(--border2)] mx-1" />
                <button
                  className={`tb-btn ${
                    theme === 'light' ? 'active' : ''
                  }`}
                  onClick={() => setTheme('light')}
                >
                  ☀ Light
                </button>
                <button
                  className={`tb-btn ${
                    theme === 'dark' ? 'active' : ''
                  }`}
                  onClick={() => setTheme('dark')}
                >
                  ◗ Dark
                </button>
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
        {/* Toggle drawer control: pointer carets acting as ^ Tool and v Tool */}
        <div
          title={pullupOpen ? 'Close Tools Panel' : 'Open Tools Panel'}
          className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition py-1"
          onClick={togglePullup}
        >
          <span className="handle-label text-[var(--accent)] font-sans text-[11px] tracking-[0.5px] font-[900] uppercase select-none flex items-center gap-1">
            {pullupOpen ? 'v Tool' : '^ Tool'}
          </span>
        </div>

        {/* Separator Pipe | */}
        <span className="text-[var(--text3)] opacity-40 font-mono text-[11px] select-none mx-0.5">|</span>

        {/* Floating Zoom / Pan Controls right of Tool: +  -  🖐️ */}
        <div className="flex items-center gap-2">
          {/* Zoom In button */}
          <button
            title="Zoom In"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.min(z + 0.15, 3.0));
            }}
            className="w-[20px] h-[20px] flex items-center justify-center font-sans text-[11px] font-[900] bg-[var(--bg3)] hover:bg-[var(--bg4)] border border-[var(--border2)] rounded-[4px] text-[#4f8ef7] hover:scale-[1.05] active:scale-[0.95] transition cursor-pointer"
          >
            ＋
          </button>
          
          <span className="text-[8px] font-mono font-[800] text-center text-[#5a73a3] select-none min-w-[30px]">
            {Math.round(zoom * 100)}%
          </span>

          {/* Zoom Out button */}
          <button
            title="Zoom Out"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => {
                const nz = Math.max(z - 0.15, 0.4);
                if (nz === 1.0) setPanOffset({ x: 0, y: 0 });
                return nz;
              });
            }}
            className="w-[20px] h-[20px] flex items-center justify-center font-sans text-[11px] font-[900] bg-[var(--bg3)] hover:bg-[var(--bg4)] border border-[var(--border2)] rounded-[4px] text-white hover:scale-[1.05] active:scale-[0.95] transition cursor-pointer"
          >
            －
          </button>

          {/* Mini Separator */}
          <span className="text-[var(--text3)] opacity-40 font-mono text-[11px] select-none mx-0.5">|</span>

          {/* Pan hand button 🖐️ */}
          <button
            title="Pan Workspace"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
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
          onClick={() => setPaletteMode((prev) => (prev === 'standard' ? 'mono' : 'standard'))}
          style={{
            color: paletteMode === 'mono' ? 'var(--accent)' : 'var(--text)',
            borderColor: paletteMode === 'mono' ? 'var(--accent)' : 'var(--border2)'
          }}
        >
          {paletteMode === 'mono' ? 'MONO' : 'STD'}
        </button>

        {/* Selected Palette Mode */}
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

        {/* Custom hex HTML5 color picker */}
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
