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
  openModal?: (modal: string) => void;
  appIconSvg?: string;
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
  onImportBackup,
  openModal,
  appIconSvg
}: ModalsProps) {
  const [newProjName, setNewProjName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [aboutTab, setAboutTab] = useState<'overview' | 'credits' | 'changelog' | 'disclaimer'>('overview');
  const [privacyTab, setPrivacyTab] = useState<'privacy' | 'disclaimer' | 'terms'>('privacy');
  const [infoTab, setInfoTab] = useState<'diagnostics' | 'credits' | 'governance'>('diagnostics');
  const [expandFullPolicy, setExpandFullPolicy] = useState(false);

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
        link.download = `archpad_backup_${Date.now()}.archpad`;
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
        alert('Failed to parse backup file. Please make sure it is a valid .archpad or .voxpad backup file.');
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
                <div className="exp-ext text-[9px] text-[var(--text3)] mt-0.5 font-mono">.archpad · Backup</div>
              </div>
            </div>

            {/* Direct Import Backup File */}
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <label className="block text-center text-[10px] font-mono text-[var(--text2)] cursor-pointer hover:text-[#4f8ef7] transition">
                📂 Import Backup (.archpad / .voxpad)
                <input
                  type="file"
                  accept=".archpad,.voxpad,application/json"
                  className="hidden"
                  onChange={handleBackupFileSelect}
                />
              </label>
            </div>
          </div>
        )}

        {/* ABOUT MODAL - ARCHITECTURAL CAD SKETCHBOOK */}
        {activeModal === 'about-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-2xl p-6 max-w-[500px] w-[94vw] max-h-[88vh] overflow-y-auto transform transition-all duration-200 shadow-2xl">
            {/* Header with App Logo */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0d1117] border border-white/10 p-1 shrink-0 flex items-center justify-center shadow-md">
                  <img src={appIconSvg || '/icon.svg'} alt="Arch Pad Icon" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[17px] font-bold text-white tracking-tight">Arch Pad Pro</h2>
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-[#4f8ef7]/15 text-[#4f8ef7] border border-[#4f8ef7]/30">
                      v2.0
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text2)] font-medium mt-0.5">
                    Architectural CAD & Drafting Sketchbook
                  </div>
                  <div className="text-[9px] text-[var(--text3)] font-mono mt-1">
                    Native Android Edition · Offline-First CAD Engine
                  </div>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-lg bg-[var(--bg3)] hover:bg-[var(--bg4)] flex items-center justify-center text-[var(--text3)] hover:text-white transition text-lg leading-none cursor-pointer border-0 shrink-0"
                onClick={closeActiveModal}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* In-Modal Navigation Tabs */}
            <div className="flex p-1 bg-[var(--bg3)] rounded-xl border border-[var(--border)] my-3.5 text-[10.5px] font-semibold gap-0.5">
              <button
                onClick={() => setAboutTab('overview')}
                className={`flex-1 py-1.5 px-1.5 rounded-lg transition text-center cursor-pointer border-0 ${
                  aboutTab === 'overview'
                    ? 'bg-[var(--bg2)] text-white shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setAboutTab('credits')}
                className={`flex-1 py-1.5 px-1.5 rounded-lg transition text-center cursor-pointer border-0 ${
                  aboutTab === 'credits'
                    ? 'bg-[var(--bg2)] text-[#4f8ef7] shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Credits & Tech
              </button>
              <button
                onClick={() => setAboutTab('changelog')}
                className={`flex-1 py-1.5 px-1.5 rounded-lg transition text-center cursor-pointer border-0 ${
                  aboutTab === 'changelog'
                    ? 'bg-[var(--bg2)] text-white shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setAboutTab('disclaimer')}
                className={`flex-1 py-1.5 px-1.5 rounded-lg transition text-center cursor-pointer border-0 ${
                  aboutTab === 'disclaimer'
                    ? 'bg-[var(--bg2)] text-amber-400 shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Disclaimer
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {aboutTab === 'overview' && (
              <>
                <div className="py-2 text-[12px] leading-relaxed text-[var(--text2)] border-b border-[var(--border)]">
                  <p>
                    Arch Pad Pro is purpose-built for architects, civil engineers, interior planners, and site contractors. 
                    Draft instant conceptual blueprints, scale-accurate layout measurements, and CAD schematics with zero latency—both in the studio and directly on remote construction sites.
                  </p>
                </div>

                {/* Key Engineering Capabilities */}
                <div className="py-4 border-b border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-3">
                    Key Engineering Capabilities
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-[var(--bg3)]/60 border border-[var(--border)]">
                      <div className="text-[14px] mb-1">📐</div>
                      <div className="text-[11px] font-bold text-[var(--text)]">Vector Splines</div>
                      <div className="text-[9.5px] text-[var(--text3)] leading-normal mt-0.5">
                        Midpoint Bézier curve interpolation for smooth strokes.
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg3)]/60 border border-[var(--border)]">
                      <div className="text-[14px] mb-1">📏</div>
                      <div className="text-[11px] font-bold text-[var(--text)]">Calibrated Scales</div>
                      <div className="text-[9.5px] text-[var(--text3)] leading-normal mt-0.5">
                        Metric & Imperial architectural ratios (1:1 to 1:200, 1/4&quot;=1&apos;).
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg3)]/60 border border-[var(--border)]">
                      <div className="text-[14px] mb-1">🔒</div>
                      <div className="text-[11px] font-bold text-[var(--text)]">100% On-Device</div>
                      <div className="text-[9.5px] text-[var(--text3)] leading-normal mt-0.5">
                        Sandboxed local storage with zero tracking telemetry.
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg3)]/60 border border-[var(--border)]">
                      <div className="text-[14px] mb-1">💼</div>
                      <div className="text-[11px] font-bold text-[var(--text)]">CAD Export Suite</div>
                      <div className="text-[9.5px] text-[var(--text3)] leading-normal mt-0.5">
                        3x HD Title-Block cards, PDF sheets & .archpad backups.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publishing Credentials */}
                <div className="py-3.5 border-b border-[var(--border)] text-[11px]">
                  <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-2.5">
                    Publishing & Verification Credentials
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Publisher Entity</span>
                    <span className="font-semibold text-[var(--text)]">CodeTech App Store</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Lead Developer</span>
                    <span className="font-semibold text-[var(--text)]">Sheth Sachin D</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Android Package ID</span>
                    <span className="font-mono text-[10px] text-[#4f8ef7]">app.vercel.arch_pad_pro.twa</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Official Support</span>
                    <a href="mailto:codetech.appstore@gmail.com" className="font-medium text-[#4f8ef7] hover:underline">
                      codetech.appstore@gmail.com
                    </a>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Store Verification</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      ✓ Indus / PhonePe Verified
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: CREDITS & CORE TECHNOLOGIES */}
            {aboutTab === 'credits' && (
              <div className="py-2">
                <div className="text-[12px] leading-relaxed text-[var(--text2)] mb-3">
                  Arch Pad Pro is built with high-performance web standards and engineering algorithms, engineered for sub-millisecond drawing response and 100% offline persistence.
                </div>

                <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-2.5">
                  Core Technologies & Architecture
                </div>

                {/* Monochromatic Technical Badges Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">⚛</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">React 19</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Declarative UI Engine</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">🔷</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">TypeScript 5</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Strict Type System</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">🎨</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Canvas 2D GPU</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Hardware Acceleration</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">📐</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Bézier Splines</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Quadratic Smoothing</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">🗄</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">CAD Storage Engine</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Encrypted Device Buffer</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">📱</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Android CAD Edition</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Standalone Architecture</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">≋</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Tailwind CSS</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Zero-Runtime Styling</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">⚡</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Vite Engine</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Rollup Production Build</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">⚙</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Service Worker</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">CacheStorage Precache</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">☁</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Firebase Auth</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Voluntary Cloud Sync</div>
                    </div>
                  </div>
                </div>

                {/* Standards Compliance */}
                <div className="mt-3.5 p-3 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] text-[11px]">
                  <div className="text-[10px] font-mono uppercase tracking-[1px] text-[var(--text3)] mb-1">
                    Engineering Standards Compliance
                  </div>
                  <div className="text-[var(--text2)] leading-relaxed">
                    Compliant with <strong>ISO 216 / ANSI</strong> architectural drawing standard ratios and official <strong>Indus Appstore</strong> certified application parameters.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VERSION HISTORY (CHANGELOG) */}
            {aboutTab === 'changelog' && (
              <div className="py-2 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-2">
                  Chronological Release History
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-[#4f8ef7]/30">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-bold text-white">v2.0.0 (Production Release)</span>
                    <span className="text-[9px] font-mono text-[#4f8ef7] px-1.5 py-0.5 rounded bg-[#4f8ef7]/10 font-bold">
                      CURRENT
                    </span>
                  </div>
                  <div className="text-[9.5px] font-mono text-[var(--text3)] mb-2">November 2026</div>
                  <ul className="text-[11px] text-[var(--text2)] space-y-1 list-disc list-inside leading-relaxed">
                    <li>Midpoint Quadratic Bézier curve smoothing for natural freehand pen strokes.</li>
                    <li>Infinite drafting canvas workspace with high-performance zoom and pan navigation.</li>
                    <li>Architectural drafting paper presets (Blueprint, Metric, Isometric 30°, Dot Matrix).</li>
                    <li>Offline-first storage engine with zero network dependencies.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-bold text-[var(--text)]">v1.8.0</span>
                    <span className="text-[9px] font-mono text-[var(--text3)]">Stable</span>
                  </div>
                  <div className="text-[9.5px] font-mono text-[var(--text3)] mb-2">October 2026</div>
                  <ul className="text-[11px] text-[var(--text2)] space-y-1 list-disc list-inside leading-relaxed">
                    <li>Multi-format CAD Title-Block export card stamping (3x HD).</li>
                    <li>Architectural scale calibrations (1:1 to 1:200, 1/4&quot;=1&apos;).</li>
                    <li>Android hardware back button gesture navigation.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-bold text-[var(--text)]">v1.0.0</span>
                    <span className="text-[9px] font-mono text-[var(--text3)]">Launch</span>
                  </div>
                  <div className="text-[9.5px] font-mono text-[var(--text3)] mb-2">September 2026</div>
                  <ul className="text-[11px] text-[var(--text2)] space-y-1 list-disc list-inside leading-relaxed">
                    <li>Initial release of CAD vector drafting engine and sandboxed on-device database.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: LEGAL DISCLAIMER */}
            {aboutTab === 'disclaimer' && (
              <div className="py-2 space-y-3.5 text-[11.5px] leading-[1.8] text-[var(--text2)]">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200">
                  <div className="flex items-center gap-2 font-bold text-[12px] text-amber-300 mb-1">
                    <span>⚠️</span>
                    <span>Architectural & Structural Engineering Disclaimer</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    Arch Pad Pro is designed as a conceptual drafting, planning, and preliminary dimensioning tool for creative and spatial design. All measurements, scale ratios, calculations, and architectural drawings produced with this application must be independently verified, certified, and stamped by a licensed architect or qualified structural engineer prior to physical building, structural fabrication, or statutory municipal permit submission.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] space-y-2">
                  <div className="font-bold text-white text-[12px]">Warranty Limitation & &apos;As Is&apos; Provision</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    This software is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranty of any kind, whether express, statutory, or implied, including but not limited to the implied warranties of merchantability, fitness for a particular architectural use, and non-infringement.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] space-y-2">
                  <div className="font-bold text-white text-[12px]">User Intellectual Property Sovereignty</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    You retain 100% exclusive intellectual property, copyright, and commercial ownership over all blueprints, sketches, CAD stamp layouts, and vector notes authored within Arch Pad Pro. CodeTech App Store asserts zero ownership or licensing rights over your user-created content.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] space-y-2">
                  <div className="font-bold text-white text-[12px]">Local Storage & Data Backup Responsibility</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    Sketches and workspace states are held in sandboxed on-device database storage. CodeTech App Store cannot restore data lost due to device hardware damage, factory operating system resets, or application uninstalls. Users are strongly urged to utilize the built-in &quot;.archpad&quot; backup utility on a regular schedule.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  if (openModal) openModal('privacy-modal');
                }}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[var(--bg3)] hover:bg-[var(--bg4)] text-[var(--text)] text-[11px] font-semibold transition border border-[var(--border)] cursor-pointer flex items-center justify-center gap-1.5"
              >
                🔒 In-App Privacy & Legal
              </button>
              <button
                onClick={() => {
                  if (openModal) openModal('info-modal');
                }}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#4f8ef7]/15 hover:bg-[#4f8ef7]/25 text-[#4f8ef7] text-[11px] font-semibold transition border border-[#4f8ef7]/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                ⚙ System Diagnostics
              </button>
            </div>
          </div>
        )}

        {/* SYSTEM APP INFO MODAL - HARDWARE & CAD RUNTIME METRICS */}
        {activeModal === 'info-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-2xl p-6 max-w-[480px] w-[94vw] max-h-[88vh] overflow-y-auto transform transition-all duration-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base text-[#4f8ef7]">⚙</span>
                  <h2 className="text-[17px] font-bold text-white tracking-tight">System & Diagnostics</h2>
                </div>
                <div className="text-[10px] text-[var(--text3)] font-mono uppercase tracking-[1.5px] mt-1">
                  CAD ENGINE RUNTIME & HARDWARE SPECIFICATIONS
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-lg bg-[var(--bg3)] hover:bg-[var(--bg4)] flex items-center justify-center text-[var(--text3)] hover:text-white transition text-lg leading-none cursor-pointer border-0 shrink-0"
                onClick={closeActiveModal}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* In-Modal Navigation Tabs */}
            <div className="flex p-1 bg-[var(--bg3)] rounded-xl border border-[var(--border)] my-3.5 text-[11px] font-semibold gap-1">
              <button
                onClick={() => setInfoTab('diagnostics')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition text-center cursor-pointer border-0 ${
                  infoTab === 'diagnostics'
                    ? 'bg-[var(--bg2)] text-white shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Diagnostics
              </button>
              <button
                onClick={() => setInfoTab('credits')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition text-center cursor-pointer border-0 ${
                  infoTab === 'credits'
                    ? 'bg-[var(--bg2)] text-[#4f8ef7] shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Credits & Tech
              </button>
              <button
                onClick={() => setInfoTab('governance')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition text-center cursor-pointer border-0 ${
                  infoTab === 'governance'
                    ? 'bg-[var(--bg2)] text-emerald-400 shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Governance
              </button>
            </div>

            {/* TAB 1: DIAGNOSTICS */}
            {infoTab === 'diagnostics' && (
              <>
                {/* Quick Engine Status Strips */}
                <div className="grid grid-cols-3 gap-2 py-2 border-b border-[var(--border)] text-center">
                  <div className="p-2 rounded-lg bg-[#4f8ef7]/10 border border-[#4f8ef7]/20">
                    <div className="text-[9px] font-mono uppercase text-[#4f8ef7] font-bold">Engine</div>
                    <div className="text-[11px] font-semibold text-white mt-0.5">2D Canvas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[9px] font-mono uppercase text-emerald-400 font-bold">Storage</div>
                    <div className="text-[11px] font-semibold text-white mt-0.5">Encrypted CAD</div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="text-[9px] font-mono uppercase text-purple-400 font-bold">Runtime</div>
                    <div className="text-[11px] font-semibold text-white mt-0.5">Standalone CAD</div>
                  </div>
                </div>

                {/* Workspace & Display Telemetry */}
                <div className="py-3.5 border-b border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-2">
                    Viewport & Display Geometry
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Viewport Resolution</span>
                      <span className="font-mono font-semibold text-[var(--text)] tabular-nums">{windowWidth} × {windowHeight} px</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Device Pixel Ratio</span>
                      <span className="font-mono font-semibold text-[var(--text)] tabular-nums">
                        {(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1).toFixed(2)}x HiDPI
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Active Architectural Scale</span>
                      <span className="font-mono font-semibold text-[#4f8ef7]">{currentScale}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Stroke Interpolation</span>
                      <span className="font-semibold text-[var(--text)]">Quadratic Bézier Spline</span>
                    </div>
                  </div>
                </div>

                {/* Storage & Local Persistence Telemetry */}
                <div className="py-3.5 border-b border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-2">
                    Storage & Sketch Registry
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Local CAD Storage Buffer</span>
                      <span className="font-mono font-semibold text-[#4f8ef7] tabular-nums">{storageUsedInfo}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Total Registered Sketches</span>
                      <span className="font-mono font-semibold text-[var(--text)] tabular-nums">{Object.keys(projects).length} Projects</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Active Canvas ID</span>
                      <span className="font-semibold text-emerald-400 truncate max-w-[200px]" title={currentProject}>{currentProject}</span>
                    </div>
                  </div>
                </div>

                {/* Platform & Store Identification */}
                <div className="py-3.5 text-[11px]">
                  <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-2">
                    Application & Store Parameters
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                      <span className="text-[var(--text3)] font-mono text-[10px]">App Version</span>
                      <span className="font-mono font-semibold text-[var(--text)]">2.0.0 (Production)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Package ID</span>
                      <span className="font-mono text-[10px] text-[var(--text2)]">app.vercel.arch_pad_pro.twa</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[var(--text3)] font-mono text-[10px]">Publisher</span>
                      <span className="font-semibold text-[var(--text)]">CodeTech App Store</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: CREDITS & TECH STACK */}
            {infoTab === 'credits' && (
              <div className="py-2">
                <div className="text-[12px] leading-relaxed text-[var(--text2)] mb-3">
                  Technical specification and core libraries powering Arch Pad Pro&apos;s real-time drafting workstation:
                </div>

                <div className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--text3)] mb-2.5">
                  Core Technologies & Architecture
                </div>

                {/* Monochromatic Technical Badges Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">⚛</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">React 19</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Declarative UI Engine</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">🔷</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">TypeScript 5</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Strict Type System</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">🎨</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Canvas 2D GPU</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Hardware Acceleration</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">📐</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Bézier Splines</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Quadratic Smoothing</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">🗄</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">CAD Storage Engine</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Encrypted Device Buffer</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">📱</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Android CAD Edition</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Standalone Architecture</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">≋</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Tailwind CSS</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Zero-Runtime Styling</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">⚡</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Vite Engine</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Rollup Bundler</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">📡</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Offline Cache</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Pre-Cached Shell</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex items-center gap-2.5">
                    <span className="font-mono text-[12px] text-white font-bold w-5 text-center">🔥</span>
                    <div>
                      <div className="font-semibold text-white text-[11px]">Firebase Cloud</div>
                      <div className="text-[9px] text-[var(--text3)] font-mono">Google Cloud Sync</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] text-[10.5px] text-[var(--text3)] font-mono leading-relaxed">
                  <div className="text-[10px] text-white font-semibold uppercase mb-1">Architecture Compliance</div>
                  <div>• ISO 216 / ANSI Drawing sheet aspect ratio standard</div>
                  <div>• Certified Android Package: app.vercel.arch_pad_pro.twa</div>
                  <div>• Indus Appstore / PhonePe developer certified package</div>
                </div>
              </div>
            )}

            {/* TAB 3: GOVERNANCE & LEGAL */}
            {infoTab === 'governance' && (
              <div className="py-2 space-y-3 text-[11.5px] leading-relaxed text-[var(--text2)]">
                <div className="p-3.5 rounded-xl bg-[#141d2c] border border-[#4f8ef7]/25 text-[#c3d5f5] text-[11px] leading-relaxed">
                  <strong>Data Sovereignty Assertion:</strong> Arch Pad Pro operates on a strict on-device data sovereignty model. Sketches, dimension calibrations, and project workspaces are processed locally in sandboxed storage without telemetry trackers or ad profilers.
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] space-y-1.5 text-[11px]">
                  <div className="font-bold text-white text-[12px]">Publisher & Support</div>
                  <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Publisher Entity</span>
                    <span className="font-semibold text-white">CodeTech App Store</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border)]/50">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Developer</span>
                    <span className="font-semibold text-white">Sheth Sachin D</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Contact</span>
                    <span className="font-semibold text-[#4f8ef7]">codetech.appstore@gmail.com</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (openModal) openModal('privacy-modal');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#4f8ef7]/15 hover:bg-[#4f8ef7]/25 text-[#4f8ef7] text-[11.5px] font-bold transition border border-[#4f8ef7]/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🔒 Open In-App Privacy & Legal Center
                  </button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-2 mt-4 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  if (openModal) openModal('export-modal');
                }}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[var(--bg3)] hover:bg-[var(--bg4)] text-[var(--text)] text-[11px] font-semibold transition border border-[var(--border)] cursor-pointer flex items-center justify-center gap-1.5"
              >
                💾 Export Full Backup
              </button>
              <button
                onClick={closeActiveModal}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#4f8ef7] hover:bg-[#3d7be6] text-white text-[11px] font-semibold transition cursor-pointer flex items-center justify-center"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* PRIVACY POLICY & IN-APP LEGAL CENTER - ZERO BROWSER EXPANSION */}
        {activeModal === 'privacy-modal' && (
          <div className="modal bg-[var(--bg2)] border border-[var(--border2)] rounded-2xl p-6 max-w-[500px] w-[94vw] max-h-[88vh] overflow-y-auto transform transition-all duration-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg shrink-0">
                  🛡
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-white tracking-tight">Privacy & Legal Center</h2>
                  <div className="text-[10px] text-[var(--text3)] font-mono uppercase tracking-[1px] mt-0.5">
                    CODETECH APP STORE · IN-APP DATA GOVERNANCE
                  </div>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-lg bg-[var(--bg3)] hover:bg-[var(--bg4)] flex items-center justify-center text-[var(--text3)] hover:text-white transition text-lg leading-none cursor-pointer border-0 shrink-0"
                onClick={closeActiveModal}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* In-App Tab Switcher */}
            <div className="flex p-1 bg-[var(--bg3)] rounded-xl border border-[var(--border)] my-3.5 text-[11px] font-semibold">
              <button
                onClick={() => setPrivacyTab('privacy')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition text-center cursor-pointer border-0 ${
                  privacyTab === 'privacy'
                    ? 'bg-[var(--bg2)] text-white shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setPrivacyTab('disclaimer')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition text-center cursor-pointer border-0 ${
                  privacyTab === 'disclaimer'
                    ? 'bg-[var(--bg2)] text-amber-400 shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Legal Disclaimer
              </button>
              <button
                onClick={() => setPrivacyTab('terms')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition text-center cursor-pointer border-0 ${
                  privacyTab === 'terms'
                    ? 'bg-[var(--bg2)] text-white shadow-sm border border-[var(--border2)]'
                    : 'bg-transparent text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                Terms of Service
              </button>
            </div>

            {/* TAB 1: PRIVACY POLICY */}
            {privacyTab === 'privacy' && (
              <div className="space-y-3">
                {/* Core Trust Assertion Banner */}
                <div className="p-3.5 rounded-xl bg-[#141d2c] border border-[#4f8ef7]/20 text-[11.5px] leading-relaxed text-[#c3d5f5]">
                  <strong>Data Sovereignty Guarantee:</strong> Arch Pad Pro stores all blueprints, sketches, and dimension data strictly on your physical device. No telemetry, no background ad scripts, and no tracking cookies are transmitted.
                </div>

                {/* Four Concrete Privacy Commitments */}
                <div className="space-y-2.5 my-3">
                  <div className="p-3 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">🔒</span>
                      <span className="text-[11.5px] font-bold text-[var(--text)]">1. Local-Only Storage by Default</span>
                    </div>
                    <p className="text-[11px] text-[var(--text2)] leading-relaxed pl-6">
                      Drawings, metadata, and canvas strokes are saved locally via on-device isolated sandboxed storage. You can sketch entirely offline with zero connectivity.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">🚫</span>
                      <span className="text-[11.5px] font-bold text-[var(--text)]">2. Zero Telemetry & Ad Tracking</span>
                    </div>
                    <p className="text-[11px] text-[var(--text2)] leading-relaxed pl-6">
                      We do not embed third-party advertising SDKs, behavioral tracking pixels, or telemetry profilers. Your architectural ideas remain strictly your property.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">☁</span>
                      <span className="text-[11.5px] font-bold text-[var(--text)]">3. Optional Opt-In Cloud Synchronization</span>
                    </div>
                    <p className="text-[11px] text-[var(--text2)] leading-relaxed pl-6">
                      Google Cloud synchronization is 100% voluntary. It is only initiated if you explicitly authenticate via Google Account to back up sketches across devices.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">📁</span>
                      <span className="text-[11.5px] font-bold text-[var(--text)]">4. Local Export & Direct File Rights</span>
                    </div>
                    <p className="text-[11px] text-[var(--text2)] leading-relaxed pl-6">
                      When you export PNG, PDF, or .archpad backup files, the file is written directly to your device storage or invoked via the native Android sharing intent.
                    </p>
                  </div>
                </div>

                {/* IN-APP EXPANDABLE COMPLETE LEGAL POLICY ARTICLES (ZERO EXTERNAL BROWSER!) */}
                <div className="pt-2">
                  <button
                    onClick={() => setExpandFullPolicy(!expandFullPolicy)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#4f8ef7]/15 hover:bg-[#4f8ef7]/25 text-[#4f8ef7] text-[11.5px] font-bold transition border border-[#4f8ef7]/30 flex items-center justify-between cursor-pointer"
                  >
                    <span>{expandFullPolicy ? '▲ Collapse Policy Articles' : '▼ Expand Complete Legal Policy (In-App)'}</span>
                    <span className="text-[10px] font-mono text-[#4f8ef7]/80">{expandFullPolicy ? 'Close' : 'Read Articles 01–07'}</span>
                  </button>

                  {expandFullPolicy && (
                    <div className="mt-3 p-4 rounded-xl bg-[var(--bg3)]/40 border border-[var(--border)] space-y-3.5 text-[11px] leading-[1.75] text-[var(--text2)]">
                      <div>
                        <div className="font-bold text-white text-[12px] mb-1">01. Overview & Architecture</div>
                        <p>
                          Arch Pad Pro is engineered from the ground up as a standalone, offline-first CAD workstation. All drawing paths, measurements, and project metadata are committed locally to your device&apos;s sandboxed storage. The app requires zero continuous connectivity to provide full sketching, editing, and exporting capabilities.
                        </p>
                      </div>

                      <div>
                        <div className="font-bold text-white text-[12px] mb-1">02. Information We Handle</div>
                        <p>
                          We do not collect personal identifiers, contact books, camera feeds, or location telemetry. All vector paths and layer calculations remain exclusively on your physical hardware. Optional Google Firebase authentication is utilized solely if you explicitly sign in to sync backups to your personal cloud collection.
                        </p>
                      </div>

                      <div>
                        <div className="font-bold text-white text-[12px] mb-1">03. Device Permissions & Purpose</div>
                        <p>
                          <strong>Internet:</strong> Used only for optional user-triggered Google Cloud backup sync.
                          <br />
                          <strong>Storage:</strong> Sandboxed client-side local CAD persistence for project files.
                          <br />
                          <strong>File Downloads:</strong> Invoked when you explicitly export high-definition presentation cards, PNGs, PDFs, or .archpad backups.
                        </p>
                      </div>

                      <div>
                        <div className="font-bold text-white text-[12px] mb-1">04. Third-Party Service Providers</div>
                        <p>
                          No data is traded with commercial brokers. Vercel Inc. delivers initial application shell distribution over TLS HTTPS. Google LLC provides optional Firebase authentication when initiated by the user.
                        </p>
                      </div>

                      <div>
                        <div className="font-bold text-white text-[12px] mb-1">05. Data Deletion Authority</div>
                        <p>
                          You retain full ownership of your data. Deleting any sketch in the app or tapping &quot;Clear Canvas&quot; permanently erases local records. Cloud copies in Firestore are deleted concurrently.
                        </p>
                      </div>

                      <div>
                        <div className="font-bold text-white text-[12px] mb-1">06. Child Privacy Compliance</div>
                        <p>
                          Arch Pad Pro complies with international standards, including COPPA, and does not knowingly collect data from children under 13.
                        </p>
                      </div>

                      <div>
                        <div className="font-bold text-white text-[12px] mb-1">07. Policy Updates & Contact</div>
                        <p>
                          Any regulatory revisions will be published within this app view. Questions can be directed to <strong>codetech.appstore@gmail.com</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Publisher Information */}
                <div className="py-3 border-t border-[var(--border)] text-[11px]">
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Publisher Entity</span>
                    <span className="font-semibold text-[var(--text)]">CodeTech App Store</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Lead Developer</span>
                    <span className="font-semibold text-[var(--text)]">Sheth Sachin D</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Support & Inquiries</span>
                    <a href="mailto:codetech.appstore@gmail.com" className="font-semibold text-[#4f8ef7] hover:underline">
                      codetech.appstore@gmail.com
                    </a>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-[var(--text3)] font-mono text-[10px]">Package ID</span>
                    <span className="font-mono text-[10px] text-[var(--text2)]">app.vercel.arch_pad_pro.twa</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LEGAL DISCLAIMER */}
            {privacyTab === 'disclaimer' && (
              <div className="py-1 space-y-3.5 text-[11.5px] leading-[1.8] text-[var(--text2)]">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200">
                  <div className="flex items-center gap-2 font-bold text-[12px] text-amber-300 mb-1">
                    <span>⚠️</span>
                    <span>Architectural & Structural Engineering Disclaimer</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    Arch Pad Pro is designed as a conceptual drafting, planning, and preliminary dimensioning tool for creative and spatial design. All measurements, scale ratios, calculations, and architectural drawings produced with this application must be independently verified, certified, and stamped by a licensed architect or qualified structural engineer prior to physical building, structural fabrication, or statutory municipal permit submission.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] space-y-2">
                  <div className="font-bold text-white text-[12px]">Warranty Limitation & &apos;As Is&apos; Provision</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    This software is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranty of any kind, whether express, statutory, or implied, including but not limited to the implied warranties of merchantability, fitness for a particular architectural use, and non-infringement. CodeTech App Store does not warrant that drawing operations will be uninterrupted, error-free, or compatible with all third-party CAD suites.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] space-y-2">
                  <div className="font-bold text-white text-[12px]">User Intellectual Property Sovereignty</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    You retain 100% exclusive intellectual property, copyright, and commercial ownership over all blueprints, sketches, CAD stamp layouts, and vector notes authored within Arch Pad Pro. The software publisher asserts zero ownership or licensing rights over your user-created content.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)] space-y-2">
                  <div className="font-bold text-white text-[12px]">Local Storage & Data Backup Responsibility</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    Sketches and workspace states are stored locally on your device. CodeTech App Store cannot restore data lost due to device hardware damage, factory operating system resets, or browser storage wipes. Users are strongly urged to utilize the built-in &quot;.archpad&quot; backup utility on a regular schedule.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: TERMS OF SERVICE */}
            {privacyTab === 'terms' && (
              <div className="py-1 space-y-3.5 text-[11.5px] leading-[1.75] text-[var(--text2)]">
                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)]">
                  <div className="font-bold text-white text-[12px] mb-1">01. Permitted Use</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    Arch Pad Pro is licensed for professional, educational, and personal architectural CAD sketching, dimensioning, and conceptual drafting. You are permitted to export, publish, and commercially distribute drawings generated with the software.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)]">
                  <div className="font-bold text-white text-[12px] mb-1">02. Software License</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    CodeTech App Store grants you a non-exclusive, personal, non-transferable license to execute Arch Pad Pro in standalone or web modes in accordance with these terms.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg3)]/50 border border-[var(--border)]">
                  <div className="font-bold text-white text-[12px] mb-1">03. Jurisdiction & Entity</div>
                  <p className="text-[11px] text-[var(--text3)] leading-relaxed">
                    These terms are governed by applicable software distribution regulations. For legal inquiries, contact <strong>codetech.appstore@gmail.com</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* In-App Close Action */}
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <button
                onClick={closeActiveModal}
                className="w-full py-2.5 px-3 rounded-lg bg-[var(--bg3)] hover:bg-[var(--bg4)] text-[var(--text)] text-[11.5px] font-semibold transition border border-[var(--border)] cursor-pointer text-center"
              >
                Close Legal Center
              </button>
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
