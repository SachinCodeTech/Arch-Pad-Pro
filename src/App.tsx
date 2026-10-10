import React, { useEffect, useRef, useState } from 'react';
import Splash from './components/Splash';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import Toolbar from './components/Toolbar';
import Modals from './components/Modals';
import Toast from './components/Toast';

import { Project, ToolType, ThemeType } from './types';
import {
  getLocalProjects,
  saveLocalProject,
  getLocalProject,
  deleteLocalProject,
  getLocalDrawing,
  saveLocalDrawing,
  getSyncQueue,
  removeSyncQueueItem
} from './lib/db';
import {
  auth,
  logInWithGoogle,
  logOutFromGoogle,
  getCloudProjects,
  uploadProjectToCloud,
  getCloudDrawing,
  deleteProjectFromCloud
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const APP_ICON_SVG = '/icon.svg';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTool, setTool] = useState<ToolType>('pen');
  const [pencilSize, setPencilSize] = useState<number>(2);
  const [pencilColor, setPencilColor] = useState<string>('#1a1a1a');
  const [gridVisible, setGridVisible] = useState<boolean>(false);
  const [currentScale, setScale] = useState<string>('1:100');
  const [theme, setTheme] = useState<ThemeType>('dark');

  // Multi-store tracking
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [currentProject, setCurrentProject] = useState<string>('Sketch 1');

  // Firebase auth & syncing concepts
  const [user, setUser] = useState<User | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Auto-save badges
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'none'>('none');
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Canvas context refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse / Drawing State Engine Variables
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInputState, setTextInputState] = useState({
    visible: false,
    x: 0,
    y: 0,
    value: ''
  });

  // History buffer
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Undo/Redo/Save drawing limits
  const startPoints = useRef({ x: 0, y: 0 });
  const previewData = useRef<ImageData | null>(null);

  // Active Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [storageUsedInfo, setStorageUsedInfo] = useState<string>('~10 KB');

  // Toast Alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'success' | 'info' | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // PWA Prompt Info
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);

  // High-performance Zoom and Panning offsets
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isPanning = useRef<boolean>(false);
  const startPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Network and Offline Sync tracking
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Stroke rollback buffer to eliminate accidental dots and line segments when pinch-gestures start
  const activeStrokeRollback = useRef<ImageData | null>(null);

  const cancelCurrentStroke = () => {
    if (isDrawing || isPanning.current || previewData.current) {
      setIsDrawing(false);
      isPanning.current = false;
      previewData.current = null;
      if (activeStrokeRollback.current && offscreenCanvasRef.current) {
        const oCtx = offscreenCanvasRef.current.getContext('2d');
        if (oCtx) {
          oCtx.putImageData(activeStrokeRollback.current, 0, 0);
        }
      }
      activeStrokeRollback.current = null;
      redrawVisibleCanvas();
    }
  };

  const showToast = (msg: string, stat: 'success' | 'info' | null = null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastStatus(stat);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Listen to PWA installation prompts
  useEffect(() => {
    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
  }, []);

  // Monitor connectivity: Use IndexedDB to sync local changes when network connection is restored
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showToast('Network restored. Synchronizing offline changes...', 'info');

      try {
        const syncQueue = await getSyncQueue();
        if (syncQueue.length > 0 && user) {
          setIsCloudSyncing(true);
          for (const item of syncQueue) {
            try {
              if (item.action === 'upsert') {
                const proj = await getLocalProject(item.id);
                const drawing = await getLocalDrawing(item.id);
                if (proj) {
                  await uploadProjectToCloud(user.uid, proj, drawing);
                  await removeSyncQueueItem(item.id);
                }
              } else if (item.action === 'delete') {
                await deleteProjectFromCloud(item.id);
                await removeSyncQueueItem(item.id);
              }
            } catch (itemErr) {
              console.warn(`Sync queue item ${item.id} deferred:`, itemErr);
            }
          }
          await triggerCloudSynchronize(user.uid);
          showToast('Offline changes synchronized with Google Cloud ✓', 'success');
        } else if (user) {
          await triggerCloudSynchronize(user.uid);
        } else if (syncQueue.length > 0) {
          showToast(`${syncQueue.length} offline changes stored securely in IndexedDB.`, 'info');
        }
      } catch (err) {
        console.warn('Auto-sync on reconnect error:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode — Changes will be stored in IndexedDB.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Listen to auth state changed
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        showToast(`Signed in successfully!`, 'success');
        triggerCloudSynchronize(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // 1. Initial workspace Load
  useEffect(() => {
    const fetchLocal = async () => {
      try {
        const loadedProjects = await getLocalProjects();
        const normalized: Record<string, Project> = {};
        
        if (loadedProjects.length === 0) {
          // Initialize first default sketch
          const defaultProject: Project = {
            id: 'Sketch_1',
            name: 'Sketch 1',
            created: Date.now(),
            modified: Date.now(),
            scale: '1:100'
          };
          await saveLocalProject(defaultProject);
          normalized[defaultProject.name] = defaultProject;
          setProjects(normalized);
          setCurrentProject(defaultProject.name);
          localStorage.setItem('voxpad_current', defaultProject.name);
        } else {
          loadedProjects.forEach((p) => {
            normalized[p.name] = p;
          });
          setProjects(normalized);
          const lastUsed = localStorage.getItem('voxpad_current') || loadedProjects[0].name;
          setCurrentProject(normalized[lastUsed] ? lastUsed : loadedProjects[0].name);
        }

        // Load Theme settings
        const loadedTheme = (localStorage.getItem('voxpad_theme') as ThemeType) || 'dark';
        setTheme(loadedTheme);

        // Service Worker dynamic registration
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
          });
        }
      } catch (err) {
        console.error('Error opening local database stores:', err);
      }
    };
    fetchLocal();
  }, []);

  // Triggered when App is fully ready
  const handleSplashComplete = () => {
    setAppReady(true);
    triggerPreserveResize();
    updateStorageUsageCount();
  };

  // Periodic autosave monitoring
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      handleSilentAutoSave();
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [currentProject, projects]);

  // Synchronously redraw the visible canvas elements (drawing and background grid) when pan, zoom, grid, or theme changes
  useEffect(() => {
    if (appReady) {
      redrawVisibleCanvas();
      if (gridVisible) {
        drawBgCADGrid();
      } else {
        clearBgCADGrid();
      }
    }
  }, [zoom, panOffset, gridVisible, theme, appReady]);

  // Adjust document body theme styling
  useEffect(() => {
    document.body.className = (theme === 'light' ? 'light-mode ' : '') + (currentTool === 'text' ? 'text-tool' : '');
    localStorage.setItem('voxpad_theme', theme);
  }, [theme, currentTool]);

  // Handle canvas sizing / resize callbacks safely
  useEffect(() => {
    const handleResize = () => {
      triggerPreserveResize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentProject]);

  // Sync canvas drawing image with current project change
  useEffect(() => {
    if (appReady) {
      loadSelectedProjectDrawing();
    }
  }, [currentProject, appReady]);

  const initOffscreenCanvas = () => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 3000;
      offscreenCanvasRef.current.height = 2000;
      const oCtx = offscreenCanvasRef.current.getContext('2d');
      if (oCtx) {
        oCtx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
        oCtx.fillRect(0, 0, 3000, 2000);
      }
    }
  };

  const redrawVisibleCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the screen canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Translate and Scale zoom
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    if (offscreenCanvasRef.current) {
      const w = offscreenCanvasRef.current.width;
      const h = offscreenCanvasRef.current.height;

      // Add a subtle border/shadow for the drafting sheet, making it look incredibly realistic!
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 6;

      ctx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
      ctx.fillRect(0, 0, w, h);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw client artwork
      ctx.drawImage(offscreenCanvasRef.current, 0, 0);
    }
    ctx.restore();
  };

  const loadSelectedProjectDrawing = async () => {
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    // Reset offscreen to solid white/light background
    oCtx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
    oCtx.fillRect(0, 0, oCanvas.width, oCanvas.height);

    setHistory([]);
    setHistoryIndex(-1);

    const matchProj = projects[currentProject];
    if (matchProj) {
      setScale(matchProj.scale);
      const cached = await getLocalDrawing(matchProj.id);
      if (cached) {
        const img = new Image();
        img.onload = () => {
          oCtx.drawImage(img, 0, 0);
          takeSnapSnapshot();
          redrawVisibleCanvas();
        };
        img.src = cached;
      } else {
        takeSnapSnapshot();
        redrawVisibleCanvas();
      }
    } else {
      takeSnapSnapshot();
      redrawVisibleCanvas();
    }
  };

  const triggerPreserveResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent || !parent.clientWidth || !parent.clientHeight) return;

    // Simply resize screen canvas to fill parent viewport
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    // Resize grid canvas too
    if (gridCanvasRef.current) {
      gridCanvasRef.current.width = canvas.width;
      gridCanvasRef.current.height = canvas.height;
      if (gridVisible) drawBgCADGrid();
    }

    // Direct redraw from stable offscreen canvas
    redrawVisibleCanvas();
  };

  // Background CAD GRID drawings (dynamic panning and zooming infinite grids)
  const drawBgCADGrid = () => {
    const gc = gridCanvasRef.current;
    if (!gc) return;
    const gCtx = gc.getContext('2d');
    if (!gCtx) return;

    gCtx.clearRect(0, 0, gc.width, gc.height);
    const sz = 30 * zoom; 
    if (sz < 5) return; // prevent zero/tiny division infinite loops

    // Small grids
    gCtx.strokeStyle = 'rgba(100, 120, 200, 0.15)';
    gCtx.lineWidth = 0.5;
    const startX = panOffset.x % sz;
    for (let x = startX; x <= gc.width; x += sz) {
      gCtx.beginPath();
      gCtx.moveTo(x, 0);
      gCtx.lineTo(x, gc.height);
      gCtx.stroke();
    }
    const startY = panOffset.y % sz;
    for (let y = startY; y <= gc.height; y += sz) {
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.lineTo(gc.width, y);
      gCtx.stroke();
    }

    // Heavy main axes
    const heavySz = sz * 5;
    gCtx.strokeStyle = 'rgba(100, 120, 200, 0.25)';
    gCtx.lineWidth = 0.8;
    const hStartX = panOffset.x % heavySz;
    for (let x = hStartX; x <= gc.width; x += heavySz) {
      gCtx.beginPath();
      gCtx.moveTo(x, 0);
      gCtx.lineTo(x, gc.height);
      gCtx.stroke();
    }
    const hStartY = panOffset.y % heavySz;
    for (let y = hStartY; y <= gc.height; y += heavySz) {
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.lineTo(gc.width, y);
      gCtx.stroke();
    }
  };

  const clearBgCADGrid = () => {
    const gc = gridCanvasRef.current;
    if (!gc) return;
    const gCtx = gc.getContext('2d');
    if (!gCtx) return;
    gCtx.clearRect(0, 0, gc.width, gc.height);
  };

  // Draw History Snapshots logic from offscreen canvas
  const takeSnapSnapshot = () => {
    initOffscreenCanvas();
    const canvas = offscreenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width === 0 || canvas.height === 0) return;

    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, snap];
      if (updated.length > 50) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => {
      const nextIndex = Math.min(historyIndex + 1, 49);
      return nextIndex;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      if (offscreenCanvasRef.current) {
        const oCtx = offscreenCanvasRef.current.getContext('2d');
        if (oCtx && history[prevIndex]) {
          oCtx.putImageData(history[prevIndex], 0, 0);
          redrawVisibleCanvas();
          triggerQuickAutoSaveDelay();
        }
      }
    } else {
      showToast('Nothing to undo');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      if (offscreenCanvasRef.current) {
        const oCtx = offscreenCanvasRef.current.getContext('2d');
        if (oCtx && history[nextIndex]) {
          oCtx.putImageData(history[nextIndex], 0, 0);
          redrawVisibleCanvas();
          triggerQuickAutoSaveDelay();
        }
      }
    } else {
      showToast('Nothing to redo');
    }
  };

  // Drawing event coordinate mapping helpers representing high-performance zooming and panning offsets
  const getPointerPos = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    // Always map relative to the untransformed viewport container wrap element to prevent scale circular dependency
    const parent = canvas.closest('#canvas-wrap') || canvas.parentElement || canvas;
    const rect = parent.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    const nativeEvent = e.nativeEvent;
    if ('touches' in nativeEvent) {
      if (nativeEvent.touches.length > 0) {
        clientX = nativeEvent.touches[0].clientX;
        clientY = nativeEvent.touches[0].clientY;
      } else if (nativeEvent.changedTouches.length > 0) {
        clientX = nativeEvent.changedTouches[0].clientX;
        clientY = nativeEvent.changedTouches[0].clientY;
      }
    } else if (e.type.startsWith('pointer') || e.type.startsWith('mouse')) {
      const ev = e as React.PointerEvent<HTMLCanvasElement>;
      clientX = ev.clientX;
      clientY = ev.clientY;
    }

    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    return {
      x: (cx - panOffset.x) / zoom,
      y: (cy - panOffset.y) / zoom
    };
  };

  // 2. CANVAS DRAWING CODES
  const onPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (sidebarOpen) setSidebarOpen(false);

    const nativeEvent = e.nativeEvent;
    
    // Prevent zoom/pinch gestures from triggering stray line drawing
    const hasMultipleTouches = 
      ('touches' in nativeEvent && nativeEvent.touches.length > 1) || 
      ((nativeEvent as any).touches && (nativeEvent as any).touches.length > 1);
    if (hasMultipleTouches) {
      cancelCurrentStroke();
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    // Capture the pointer stream to keep receiving events even if dragged off canvas borders
    if ('pointerId' in e) {
      try {
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    // If 'pan' tool mode is active, handle custom canvas pan offset navigation
    if (currentTool === 'pan') {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in nativeEvent) {
        if (nativeEvent.touches.length > 0) {
          clientX = nativeEvent.touches[0].clientX;
          clientY = nativeEvent.touches[0].clientY;
        }
      } else {
        const ev = e as React.PointerEvent<HTMLCanvasElement>;
        clientX = ev.clientX;
        clientY = ev.clientY;
      }
      isPanning.current = true;
      startPanPos.current = { x: clientX, y: clientY };
      initialPanOffset.current = { ...panOffset };
      return;
    }

    const { x, y } = getPointerPos(e);

    if (currentTool === 'text') {
      setTextInputState({
        visible: true,
        x,
        y,
        value: ''
      });
      return;
    }

    setIsDrawing(true);
    startPoints.current = { x, y };

    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    // Snapshot pre-stroke canvas state so any accidental mark can be rolled back if a 2-finger gesture starts
    activeStrokeRollback.current = oCtx.getImageData(0, 0, oCanvas.width, oCanvas.height);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      takeSnapSnapshot();
      oCtx.beginPath();
      oCtx.arc(
        x,
        y,
        pencilSize * (currentTool === 'eraser' ? 1.5 : 0.5),
        0,
        Math.PI * 2
      );
      
      const isLight = theme === 'light';
      oCtx.fillStyle = currentTool === 'eraser' ? (isLight ? '#ffffff' : '#fafaf8') : pencilColor;
      oCtx.fill();

      redrawVisibleCanvas();
    } else {
      previewData.current = {} as ImageData; // truthy placeholder
    }
  };

  const onPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const nativeEvent = e.nativeEvent;
    
    // Prevent zoom/pinch gestures from triggering stray line drawing
    const hasMultipleTouches = 
      ('touches' in nativeEvent && nativeEvent.touches.length > 1) || 
      ((nativeEvent as any).touches && (nativeEvent as any).touches.length > 1);
    if (hasMultipleTouches) {
      cancelCurrentStroke();
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    // Incorporate dynamic desktop/touch pointer drag updates for active map pan tool navigation
    if (currentTool === 'pan') {
      if (!isPanning.current) return;
      let clientX = 0;
      let clientY = 0;
      if ('touches' in nativeEvent) {
        if (nativeEvent.touches.length > 0) {
          clientX = nativeEvent.touches[0].clientX;
          clientY = nativeEvent.touches[0].clientY;
        }
      } else {
        const ev = e as React.PointerEvent<HTMLCanvasElement>;
        clientX = ev.clientX;
        clientY = ev.clientY;
      }
      const dx = clientX - startPanPos.current.x;
      const dy = clientY - startPanPos.current.y;
      setPanOffset({
        x: initialPanOffset.current.x + dx,
        y: initialPanOffset.current.y + dy
      });
      return;
    }

    if (!isDrawing) return;
    const { x, y } = getPointerPos(e);
    
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    if (currentTool === 'pen') {
      oCtx.beginPath();
      oCtx.moveTo(startPoints.current.x, startPoints.current.y);
      oCtx.lineTo(x, y);
      oCtx.lineWidth = pencilSize;
      oCtx.lineCap = 'round';
      oCtx.lineJoin = 'round';
      oCtx.strokeStyle = pencilColor;
      oCtx.stroke();
      startPoints.current = { x, y };

      redrawVisibleCanvas();
    } else if (currentTool === 'eraser') {
      oCtx.beginPath();
      oCtx.moveTo(startPoints.current.x, startPoints.current.y);
      oCtx.lineTo(x, y);
      oCtx.lineWidth = pencilSize * 3;
      oCtx.lineCap = 'round';
      oCtx.lineJoin = 'round';
      
      const bgHex = theme === 'light' ? '#ffffff' : '#fafaf8';
      oCtx.strokeStyle = bgHex;
      oCtx.stroke();
      startPoints.current = { x, y };

      redrawVisibleCanvas();
    } else if (previewData.current) {
      // Direct shapes preview: clear and draw base offscreen drawing, then active shape outline
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          redrawVisibleCanvas();
          // Draw previewing shape in screen coordinate space
          const screenStartX = startPoints.current.x * zoom + panOffset.x;
          const screenStartY = startPoints.current.y * zoom + panOffset.y;
          const screenEndX = x * zoom + panOffset.x;
          const screenEndY = y * zoom + panOffset.y;
          drawVectorShape(ctx, currentTool, screenStartX, screenStartY, screenEndX, screenEndY, pencilSize * zoom);
        }
      }
    }
  };

  const onPointerUp = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (e.cancelable) {
      e.preventDefault();
    }

    // Release the pointer capture safely
    if ('pointerId' in e) {
      try {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (currentTool === 'pan') {
      isPanning.current = false;
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    if (currentTool !== 'pen' && currentTool !== 'eraser') {
      const { x, y } = getPointerPos(e);
      if (previewData.current) {
        // Create rollback snapshot BEFORE shape is burned
        takeSnapSnapshot();
        // Permanently draw shape in world coordinate space
        drawVectorShape(oCtx, currentTool, startPoints.current.x, startPoints.current.y, x, y);
        previewData.current = null;
        redrawVisibleCanvas();
      }
    }
    activeStrokeRollback.current = null;
    triggerQuickAutoSaveDelay();
  };

  const drawVectorShape = (
    ctx: CanvasRenderingContext2D,
    type: ToolType,
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    customWidth?: number
  ) => {
    ctx.strokeStyle = pencilColor;
    ctx.lineWidth = customWidth !== undefined ? customWidth : pencilSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    if (type === 'line') {
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    } else if (type === 'rect') {
      ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    } else if (type === 'circle') {
      const rx = Math.abs(ex - sx) / 2;
      const ry = Math.abs(ey - sy) / 2;
      ctx.ellipse((sx + ex) / 2, (sy + ey) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'arrow') {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 2) return;
      const angle = Math.atan2(dy, dx);
      const strokeW = customWidth !== undefined ? customWidth : pencilSize;
      const hw = Math.max(8, strokeW * 4);
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - hw * Math.cos(angle - Math.PI / 6),
        ey - hw * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - hw * Math.cos(angle + Math.PI / 6),
        ey - hw * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }
  };

  // Annotation text tool finalize logic
  const handleCommitText = (text: string) => {
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (oCanvas && text) {
      const oCtx = oCanvas.getContext('2d');
      if (oCtx) {
        takeSnapSnapshot();
        oCtx.font = `${Math.max(12, pencilSize * 3)}px 'JetBrains Mono', monospace`;
        oCtx.fillStyle = pencilColor;
        oCtx.fillText(text, textInputState.x, textInputState.y);
        redrawVisibleCanvas();
        triggerQuickAutoSaveDelay();
      }
    }
    setTextInputState({ visible: false, x: 0, y: 0, value: '' });
  };

  // Theme Settings toggler
  const handleSetTheme = (t: ThemeType) => {
    setTheme(t);
  };

  // Fullscreen support helper
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Clean Workspace Clear triggers
  const handleClearCanvasNow = () => {
    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (oCanvas) {
      const oCtx = oCanvas.getContext('2d');
      if (oCtx) {
        takeSnapSnapshot();
        oCtx.fillStyle = theme === 'light' ? '#ffffff' : '#fafaf8';
        oCtx.fillRect(0, 0, oCanvas.width, oCanvas.height);
        redrawVisibleCanvas();
        showToast('Draft space cleared');
        triggerQuickAutoSaveDelay();
      }
    }
  };

  // 3. SAVES & SYSTEM SYNCS
  const triggerQuickAutoSaveDelay = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSilentAutoSave();
    }, 4000);
  };

  const handleSilentAutoSave = async () => {
    initOffscreenCanvas();
    const canvas = offscreenCanvasRef.current || canvasRef.current;
    if (!canvas) return;

    setAutoSaveStatus('saving');
    try {
      const matchProj = projects[currentProject];
      if (matchProj) {
        const dataUrl = canvas.toDataURL();
        await saveLocalDrawing(matchProj.id, dataUrl);
        
        // Update project last modified time
        const updatedProj: Project = {
          ...matchProj,
          modified: Date.now()
        };
        await saveLocalProject(updatedProj);
        setProjects((prev) => ({
          ...prev,
          [currentProject]: updatedProj
        }));

        // Back up to Cloud instantly if user is logged in and network is active
        if (user && navigator.onLine) {
          try {
            await uploadProjectToCloud(user.uid, updatedProj, dataUrl);
            await removeSyncQueueItem(updatedProj.id);
          } catch (cloudErr) {
            console.warn('Cloud sync deferred to sync queue:', cloudErr);
          }
        }

        setAutoSaveStatus('saved');
        updateStorageUsageCount();
        setTimeout(() => setAutoSaveStatus('none'), 2000);
      }
    } catch (err) {
      console.warn('Autosave delayed:', err);
      setAutoSaveStatus('none');
    }
  };

  const handleSaveProjectManually = () => {
    handleSilentAutoSave();
    showToast('Project saved successfully ✓', 'success');
  };

  // Local Storage KB calculations
  const updateStorageUsageCount = async () => {
    try {
      let bytes = 0;
      const local = await getLocalProjects();
      for (const p of local) {
        const raw = await getLocalDrawing(p.id);
        bytes += raw.length;
      }
      setStorageUsedInfo(`~${(bytes / 1024).toFixed(1)} KB`);
    } catch (e) {
      setStorageUsedInfo('~15 KB');
    }
  };

  // 4. PROJECT CRUD ACTIONS
  const handleSwitchProject = async (name: string) => {
    if (name === currentProject) return;
    await handleSilentAutoSave(); // Save current project first

    setCurrentProject(name);
    localStorage.setItem('voxpad_current', name);
    showToast(`Loaded "${name}" Successfully!`, 'success');
  };

  const handleCreateNewProject = async (name: string) => {
    if (projects[name]) {
      showToast('Project name already exists!');
      return;
    }
    await handleSilentAutoSave(); // Save current first

    const rawId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newProj: Project = {
      id: rawId,
      name,
      created: Date.now(),
      modified: Date.now(),
      scale: '1:100'
    };

    await saveLocalProject(newProj);
    setProjects((prev) => ({
      ...prev,
      [name]: newProj
    }));

    setCurrentProject(name);
    localStorage.setItem('voxpad_current', name);
    showToast(`Created Project "${name}"`, 'success');
  };

  const handleDeleteProject = async (id: string) => {
    const found = Object.keys(projects)
      .map((k) => projects[k])
      .find((p) => p.id === id);
    if (!found) return;

    if (Object.keys(projects).length <= 1) {
      showToast('Cannot delete your last project. Create a new one first!');
      return;
    }

    try {
      // Delete Cloud references if online + logged in
      if (user) {
        await deleteProjectFromCloud(id);
      }

      await deleteLocalProject(id);
      
      setProjects((prev) => {
        const copied = { ...prev };
        delete copied[found.name];
        return copied;
      });

      if (currentProject === found.name) {
        const keys = Object.keys(projects).filter((k) => k !== found.name);
        setCurrentProject(keys[0]);
        localStorage.setItem('voxpad_current', keys[0]);
      }

      showToast(`Deleted "${found.name}"`, 'success');
      updateStorageUsageCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameProject = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('Project name cannot be empty');
      return;
    }

    if (projects[trimmed] && trimmed.toLowerCase() !== oldName.toLowerCase()) {
      showToast(`A project named "${trimmed}" already exists.`);
      return;
    }

    const matchedProj = projects[oldName];
    if (!matchedProj) return;

    try {
      const updatedProj = { ...matchedProj, name: trimmed, modified: Date.now() };
      
      // Save updated project locally
      await saveLocalProject(updatedProj);

      // Save to Cloud instantly if logged in
      if (user) {
        initOffscreenCanvas();
        const canvas = offscreenCanvasRef.current || canvasRef.current;
        const dataUrl = canvas ? canvas.toDataURL() : '';
        await uploadProjectToCloud(user.uid, updatedProj, dataUrl);
      }

      setProjects((prev) => {
        const copied = { ...prev };
        delete copied[oldName];
        copied[trimmed] = updatedProj;
        return copied;
      });

      if (currentProject === oldName) {
        setCurrentProject(trimmed);
        localStorage.setItem('voxpad_current', trimmed);
      }

      showToast(`Renamed project to "${trimmed}"`, 'success');
    } catch (err) {
      console.error('Rename failed:', err);
      showToast('Error renaming project');
    }
  };

  const handleSetScale = (scale: string) => {
    setScale(scale);
    const p = projects[currentProject];
    if (p) {
      const updatedProj = { ...p, scale, modified: Date.now() };
      saveLocalProject(updatedProj).then(() => {
        setProjects((prev) => ({ ...prev, [currentProject]: updatedProj }));
        triggerQuickAutoSaveDelay();
        showToast(`Scale updated: ${scale}`, 'success');
      });
    }
  };

  const handleImportBackup = async (backupData: any) => {
    try {
      for (const id in backupData) {
        const item = backupData[id];
        if (item.meta && item.canvas) {
          const importedProject: Project = {
            id: item.meta.id || `proj_imported_${Date.now()}`,
            name: item.meta.name || 'Imported Sketch',
            created: item.meta.created || Date.now(),
            modified: Date.now(),
            scale: item.meta.scale || '1:100'
          };
          await saveLocalProject(importedProject);
          await saveLocalDrawing(importedProject.id, item.canvas);
        }
      }

      // Re-read local db directories list
      const loadedProjects = await getLocalProjects();
      const normalized: Record<string, Project> = {};
      loadedProjects.forEach((p) => {
        normalized[p.name] = p;
      });
      setProjects(normalized);
      setCurrentProject(loadedProjects[0].name);

      showToast('Backup Restored Successfully!', 'success');
      updateStorageUsageCount();
    } catch (e) {
      showToast('Error importing .voxpad backup file.');
    }
  };

  // Google Synchronizations
  const handleSignIn = async () => {
    try {
      await logInWithGoogle();
    } catch (e) {
      showToast('Credential popup cancelled.');
    }
  };

  const handleSignOut = async () => {
    await logOutFromGoogle();
    showToast('Logged out successfully.');
  };

  const triggerCloudSynchronize = async (userId: string) => {
    setIsCloudSyncing(true);
    try {
      // Fetch cloud metadata
      const cloudList = await getCloudProjects(userId);
      const localList = await getLocalProjects();

      // Simple sync conflict resolution strategy (newest timestamp wins)
      for (const localP of localList) {
        const cloudP = cloudList.find((cp) => cp.id === localP.id);
        const localDraw = await getLocalDrawing(localP.id);

        if (!cloudP) {
          // Local only - sync up
          await uploadProjectToCloud(userId, localP, localDraw);
        } else if (localP.modified > cloudP.modified) {
          // Local is newer - sync up
          await uploadProjectToCloud(userId, localP, localDraw);
        } else if (cloudP.modified > localP.modified) {
          // Cloud is newer - sync down
          const cloudDraw = await getCloudDrawing(cloudP.id);
          await saveLocalProject(cloudP);
          await saveLocalDrawing(cloudP.id, cloudDraw);
        }
      }

      // Any cloud projects that don't exist locally? Sync down
      for (const cloudP of cloudList) {
        const localP = localList.find((lp) => lp.id === cloudP.id);
        if (!localP) {
          const cloudDraw = await getCloudDrawing(cloudP.id);
          await saveLocalProject(cloudP);
          await saveLocalDrawing(cloudP.id, cloudDraw);
        }
      }

      // Refresh project records React context
      const freshLocal = await getLocalProjects();
      const normalized: Record<string, Project> = {};
      freshLocal.forEach((p) => {
        normalized[p.name] = p;
      });
      setProjects(normalized);
      if (normalized[currentProject]) {
        // Redraw current
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          const cached = await getLocalDrawing(normalized[currentProject].id);
          if (cached) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              takeSnapSnapshot();
            };
            img.src = cached;
          }
        }
      }

      showToast('Cloud database synchronized securely!', 'success');
    } catch (err) {
      console.warn('Sync delayed:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const triggerForceCloudSync = () => {
    if (user) {
      triggerCloudSynchronize(user.uid);
    } else {
      showToast('Sign in with Google to synchronize drawings!');
    }
  };

  // Native share sheet handles
  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `${currentProject}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Sketch plan of ${currentProject}`,
              text: `Check out my drafting plans on Arch Pad Sketchbook!`
            });
          } else {
            await navigator.share({
              title: `Architectural sketch: ${currentProject}`,
              text: 'Uploaded from my local PWA drafting client.'
            });
          }
        });
      } catch (err) {
        // Standard user cancellation fallback download
        handleTriggerWebDownload();
      }
    } else {
      handleTriggerWebDownload();
    }
  };

  const handleTriggerWebDownload = () => {
    initOffscreenCanvas();
    const canvas = offscreenCanvasRef.current || canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${currentProject}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Image exported as PNG');
    }
  };

  const handleTriggerInstall = () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          showToast('App added standalone local!', 'success');
        }
        setPwaPrompt(null);
      });
    } else {
      setActiveModal('info-modal');
      showToast('To install, open Safari menu and select "Add to Home Screen"!', 'info');
    }
  };

  return (
    <>
      <Splash onComplete={handleSplashComplete} appIconSvg={APP_ICON_SVG} />

      <div id="app" className={`flex flex-col w-[100vw] h-[100svh] overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-all ${
        appReady ? 'ready opacity-100' : 'opacity-0 scale-98 pointer-events-none'
      }`} style={{ visibility: appReady ? 'visible' : 'hidden' }}>
        
        {/* HEADER AREA */}
        <div id="header" className="h-[52px] min-h-[52px] bg-[var(--bg2)] border-b border-[var(--border)] flex items-center justify-between p-[0_10px_0_6px] gap-1.5 shrink-0 relative z-[100] select-none">
          <div className="header-left flex items-center gap-1.5 shrink-0 min-w-0">
            <button
              id="app-icon-btn"
              onClick={() => setSidebarOpen(true)}
              className="w-[36px] h-[36px] rounded-[10px] overflow-hidden border-none bg-none cursor-pointer p-0 shrink-0 transition hover:scale-[1.06] hover:shadow-[0_0_12px_rgba(79,142,247,0.4)]"
            >
              <img src={APP_ICON_SVG} alt="Menu" className="w-full h-full block" />
            </button>
            <div className="app-wordmark text-[19px] font-[800] tracking-[-0.5px] whitespace-nowrap shrink-0 leading-none bg-gradient-to-r from-[#4f8ef7] to-[#7c5cf7] bg-clip-text text-transparent font-sans">
              Arch Pad
            </div>
            <div className="project-select-wrap flex items-center gap-[5px] shrink-1 min-w-0">
               <select
                 id="project-select"
                 title="Switch project"
                 className="bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-mono text-[10px] p-[4px_6px] rounded-[6px] outline-none cursor-pointer max-w-[124px] min-w-[50px] truncate font-bold"
                 value={currentProject}
                 onChange={(e) => handleSwitchProject(e.target.value)}
               >
                 {Object.keys(projects).map((k) => (
                   <option key={k} value={k} className="bg-[var(--bg3)] text-[var(--text)] font-mono font-normal">
                     {k}
                   </option>
                 ))}
               </select>
               <button
                 title="New Sketch"
                 className="hdr-btn bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-sans text-[10px] font-bold p-[4px_8px] rounded-[6px] cursor-pointer hover:bg-[var(--bg4)] transition select-none flex items-center justify-center h-[24px]"
                 onClick={() => setActiveModal('new-project-modal')}
               >
                 ＋
               </button>
             </div>
          </div>

          <div className="header-right flex items-center gap-1.5 shrink-0">
            {/* Offline or Syncing status badge */}
            {!isOnline && (
              <span
                title="Working in offline mode. Changes are automatically saved to IndexedDB and will sync once reconnected."
                className="bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-bold px-2 py-1 rounded-[6px] select-none flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                OFFLINE
              </span>
            )}
            {isOnline && isCloudSyncing && (
              <span
                className="bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-[9px] font-bold px-2 py-1 rounded-[6px] select-none flex items-center gap-1 animate-pulse"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                SYNCING…
              </span>
            )}

            {/* Native Install Prompt Indicator */}
            {pwaPrompt && (
              <button
                onClick={handleTriggerInstall}
                className="hdr-btn bg-gradient-to-r from-[#4f8ef7]/20 to-[#7c5cf7]/20 border border-[#7c5cf7]/40 text-[#4f8ef7] font-semibold text-[10px] p-[5px_8px] rounded-[6px] cursor-pointer"
              >
                📥 Install
              </button>
            )}
            <button
              className="hdr-btn bg-[var(--bg3)] border border-[var(--border2)] text-[var(--text)] font-mono text-[10px] font-bold p-[5px_8px] rounded-[6px] cursor-pointer hover:bg-[var(--bg4)]"
              onClick={handleToggleFullscreen}
            >
              ⛶
            </button>
          </div>
        </div>

        {/* WORKSPACE & CANVAS AREA */}
        <CanvasArea
          canvasRef={canvasRef}
          gridCanvasRef={gridCanvasRef}
          currentTool={currentTool}
          gridVisible={gridVisible}
          currentScale={currentScale}
          autoSaveStatus={autoSaveStatus}
          textInputState={textInputState}
          setTextInputState={setTextInputState}
          onCommitText={handleCommitText}
          pencilSize={pencilSize}
          pencilColor={pencilColor}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          zoom={zoom}
          setZoom={setZoom}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          setTool={setTool}
          onCancelStroke={cancelCurrentStroke}
        />

        {/* PULLUP CONTROL TOOLBAR */}
        <Toolbar
          currentTool={currentTool}
          setTool={setTool}
          pencilSize={pencilSize}
          setPencilSize={setPencilSize}
          setPencilNamedColor={(name) => {
            const hex = { light: '#bbbbbb', medium: '#555555', dark: '#111111' }[name];
            setPencilColor(hex);
            if (currentTool === 'eraser') setTool('pen');
          }}
          pencilColor={pencilColor}
          setPencilColor={setPencilColor}
          gridVisible={gridVisible}
          toggleGrid={() => setGridVisible(!gridVisible)}
          undo={handleUndo}
          redo={handleRedo}
          onSave={handleSaveProjectManually}
          onClear={() => setActiveModal('clear-modal')}
          onFullscreen={handleToggleFullscreen}
          openModal={setActiveModal}
          onShare={handleNativeShare}
          theme={theme}
          setTheme={handleSetTheme}
          zoom={zoom}
          setZoom={setZoom}
          setPanOffset={setPanOffset}
        />

        {/* DIALOG PREFERENCE WINDOWS */}
        <Modals
          activeModal={activeModal}
          closeActiveModal={() => setActiveModal(null)}
          projects={projects}
          currentProject={currentProject}
          onSwitchProject={handleSwitchProject}
          onCreateProject={handleCreateNewProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={handleRenameProject}
          currentScale={currentScale}
          onSetScale={handleSetScale}
          canvasRef={canvasRef}
          storageUsedInfo={storageUsedInfo}
          onClearCanvas={handleClearCanvasNow}
          onImportBackup={handleImportBackup}
        />

        {/* TOAST PANEL BAR ALERT */}
        <Toast message={toastMessage} status={toastStatus} />

        {/* SLIDE SIDEBAR OVERLAYS */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentTool={currentTool}
          setTool={setTool}
          gridVisible={gridVisible}
          toggleGrid={() => setGridVisible(!gridVisible)}
          undo={handleUndo}
          redo={handleRedo}
          onSave={handleSaveProjectManually}
          openModal={setActiveModal}
          onShare={handleNativeShare}
          onFullscreen={handleToggleFullscreen}
          onClear={() => {
            setSidebarOpen(false);
            setActiveModal('clear-modal');
          }}
          theme={theme}
          setTheme={handleSetTheme}
          appIconSvg={APP_ICON_SVG}
          userEmail={user?.email}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isCloudSyncing={isCloudSyncing}
          triggerForceCloudSync={triggerForceCloudSync}
          pwaPrompt={pwaPrompt}
          onTriggerInstall={handleTriggerInstall}
          projects={projects}
          currentProject={currentProject}
          onSwitchProject={handleSwitchProject}
          onDeleteProject={handleDeleteProject}
        />

      </div>
    </>
  );
}
