import React, { useState, useEffect } from 'react';
import { Project } from '../types';

interface ModalsProps {
  activeModal: string | null;
  closeActiveModal: () => void;
  projects: Record<string, Project>;
  currentProject: string;
  onSwitchProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (oldName: string, newName: string) => void;
  currentScale: string;
  onSetScale: (scale: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  storageUsedInfo: string;
  onClearCanvas: () => void;
  onImportBackup: (backupData: any) => void;
}

export default function Modals({
  activeModal,
  closeActiveModal,
  projects,
  currentProject,
  onSwitchProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  currentScale,
  onSetScale,
  canvasRef,
  storageUsedInfo,
  onClearCanvas,
  onImportBackup
}: ModalsProps) {
  const [newProjName, setNewProjName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeModal === 'rename-project-modal') {
      setRenameInput(currentProject);
    }
  }, [activeModal, currentProject]);

  const handleCreate = () => {
    const val = newProjName.trim();
    if (val) {
      onCreateProject(val);
      setNewProjName('');
      closeActiveModal();
    }
  };

  const handleRename = () => {
    const val = renameInput.trim();
    if (val && val !== currentProject) {
      onRenameProject(currentProject, val);
      closeActiveModal();
    } else {
      closeActiveModal();
    }
  };

  const generateExportCardCanvas = (srcCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const card = document.createElement('canvas');
    const dw = srcCanvas.width;
    const dh = srcCanvas.height;

    const headerHeight = 72;
    const footerHeight = 44;
    const paddingX = 14;
    const paddingY = 10;

    const hdScale = 3; // 3x High Definition scaling for sharp text and vectors
    const width = dw + paddingX * 2;
    const height = dh + headerHeight + footerHeight + paddingY * 2;

    card.width = width * hdScale;
    card.height = height * hdScale;

    // Layout helper styling for standard references
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;

    const ctx = card.getContext('2d');
    if (!ctx) return srcCanvas;

    // Set high-quality scaling filters for bitmaps
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Scale everything by hdScale so all paths render super crisp
    ctx.scale(hdScale, hdScale);

    // 1. Fill entire card background with super solid opaque deep dark charcoal for maximum contrast
    ctx.fillStyle = '#060a14'; 
    ctx.fillRect(0, 0, width, height);

    // 2. Draw card header block
    ctx.fillStyle = '#0d111d';
    ctx.fillRect(0, 0, width, headerHeight);

    // Draw logo symbol (nesting custom purple architectural triangles matching app main logo) on left
    const iconX = 20;
    const iconY = 20;
    const iconSize = 32;

    ctx.save();
    ctx.translate(iconX, iconY);

    // Subtle dark background rounded button container filled with beautiful linearGradient matching APP_ICON_SVG deflect background
    const bgGrad = ctx.createLinearGradient(0, 0, 32, 32);
    bgGrad.addColorStop(0, '#0d1117');
    bgGrad.addColorStop(1, '#0a0a14');
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-2, -2, 36, 36, 8);
    } else {
      ctx.rect(-2, -2, 36, 36);
    }
    ctx.fill();
    ctx.stroke();

    // Subtle background grid lines inside the mini icon (divide size 512 to scale)
    ctx.strokeStyle = 'rgba(79, 142, 247, 0.06)';
    ctx.lineWidth = 0.5;
    const gridCols = [8, 16, 24];
    for (let c of gridCols) {
      ctx.beginPath();
      ctx.moveTo(c, 0);
      ctx.lineTo(c, 32);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, c);
      ctx.lineTo(32, c);
      ctx.stroke();
    }

    // Now draw the purple triangle ruler tool matching public/icon.svg precisely!
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    const ruleGrad = ctx.createLinearGradient(6, 24, 24, 24);
    ruleGrad.addColorStop(0, '#7c5cf7');
    ruleGrad.addColorStop(1, '#9b7fff');
    ctx.strokeStyle = ruleGrad;
    ctx.lineWidth = 2.2; // ~20 / 512 * 32 * 1.5

    // Triangles layout: bottom-left (6.8, 24.4), top-left (6.8, 8.8), bottom-right (23.1, 24.4)
    ctx.moveTo(6.8, 24.4);
    ctx.lineTo(6.8, 8.8);
    ctx.lineTo(23.1, 24.4);
    ctx.closePath();
    ctx.stroke();

    // Right angle mark at the bottom-left corner
    ctx.strokeStyle = 'rgba(124, 92, 247, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(6.8, 22.4);
    ctx.lineTo(8.8, 22.4);
    ctx.lineTo(8.8, 24.4);
    ctx.stroke();

    // Tiny tick marks lines on bottom edge of the ruler exactly scaled
    ctx.strokeStyle = 'rgba(124, 92, 247, 0.5)';
    ctx.lineWidth = 0.6;
    const tickPositions = [9.5, 12.1, 14.7, 17.3, 20.0, 22.6];
    for (let tx of tickPositions) {
      ctx.beginPath();
      ctx.moveTo(tx, 24.4);
      ctx.lineTo(tx, 22.4);
      ctx.stroke();
    }

    // Now draw the blue drafting pencil crossing diagonally!
    ctx.save();
    // Rotate of -38 degree around pivot point (18.1, 13.7) matching icon.svg
    ctx.translate(18.1, 13.7);
    ctx.rotate(-38 * Math.PI / 180);

    // Pencil Body coordinates relative to rotation (scaled from 512 to 32 sizing)
    const pWidth = 2.5;
    const pLength = 12.5;
    const pencilGrad = ctx.createLinearGradient(-pWidth/2, 0, pWidth/2, 0);
    pencilGrad.addColorStop(0, '#6ab0ff');
    pencilGrad.addColorStop(1, '#4f8ef7');
    ctx.fillStyle = pencilGrad;
    ctx.fillRect(-pWidth/2, -pLength/2, pWidth, pLength);

    // Pencil Wood Tip (triangle)
    ctx.fillStyle = '#c8deff';
    ctx.beginPath();
    ctx.moveTo(-pWidth/2, pLength/2);
    ctx.lineTo(pWidth/2, pLength/2);
    ctx.lineTo(0, pLength/2 + 2.8);
    ctx.closePath();
    ctx.fill();

    // Pencil Lead Tip (tiny dark tip)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-pWidth/4, pLength/2 + 1.8);
    ctx.lineTo(pWidth/4, pLength/2 + 1.8);
    ctx.lineTo(0, pLength/2 + 2.8);
    ctx.closePath();
    ctx.fill();

    // Eraser cap at the top end
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(-pWidth/2, -pLength/2 - 1.1, pWidth, 1.1);

    ctx.restore();

    ctx.restore();

    // Draw app brand title text next to logo: "Arch Pad" styled exactly like the UI gradient
    const grad = ctx.createLinearGradient(iconX + iconSize + 12, 0, iconX + iconSize + 120, 0);
    grad.addColorStop(0, '#4f8ef7');
    grad.addColorStop(1, '#7c5cf7');
    ctx.fillStyle = grad;
    ctx.font = '800 20px "Syne", "Inter", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('Arch Pad', iconX + iconSize + 12, iconY - 1);

    // Draw architectural sketchbook subtitle text: "ARCHITECTURAL SKETCHBOOK"
    ctx.fillStyle = '#5a73a3';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillText('ARCHITECTURAL SKETCHBOOK', iconX + iconSize + 12, iconY + 18);

    // Draw Date on Top-Right Corner of header: e.g. "04/06/2026"
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    const dateStr = `${d}/${m}/${y}`;

    ctx.fillStyle = '#5a73a3';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(dateStr, width - 20, headerHeight / 2);

    // 3. Draw whiteboard inner background and canvas content
    const drawX = paddingX;
    const drawY = headerHeight + paddingY;

    // Fill inner drawing area with crisp white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(drawX, drawY, dw, dh);

    // Draw original canvas whiteboard contents onto it (fully opaque)
    ctx.drawImage(srcCanvas, drawX, drawY);

    // Draw a neat solid border around whiteboard area so it looks beautifully framed
    ctx.strokeStyle = '#4f8ef7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(drawX - 1, drawY - 1, dw + 2, dh + 2);

    // 4. Overlap floating badges inside whiteboard
    // Sketch project name (Top-Left corner)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#111118';
    ctx.font = '800 15px "Syne", sans-serif';
    ctx.fillText(currentProject, drawX + 16, drawY + 16);

    // Horizontal Scale indicator (Top-Right corner): Badge style
    const scaleString = currentScale || '1:100';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    const textW = ctx.measureText(scaleString).width;
    const badgeW = textW + 16;
    const badgeH = 22;
    const badgeX = drawX + dw - badgeW - 16;
    const badgeY = drawY + 14;

    // Rounded rectangle background for scale badge
    ctx.fillStyle = '#ebf3ff';
    ctx.strokeStyle = '#4f8ef7';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    // Text of scale badge centered
    ctx.fillStyle = '#4f8ef7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scaleString, badgeX + badgeW / 2, badgeY + badgeH / 2);
    ctx.restore();

    // 5. Draw Footer block
    const footerY = height - footerHeight;
    ctx.fillStyle = '#0d111d';
    ctx.fillRect(0, footerY, width, footerHeight);

    // Center Footer Text exactly: Arch Pad | v2.0 | CodeTech
    ctx.fillStyle = '#5a73a3';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Arch Pad | v2.0 | CodeTech',
      width / 2,
      footerY + footerHeight / 2
    );

    return card;
  };

  const handleExport = (fmt: 'png' | 'jpg' | 'pdf' | 'voxpad') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const name = currentProject.replace(/[^a-z0-9]/gi, '_');

    if (fmt === 'png') {
      const cardCanvas = generateExportCardCanvas(canvas);
      const link = document.createElement('a');
      link.download = `${name}.png`;
      link.href = cardCanvas.toDataURL('image/png');
      link.click();
    } else if (fmt === 'jpg') {
      const cardCanvas = generateExportCardCanvas(canvas);
      const link = document.createElement('a');
      link.download = `${name}.jpg`;
      link.href = cardCanvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } else if (fmt === 'pdf') {
      const cardCanvas = generateExportCardCanvas(canvas);
      const img = cardCanvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${currentProject}</title>
              <style>
                * { margin: 0; padding: 0; }
                body { background: #060a14; display: flex; justify-content: center; align-items: center; padding: 20px; font-family: sans-serif; }
                img { max-width: 100%; height: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
              </style>
            </head>
            <body>
              <img src="${img}">
              <script>window.onload = function() { window.print(); }</script>
            </body>
          </html>
        `);
        win.document.close();
      }
    } else if (fmt === 'voxpad') {
      // Export all project backup as JSON file
      const backup: Record<string, { meta: Project; canvas: string | null }> = {};
      
      // Load all from localStorage + export
      const keys = Object.keys(projects);
      let loadedCount = 0;
      
      const doExport = () => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(backup)], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.download = `voxpad_backup_${Date.now()}.voxpad`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      };

      keys.forEach((k) => {
        const p = projects[k];
        const dataUrl = localStorage.getItem(`voxpad_canvas_${p.id}`);
        backup[p.id] = { meta: p, canvas: dataUrl };
      });
      doExport();
    }
    closeActiveModal();
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        onImportBackup(data);
        closeActiveModal();
      } catch (err) {
        alert('Failed to parse backup file. Please make sure it is a valid .voxpad backup file.');
      }
    };
    reader.readAsText(file);
  };

  if (!activeModal) return null;

  return (
    <>
      {/* Dynamic Overlay Backdrop for active modal */}
      <div
        className="modal-overlay fixed inset-0 z-[500] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeActiveModal();
        }}
      >
        {/* NEW PROJECT MODAL */}
        {activeModal === 'new-project-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200 scale-100">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer line-height-1 pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">＋ New Project</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-[18px]">
              ENTER A PROJECT NAME
            </div>
            <input
              className="modal-input w-full bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-mono text-[12px] p-[8px_10px] rounded-[7px] outline-none mt-3 focus:border-[#4f8ef7]"
              id="new-proj-input"
              type="text"
              placeholder="e.g. Site A – Ground Floor"
              maxLength={40}
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              autoFocus
            />
            <div className="modal-row flex gap-[8px] mt-4 flex-wrap">
              <button className="modal-btn primary flex-1 min-w-[80px] bg-none border rounded-[8px] font-sans text-[11px] font-[600] p-[9px_12px] text-center cursor-pointer transition-all bg-[#4f8ef7]/15 border-[#4f8ef7] text-[#4f8ef7] hover:bg-[#4f8ef7]/25" onClick={handleCreate}>
                Create
              </button>
              <button
                className="modal-btn flex-1 min-w-[80px] bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] rounded-[8px] font-sans text-[11px] font-[600] p-[9px_12px] text-center cursor-pointer transition hover:bg-[var(--bg4)]"
                onClick={closeActiveModal}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* RENAME PROJECT MODAL */}
        {activeModal === 'rename-project-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200 scale-100">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer line-height-1 pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">✏️ Rename Sketch</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-[18px]">
              ENTER A NEW NAME FOR THIS SKETCH
            </div>
            <input
              className="modal-input w-full bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-mono text-[12px] p-[8px_10px] rounded-[7px] outline-none mt-3 focus:border-[#4f8ef7]"
              id="rename-proj-input"
              type="text"
              placeholder="e.g. Site A – Alternative Layout"
              maxLength={40}
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
              autoFocus
            />
            <div className="modal-row flex gap-[8px] mt-4 flex-wrap">
              <button className="modal-btn primary flex-1 min-w-[80px] bg-none border rounded-[8px] font-sans text-[11px] font-[600] p-[9px_12px] text-center cursor-pointer transition-all bg-[#4f8ef7]/15 border-[#4f8ef7] text-[#4f8ef7] hover:bg-[#4f8ef7]/25" onClick={handleRename}>
                Rename
              </button>
              <button
                className="modal-btn flex-1 min-w-[80px] bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] rounded-[8px] font-sans text-[11px] font-[600] p-[9px_12px] text-center cursor-pointer transition hover:bg-[var(--bg4)]"
                onClick={closeActiveModal}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* PROJECTS DASHBOARD MODAL */}
        {activeModal === 'dashboard-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200 max-h-[80vh] overflow-y-auto">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">⊞ Projects</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-3">
              ALL PROJECTS
            </div>
            
            <input
              className="search-input w-full bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] font-mono text-[11px] p-[7px_10px] rounded-[7px] outline-none mb-2.5 focus:border-[#4f8ef7]"
              type="text"
              placeholder="Search projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div id="proj-list" className="max-h-[300px] overflow-y-auto pr-1">
              {Object.keys(projects).length === 0 ? (
                <div className="text-[11px] text-[var(--text3)] p-3 text-center font-mono">No projects found.</div>
              ) : (
                Object.keys(projects)
                  .map((k) => projects[k])
                  .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => b.modified - a.modified)
                  .map((p) => {
                    const isCurrent = p.name === currentProject;
                    const d = new Date(p.modified);
                    const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                    return (
                      <div
                        key={p.id}
                        className={`proj-item flex items-center justify-between p-[9px_10px] bg-[var(--bg3)] border rounded-[8px] mt-1.5 cursor-pointer transition ${
                          isCurrent ? 'border-[#4f8ef7]/40 font-bold bg-[#4f8ef7]/5' : 'border-[var(--border)] hover:border-[var(--border2)]'
                        }`}
                      >
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => {
                            onSwitchProject(p.name);
                            closeActiveModal();
                          }}
                        >
                          <div className="proj-name text-[12px] font-[600] truncate text-[var(--text)] pr-2">
                            {p.name}
                          </div>
                          <div className="proj-meta text-[9px] text-[var(--text2)] font-mono mt-[2px]">
                            Modified: {dateStr} · {p.scale}
                          </div>
                        </div>
                        <button
                          className={`proj-del border-0 cursor-pointer text-xs p-[4px_10px] rounded transition-colors select-none font-bold ${
                            deleteConfirmId === p.id 
                              ? 'bg-red-500 text-white font-black text-[10px]' 
                              : 'bg-none text-[var(--text3)] hover:text-[var(--red)] hover:bg-red-500/10'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (deleteConfirmId === p.id) {
                              onDeleteProject(p.id);
                              setDeleteConfirmId(null);
                            } else {
                              setDeleteConfirmId(p.id);
                              setTimeout(() => {
                                setDeleteConfirmId((curr) => curr === p.id ? null : curr);
                              }, 3500);
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (deleteConfirmId === p.id) {
                              onDeleteProject(p.id);
                              setDeleteConfirmId(null);
                            } else {
                              setDeleteConfirmId(p.id);
                              setTimeout(() => {
                                setDeleteConfirmId((curr) => curr === p.id ? null : curr);
                              }, 3500);
                            }
                          }}
                        >
                          {deleteConfirmId === p.id ? 'DELETE?' : '✕'}
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* SCALE SELECTION MODAL */}
        {activeModal === 'scale-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">⊟ Drawing Scale</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-[18px]">
              SELECT SCALE FOR PROJECT
            </div>
            <div className="modal-row flex gap-[8px] mt-2 flex-wrap">
              {['1:20', '1:50', '1:100', '1:200'].map((s) => (
                <button
                  key={s}
                  className={`modal-btn flex-1 min-w-[65px] bg-[var(--bg3)] border text-[var(--text)] rounded-[8px] font-sans text-[11px] font-[600] p-[9px_12px] text-center cursor-pointer transition ${
                    currentScale === s ? 'border-[#4f8ef7] text-[#4f8ef7] bg-[#4f8ef7]/5' : 'border-[var(--border2)] hover:bg-[var(--bg4)]'
                  }`}
                  onClick={() => {
                    onSetScale(s);
                    closeActiveModal();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="modal-row flex gap-[8px] mt-2 flex-wrap">
              {['1:500', '1:1000', 'NTS'].map((s) => (
                <button
                  key={s}
                  className={`modal-btn flex-1 min-w-[65px] bg-[var(--bg3)] border text-[var(--text)] rounded-[8px] font-sans text-[11px] font-[600] p-[9px_12px] text-center cursor-pointer transition ${
                    currentScale === s ? 'border-[#4f8ef7] text-[#4f8ef7] bg-[#4f8ef7]/5' : 'border-[var(--border2)] hover:bg-[var(--bg4)]'
                  }`}
                  onClick={() => {
                    onSetScale(s);
                    closeActiveModal();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-[var(--text3)] mt-[12px]">
              Current:{' '}
              <span className="text-[#4f8ef7] font-bold" id="cur-scale-lbl">
                {currentScale}
              </span>
            </p>
          </div>
        )}

        {/* EXPORT OPTIONS MODAL */}
        {activeModal === 'export-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">⤓ Export</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-[18px]">
              CHOOSE FORMAT
            </div>
            <div className="export-grid grid grid-cols-2 gap-2 mt-2">
              <div
                className="exp-btn bg-[var(--bg3)] border border-[var(--border)] rounded-[8px] p-3 text-center cursor-pointer hover:bg-[var(--bg4)] hover:border-[var(--border2)] transition-all flex flex-col items-center justify-center"
                onClick={() => handleExport('png')}
              >
                <div className="exp-icon text-[20px] mb-1">🖼</div>
                <div className="exp-label text-[10px] text-[var(--text2)] font-mono tracking-[0.5px]">PNG Image</div>
                <div className="exp-ext text-[9px] text-[var(--text3)] mt-0.5 font-mono">.png · Lossless</div>
              </div>
              <div
                className="exp-btn bg-[var(--bg3)] border border-[var(--border)] rounded-[8px] p-3 text-center cursor-pointer hover:bg-[var(--bg4)] hover:border-[var(--border2)] transition-all flex flex-col items-center justify-center"
                onClick={() => handleExport('jpg')}
              >
                <div className="exp-icon text-[20px] mb-1">📷</div>
                <div className="exp-label text-[10px] text-[var(--text2)] font-mono tracking-[0.5px]">JPEG Image</div>
                <div className="exp-ext text-[9px] text-[var(--text3)] mt-0.5 font-mono">.jpg · Comp</div>
              </div>
              <div
                className="exp-btn bg-[var(--bg3)] border border-[var(--border)] rounded-[8px] p-3 text-center cursor-pointer hover:bg-[var(--bg4)] hover:border-[var(--border2)] transition-all flex flex-col items-center justify-center"
                onClick={() => handleExport('pdf')}
              >
                <div className="exp-icon text-[20px] mb-1">📄</div>
                <div className="exp-label text-[10px] text-[var(--text2)] font-mono tracking-[0.5px]">PDF Print</div>
                <div className="exp-ext text-[9px] text-[var(--text3)] mt-0.5 font-mono">.pdf · Print</div>
              </div>
              <div
                className="exp-btn bg-[var(--bg3)] border border-[var(--border)] rounded-[8px] p-3 text-center cursor-pointer hover:bg-[var(--bg4)] hover:border-[var(--border2)] transition-all flex flex-col items-center justify-center"
                onClick={() => handleExport('voxpad')}
              >
                <div className="exp-icon text-[20px] mb-1">💼</div>
                <div className="exp-label text-[10px] text-[var(--text2)] font-mono tracking-[0.5px]">Backup App</div>
                <div className="exp-ext text-[9px] text-[var(--text3)] mt-0.5 font-mono">.voxpad · Backup</div>
              </div>
            </div>

            {/* Direct Import Concept for PWA standalone */}
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <label className="block text-center text-[10px] font-mono text-[var(--text2)] cursor-pointer hover:text-[#4f8ef7] transition">
                📂 Import Backup (.voxpad)
                <input
                  type="file"
                  accept=".voxpad,application/json"
                  className="hidden"
                  onChange={handleBackupFileSelect}
                />
              </label>
            </div>
          </div>
        )}

        {/* ABOUT MODAL */}
        {activeModal === 'about-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">Arch Pad</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-[18px]">
              VERSION 1.1 · STABLE PWA
            </div>
            <div className="privacy-text text-[11px] leading-[1.7] text-[var(--text2)] mt-2">
              <p className="mb-2.5">
                Designed for architects, engineers, and designers to quickly sketch ideas, site dimensions, and plan concepts — work offline seamlessly!
              </p>
              <p>
                Vox Pad works offline-first using local high-speed database buffers, letting you sketch even in tunnels or remote build sites.
              </p>
            </div>
            <div className="mt-4 border-t border-[var(--border)] pt-2.5">
              <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
                <span className="info-label text-[var(--text2)] font-mono text-[10px]">Company</span>
                <span className="info-val text-[var(--text)] font-semibold">CodeTech Solutions</span>
              </div>
              <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
                <span className="info-label text-[var(--text2)] font-mono text-[10px]">Lead Arch Architect</span>
                <span className="info-val text-[var(--text)] font-semibold">Sachin Sheth</span>
              </div>
              <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
                <span className="info-label text-[var(--text2)] font-mono text-[10px]">PWA Offline Engine</span>
                <span className="info-val text-[#4f8ef7] font-semibold">StandAlone Store</span>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM APP INFO MODAL */}
        {activeModal === 'info-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">⚙ App Information</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-4">
              SYSTEM & LOCAL STORAGE
            </div>
            <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
              <span className="info-label text-[var(--text2)] font-mono text-[10px]">App Version</span>
              <span className="info-val text-[var(--text)] font-semibold">1.1.0</span>
            </div>
            <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
              <span className="info-label text-[var(--text2)] font-mono text-[10px]">Platform Model</span>
              <span className="info-val text-[var(--text)] font-semibold">Standalone PWA Ready</span>
            </div>
            <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
              <span className="info-label text-[var(--text2)] font-mono text-[10px]">Storage Mode</span>
              <span className="info-val text-green-500 font-semibold">Offline IndexedDB (Unlimited)</span>
            </div>
            <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
              <span className="info-label text-[var(--text2)] font-mono text-[10px]">Canvas Workspace</span>
              <span className="info-val text-[var(--text)] font-semibold" id="canvas-size-info">
                {windowWidth}×{windowHeight}px
              </span>
            </div>
            <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
              <span className="info-label text-[var(--text2)] font-mono text-[10px]">IndexedDB Cache</span>
              <span className="info-val text-[#4f8ef7] font-semibold" id="storage-used-info">
                {storageUsedInfo}
              </span>
            </div>
          </div>
        )}

        {/* PRIVACY POLICY */}
        {activeModal === 'privacy-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">🔒 Privacy Policy</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-[18px]">
              CODETECH PRIVACY ASSURANCE
            </div>
            <div className="privacy-text text-[11px] leading-[1.7] text-[var(--text2)] mt-2">
              <p className="mb-2">
                Arch Pad stores all personal drawings, measurements, and project assets <strong>locally on your device only</strong> using state-of-the-art secure isolated IndexedDB storage API.
              </p>
              <p className="mb-2">
                No third-party cookies, no tracking telemetry, and no telemetry analytics are transmitted. Your creative ideas remain completely yours.
              </p>
              <p>
                Optional Firestore Synchronization is entirely select-in and uses secure Google Account authorization for your safety.
              </p>
            </div>
            <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] mt-3 last:border-none">
              <span className="info-label text-[var(--text2)] font-mono text-[10px]">Data Sandbox</span>
              <span className="info-val text-green-500 font-semibold">Strict Client-Only</span>
            </div>
            <div className="info-row flex justify-between items-center py-2 border-b border-[var(--border)] text-[11px] last:border-none">
              <span className="info-label text-[var(--text2)] font-mono text-[10px]">Secured Auth</span>
              <span className="info-val text-[var(--text)] font-semibold">Firebase Google Auth</span>
            </div>
          </div>
        )}

        {/* CLEAR CANVAS CONFIRMED MODAL */}
        {activeModal === 'clear-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-[14px] p-6 max-w-[340px] w-full transform transition-all duration-200 text-center">
            <button
              className="modal-close float-right bg-none border-none text-[var(--text3)] text-[18px] cursor-pointer pl-2 hover:text-[var(--text)]"
              onClick={closeActiveModal}
            >
              ×
            </button>
            <h2 className="text-[16px] font-[700] mb-1 text-[var(--text)]">✕ Clear Canvas</h2>
            <div className="sub text-[10px] text-[var(--text2)] font-mono tracking-[0.5px] mb-[18px]">
              ERASE ACTIVE PLAN DRAWINGS
            </div>
            <p className="text-[12px] text-[var(--text2)] mt-2 leading-relaxed">
              Are you absolutely sure you want to clear your active project drafting workspace? This cannot be undone.
            </p>
            <div className="modal-row flex gap-[8px] mt-5">
              <button
                className="modal-btn danger flex-1 bg-[#e74c3c]/10 border border-[#e74c3c]/40 text-[#e74c3c] hover:bg-[#e74c3c]/20 font-[600] rounded-[8px] text-[11px] p-[10px_12px] cursor-pointer transition-all"
                onClick={() => {
                  onClearCanvas();
                  closeActiveModal();
                }}
              >
                Clear Now
              </button>
              <button
                className="modal-btn flex-1 bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-[600] rounded-[8px] text-[11px] p-[10px_12px] cursor-pointer transition hover:bg-[var(--bg4)]"
                onClick={closeActiveModal}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
