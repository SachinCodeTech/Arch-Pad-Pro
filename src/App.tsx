import React, { useEffect, useRef, useState } from 'react';
import Splash from './components/Splash';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import Toolbar from './components/Toolbar';
import Modals from './components/Modals';
import Toast from './components/Toast';

import { Project, ToolType, ThemeType, ArchSymbolType, PaperGridType } from './types';
import { createSampleBlueprintDataUrl } from './lib/sampleBlueprints';
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
  const [currentSymbol, setSymbol] = useState<ArchSymbolType>('north_arrow');
  const [paperGrid, setPaperGrid] = useState<PaperGridType>('cad');
  const [pencilSize, setPencilSize] = useState<number>(2);
  const [pencilColor, setPencilColor] = useState<string>('#1a1a1a');
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [currentScale, setScale] = useState<string>('1:50');
  const [theme, setTheme] = useState<ThemeType>('dark');

  // Multi-store tracking
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [currentProject, setCurrentProject] = useState<string>('Villa Residence (1:50)');

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
  const lastPoint = useRef({ x: 0, y: 0 });
  const lastMidPoint = useRef({ x: 0, y: 0 });
  const previewData = useRef<ImageData | null>(null);

  // Active Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [storageUsedInfo, setStorageUsedInfo] = useState<string>('~10 KB');

  // Toast Alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<'success' | 'info' | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // High-performance GPU texture rollback buffer for instant 0ms gesture rollback
  const rollbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasRollback = useRef<boolean>(false);
  const strokePointCount = useRef<number>(0);

  const cancelCurrentStroke = () => {
    if (isDrawing || isPanning.current || previewData.current) {
      setIsDrawing(false);
      isPanning.current = false;
      previewData.current = null;
      if (hasRollback.current && rollbackCanvasRef.current && offscreenCanvasRef.current) {
        const oCtx = offscreenCanvasRef.current.getContext('2d');
        if (oCtx) {
          oCtx.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
          oCtx.drawImage(rollbackCanvasRef.current, 0, 0);
        }
      }
      hasRollback.current = false;
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

  // Native Android environment initialized

  // Check URL search parameters or hash to open modal in-app without external browser
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const modalParam = searchParams.get('modal') || window.location.hash.replace('#', '');
      if (modalParam === 'privacy' || modalParam === 'privacy-modal') {
        setActiveModal('privacy-modal');
      } else if (modalParam === 'about' || modalParam === 'about-modal' || modalParam === 'credits') {
        setActiveModal('about-modal');
      } else if (modalParam === 'info' || modalParam === 'info-modal') {
        setActiveModal('info-modal');
      }
      // Clean up URL without reload if query param was present
      if (searchParams.has('modal')) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({ app: 'archpad-active' }, '', cleanUrl);
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  // Android hardware/gesture back navigation handler
  const lastBackPressTime = useRef<number>(0);
  useEffect(() => {
    // Prime the history stack for native back-gesture capture
    try {
      window.history.replaceState({ app: 'archpad-root' }, '');
      window.history.pushState({ app: 'archpad-active' }, '');
    } catch (e) {}

    const handlePopState = () => {
      // 1. If modal is open, dismiss modal
      if (activeModal) {
        setActiveModal(null);
        window.history.pushState({ app: 'archpad-active' }, '');
        return;
      }

      // 2. If sidebar is open, close sidebar
      if (sidebarOpen) {
        setSidebarOpen(false);
        window.history.pushState({ app: 'archpad-active' }, '');
        return;
      }

      // 3. If text input modal is active, dismiss
      if (textInputState.visible) {
        setTextInputState({ visible: false, x: 0, y: 0, value: '' });
        window.history.pushState({ app: 'archpad-active' }, '');
        return;
      }

      // 4. Native Android double-back to exit UX
      const now = Date.now();
      if (now - lastBackPressTime.current < 2000) {
        // Allow app exit
        return;
      } else {
        lastBackPressTime.current = now;
        showToast('Press Back again to exit Arch Pad', 'info');
        window.history.pushState({ app: 'archpad-active' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModal, sidebarOpen, textInputState.visible]);

  // Monitor connectivity: Sync local changes when network connection is restored
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
          showToast(`${syncQueue.length} offline changes saved safely on device.`, 'info');
        }
      } catch (err) {
        console.warn('Auto-sync on reconnect error:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline Mode — Drawings saved on device storage.', 'info');
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
        
        // If projects empty or missing blueprints, seed full CAD blueprint collection
        const needsSeed = loadedProjects.length === 0 || 
          (loadedProjects.length === 1 && loadedProjects[0].name === 'Sketch 1') ||
          !loadedProjects.some((p) => p.name === 'Villa Residence (1:50)');
          
        if (needsSeed) {
          const sample1: Project = {
            id: 'proj_villa_residence',
            name: 'Villa Residence (1:50)',
            created: Date.now() - 86400000 * 2,
            modified: Date.now(),
            scale: '1:50'
          };
          const sample2: Project = {
            id: 'proj_structural_grid',
            name: 'Column Grid Layout (1:100)',
            created: Date.now() - 86400000,
            modified: Date.now(),
            scale: '1:100'
          };
          const sample3: Project = {
            id: 'proj_south_elevation',
            name: 'South Facade Elevation (1:100)',
            created: Date.now(),
            modified: Date.now(),
            scale: '1:100'
          };

          await saveLocalProject(sample1);
          await saveLocalProject(sample2);
          await saveLocalProject(sample3);

          const data1 = createSampleBlueprintDataUrl('villa', 3200, 2400, false);
          const data2 = createSampleBlueprintDataUrl('structural', 3200, 2400, false);
          const data3 = createSampleBlueprintDataUrl('elevation', 3200, 2400, false);

          await saveLocalDrawing(sample1.id, data1);
          await saveLocalDrawing(sample2.id, data2);
          await saveLocalDrawing(sample3.id, data3);

          normalized[sample1.name] = sample1;
          normalized[sample2.name] = sample2;
          normalized[sample3.name] = sample3;
          // preserve any custom user projects
          loadedProjects.forEach((p) => {
            if (p.name !== 'Sketch 1') normalized[p.name] = p;
          });
          setProjects(normalized);
          setCurrentProject(sample1.name);
          localStorage.setItem('voxpad_current', sample1.name);
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
  }, [zoom, panOffset, gridVisible, theme, paperGrid, appReady]);

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
  }, [currentProject, projects, appReady]);

  const initOffscreenCanvas = () => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 3200;
      offscreenCanvasRef.current.height = 2400;
      const oCtx = offscreenCanvasRef.current.getContext('2d');
      if (oCtx) {
        oCtx.clearRect(0, 0, 3200, 2400);
      }
    }
  };

  const redrawVisibleCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Seamless full-screen architectural paper workspace (no borders, no cutoff corners)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Translate and Scale zoom
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    if (offscreenCanvasRef.current) {
      // Draw client artwork seamlessly across the infinite paper canvas
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

    // Reset offscreen to clean transparent layer (infinite seamless paper)
    oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);

    setHistory([]);
    setHistoryIndex(-1);

    let matchProj = projects[currentProject];
    if (!matchProj) {
      const allLocal = await getLocalProjects();
      matchProj = allLocal.find((p) => p.name === currentProject || p.id === currentProject);
    }

    if (matchProj) {
      setScale(matchProj.scale);
      let cached = await getLocalDrawing(matchProj.id);
      if (!cached) {
        if (matchProj.id === 'proj_villa_residence' || matchProj.name.includes('Villa')) {
          cached = createSampleBlueprintDataUrl('villa', 3200, 2400, false);
          await saveLocalDrawing(matchProj.id, cached);
        } else if (matchProj.id === 'proj_structural_grid' || matchProj.name.includes('Column')) {
          cached = createSampleBlueprintDataUrl('structural', 3200, 2400, false);
          await saveLocalDrawing(matchProj.id, cached);
        } else if (matchProj.id === 'proj_south_elevation' || matchProj.name.includes('Elevation')) {
          cached = createSampleBlueprintDataUrl('elevation', 3200, 2400, false);
          await saveLocalDrawing(matchProj.id, cached);
        }
      }

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

  // Background CAD GRID drawings (dynamic panning and zooming infinite grids with paper style presets)
  const drawBgCADGrid = () => {
    const gc = gridCanvasRef.current;
    if (!gc) return;
    const gCtx = gc.getContext('2d');
    if (!gCtx) return;

    gCtx.clearRect(0, 0, gc.width, gc.height);
    if (!gridVisible || paperGrid === 'plain') return;

    const sz = 30 * zoom; 
    if (sz < 5) return; // prevent zero/tiny division infinite loops

    if (paperGrid === 'dots') {
      gCtx.fillStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.22)' : 'rgba(100, 150, 255, 0.35)';
      const startX = panOffset.x % sz;
      const startY = panOffset.y % sz;
      for (let x = startX; x <= gc.width; x += sz) {
        for (let y = startY; y <= gc.height; y += sz) {
          gCtx.beginPath();
          gCtx.arc(x, y, 1.2, 0, Math.PI * 2);
          gCtx.fill();
        }
      }
      return;
    }

    if (paperGrid === 'isometric') {
      const lineCol = theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(100, 140, 240, 0.18)';
      gCtx.strokeStyle = lineCol;
      gCtx.lineWidth = 0.6;
      
      // Vertical lines
      const startX = panOffset.x % sz;
      for (let x = startX; x <= gc.width; x += sz) {
        gCtx.beginPath();
        gCtx.moveTo(x, 0);
        gCtx.lineTo(x, gc.height);
        gCtx.stroke();
      }
      // 30 degree diagonal lines
      const diagStep = sz;
      const totalWidth = gc.width + gc.height * 1.8;
      const dStartX = (panOffset.x % diagStep) - gc.height;
      for (let x = dStartX; x <= totalWidth; x += diagStep) {
        gCtx.beginPath();
        gCtx.moveTo(x, 0);
        gCtx.lineTo(x + gc.height * 0.577, gc.height);
        gCtx.stroke();

        gCtx.beginPath();
        gCtx.moveTo(x, 0);
        gCtx.lineTo(x - gc.height * 0.577, gc.height);
        gCtx.stroke();
      }
      return;
    }

    // Grid color styles based on paperGrid preset
    let minorColor = 'rgba(100, 120, 200, 0.15)';
    let majorColor = 'rgba(100, 120, 200, 0.28)';

    if (paperGrid === 'blueprint') {
      minorColor = 'rgba(56, 189, 248, 0.22)';
      majorColor = 'rgba(56, 189, 248, 0.45)';
    } else if (paperGrid === 'metric') {
      minorColor = theme === 'light' ? 'rgba(16, 185, 129, 0.20)' : 'rgba(52, 211, 153, 0.22)';
      majorColor = theme === 'light' ? 'rgba(16, 185, 129, 0.38)' : 'rgba(52, 211, 153, 0.42)';
    } else {
      // standard cad
      minorColor = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(100, 120, 200, 0.15)';
      majorColor = theme === 'light' ? 'rgba(0, 0, 0, 0.16)' : 'rgba(100, 120, 200, 0.28)';
    }

    // Small grids
    gCtx.strokeStyle = minorColor;
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
    gCtx.strokeStyle = majorColor;
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
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, snap];
        if (updated.length > 25) updated.shift();
        return updated;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 24));
    } catch (e) {
      console.warn('Snapshot skipped:', e);
    }
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
  // Precise coordinate mapping from viewport client pixels to world canvas space
  const clientToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    return {
      x: (cx - panOffset.x) / zoom,
      y: (cy - panOffset.y) / zoom
    };
  };

  const getPointerCoords = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    let clientX = 0;
    let clientY = 0;
    let pressure = 1.0;

    const nativeEvent = e.nativeEvent as any;
    if ('touches' in nativeEvent && nativeEvent.touches && nativeEvent.touches.length > 0) {
      clientX = nativeEvent.touches[0].clientX;
      clientY = nativeEvent.touches[0].clientY;
      if (typeof nativeEvent.touches[0].force === 'number' && nativeEvent.touches[0].force > 0) {
        pressure = 0.75 + nativeEvent.touches[0].force * 0.5;
      }
    } else if ('clientX' in e && typeof e.clientX === 'number') {
      clientX = e.clientX;
      clientY = e.clientY;
      if (typeof e.pressure === 'number' && e.pressure > 0 && e.pressure !== 0.5) {
        pressure = 0.75 + e.pressure * 0.5;
      }
    } else if ('changedTouches' in nativeEvent && nativeEvent.changedTouches && nativeEvent.changedTouches.length > 0) {
      clientX = nativeEvent.changedTouches[0].clientX;
      clientY = nativeEvent.changedTouches[0].clientY;
    }

    const { x, y } = clientToWorld(clientX, clientY);
    return { x, y, clientX, clientY, pressure };
  };

  // Backwards-compatible pos getter
  const getPointerPos = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getPointerCoords(e);
    return { x: coords.x, y: coords.y };
  };

  // 2. CANVAS DRAWING CODES - NATURAL PENCIL ON PAPER
  const onPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (sidebarOpen) setSidebarOpen(false);

    const nativeEvent = e.nativeEvent as any;
    
    // Multi-touch gestures (pinch to zoom) take priority over drawing
    const hasMultipleTouches = 
      ('touches' in nativeEvent && nativeEvent.touches.length > 1) || 
      (nativeEvent.touches && nativeEvent.touches.length > 1);
    if (hasMultipleTouches) {
      cancelCurrentStroke();
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    // Capture pointer only for primary pointer on mouse or non-gesture touches
    if ('pointerId' in e && e.isPrimary && (!e.pointerType || e.pointerType !== 'touch')) {
      try {
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    // If 'pan' tool mode is active, handle manual canvas pan offset navigation
    if (currentTool === 'pan') {
      const { clientX, clientY } = getPointerCoords(e);
      isPanning.current = true;
      startPanPos.current = { x: clientX, y: clientY };
      initialPanOffset.current = { ...panOffset };
      return;
    }

    const { x, y, pressure } = getPointerCoords(e);

    if (currentTool === 'text') {
      setTextInputState({
        visible: true,
        x,
        y,
        value: ''
      });
      return;
    }

    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    // Fast GPU-to-GPU texture snapshot for 0ms gesture rollback (no CPU readback stall!)
    if (!rollbackCanvasRef.current) {
      rollbackCanvasRef.current = document.createElement('canvas');
      rollbackCanvasRef.current.width = oCanvas.width;
      rollbackCanvasRef.current.height = oCanvas.height;
    }
    const rCtx = rollbackCanvasRef.current.getContext('2d');
    if (rCtx) {
      rCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);
      rCtx.drawImage(oCanvas, 0, 0);
    }
    hasRollback.current = true;

    setIsDrawing(true);
    strokePointCount.current = 0;
    startPoints.current = { x, y };
    lastPoint.current = { x, y };
    lastMidPoint.current = { x, y };

    if (currentTool === 'pen' || currentTool === 'eraser') {
      const isEraser = currentTool === 'eraser';
      const bgHex = theme === 'light' ? '#ffffff' : '#fafaf8';
      const markRadius = Math.max(0.6, (isEraser ? pencilSize * 1.5 : pencilSize * 0.5) * pressure);

      // Imprint dot on backing canvas right at contact point
      oCtx.save();
      oCtx.beginPath();
      oCtx.arc(x, y, markRadius, 0, Math.PI * 2);
      oCtx.fillStyle = isEraser ? bgHex : pencilColor;
      oCtx.fill();
      oCtx.restore();

      // Immediate 0ms direct render on visible screen canvas for zero-latency tactile feedback
      const sCanvas = canvasRef.current;
      if (sCanvas) {
        const sCtx = sCanvas.getContext('2d');
        if (sCtx) {
          const screenX = x * zoom + panOffset.x;
          const screenY = y * zoom + panOffset.y;
          sCtx.save();
          sCtx.beginPath();
          sCtx.arc(screenX, screenY, markRadius * zoom, 0, Math.PI * 2);
          sCtx.fillStyle = isEraser ? bgHex : pencilColor;
          sCtx.fill();
          sCtx.restore();
        }
      }
    } else {
      previewData.current = {} as ImageData; // truthy placeholder
    }
  };

  const onPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const nativeEvent = e.nativeEvent as any;
    
    // Prevent zoom/pinch gestures from triggering stray line drawing
    const hasMultipleTouches = 
      ('touches' in nativeEvent && nativeEvent.touches.length > 1) || 
      (nativeEvent.touches && nativeEvent.touches.length > 1);
    if (hasMultipleTouches) {
      cancelCurrentStroke();
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    if (currentTool === 'pan') {
      if (!isPanning.current) return;
      const { clientX, clientY } = getPointerCoords(e);
      const dx = clientX - startPanPos.current.x;
      const dy = clientY - startPanPos.current.y;
      setPanOffset({
        x: initialPanOffset.current.x + dx,
        y: initialPanOffset.current.y + dy
      });
      return;
    }

    if (!isDrawing) return;

    initOffscreenCanvas();
    const oCanvas = offscreenCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      const isEraser = currentTool === 'eraser';
      const bgHex = theme === 'light' ? '#ffffff' : '#fafaf8';

      // Collect all high-precision sub-frame touch points from coalesced events (120Hz/240Hz screens)
      const points: { x: number; y: number; pressure: number }[] = [];
      if (typeof nativeEvent?.getCoalescedEvents === 'function') {
        const coalesced = nativeEvent.getCoalescedEvents();
        if (coalesced && coalesced.length > 0) {
          for (let i = 0; i < coalesced.length; i++) {
            const cev = coalesced[i];
            const coords = clientToWorld(cev.clientX, cev.clientY);
            let p = 1.0;
            if (typeof cev.pressure === 'number' && cev.pressure > 0 && cev.pressure !== 0.5) {
              p = 0.75 + cev.pressure * 0.5;
            }
            points.push({ x: coords.x, y: coords.y, pressure: p });
          }
        }
      }
      if (points.length === 0) {
        const coords = getPointerCoords(e);
        points.push({ x: coords.x, y: coords.y, pressure: coords.pressure });
      }

      // Draw continuous Bézier spline connecting directly from initial touch point
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const dist = Math.hypot(pt.x - lastPoint.current.x, pt.y - lastPoint.current.y);
        if (dist < 0.25 && strokePointCount.current > 0) continue;

        const midX = (lastPoint.current.x + pt.x) / 2;
        const midY = (lastPoint.current.y + pt.y) / 2;
        const strokeW = Math.max(0.75, (isEraser ? pencilSize * 3 : pencilSize) * pt.pressure);

        oCtx.beginPath();
        oCtx.lineWidth = strokeW;
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        oCtx.strokeStyle = isEraser ? bgHex : pencilColor;

        if (strokePointCount.current === 0) {
          // First segment: draw seamless line connecting from the exact contact point
          oCtx.moveTo(lastPoint.current.x, lastPoint.current.y);
          oCtx.lineTo(midX, midY);
        } else {
          // Subsequent segments: smooth Bézier curve through midpoints
          oCtx.moveTo(lastMidPoint.current.x, lastMidPoint.current.y);
          oCtx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
        }
        oCtx.stroke();

        lastMidPoint.current = { x: midX, y: midY };
        lastPoint.current = { x: pt.x, y: pt.y };
        strokePointCount.current++;
      }

      redrawVisibleCanvas();
    } else if (previewData.current) {
      const { x, y } = getPointerCoords(e);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          redrawVisibleCanvas();
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

    if (currentTool === 'pen' || currentTool === 'eraser') {
      const isEraser = currentTool === 'eraser';
      const bgHex = theme === 'light' ? '#ffffff' : '#fafaf8';

      // If finger moved, finish curve to the final release point cleanly
      if (strokePointCount.current > 0) {
        oCtx.beginPath();
        oCtx.moveTo(lastMidPoint.current.x, lastMidPoint.current.y);
        oCtx.lineTo(lastPoint.current.x, lastPoint.current.y);
        oCtx.lineWidth = isEraser ? pencilSize * 3 : pencilSize;
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        oCtx.strokeStyle = isEraser ? bgHex : pencilColor;
        oCtx.stroke();
      }

      redrawVisibleCanvas();
      // Record undo snapshot upon completing stroke
      takeSnapSnapshot();
    } else {
      const { x, y } = getPointerCoords(e);
      if (previewData.current) {
        drawVectorShape(oCtx, currentTool, startPoints.current.x, startPoints.current.y, x, y);
        previewData.current = null;
        redrawVisibleCanvas();
        takeSnapSnapshot();
      }
    }
    hasRollback.current = false;
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
    } else if (type === 'dimension') {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 4) return;
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;
      const strokeW = customWidth !== undefined ? customWidth : pencilSize;
      const extLen = 14;
      const tickLen = 8;

      // 1. Witness Extension Lines
      ctx.lineWidth = Math.max(0.75, strokeW * 0.75);
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(perpAngle) * extLen, sy - Math.sin(perpAngle) * extLen);
      ctx.lineTo(sx + Math.cos(perpAngle) * extLen, sy + Math.sin(perpAngle) * extLen);
      ctx.moveTo(ex - Math.cos(perpAngle) * extLen, ey - Math.sin(perpAngle) * extLen);
      ctx.lineTo(ex + Math.cos(perpAngle) * extLen, ey + Math.sin(perpAngle) * extLen);
      ctx.stroke();

      // 2. Main Dimension Line
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // 3. 45-degree CAD Architectural Hash Ticks
      ctx.lineWidth = Math.max(1.5, strokeW * 1.4);
      const tickAngle = angle + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(tickAngle) * tickLen, sy - Math.sin(tickAngle) * tickLen);
      ctx.lineTo(sx + Math.cos(tickAngle) * tickLen, sy + Math.sin(tickAngle) * tickLen);
      ctx.moveTo(ex - Math.cos(tickAngle) * tickLen, ey - Math.sin(tickAngle) * tickLen);
      ctx.lineTo(ex + Math.cos(tickAngle) * tickLen, ey + Math.sin(tickAngle) * tickLen);
      ctx.stroke();

      // 4. Metric Dimension Annotation Tag
      const scaleMultiplier = currentScale === '1:20' ? 0.02 : currentScale === '1:50' ? 0.05 : currentScale === '1:200' ? 0.2 : 0.1;
      const realMeters = ((len * scaleMultiplier) / 2.5).toFixed(2);
      const dimText = `${realMeters} m`;

      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;

      ctx.save();
      ctx.translate(midX, midY);
      let textAngle = angle;
      if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
        textAngle += Math.PI;
      }
      ctx.rotate(textAngle);

      const fontSize = Math.max(10, strokeW * 3.5);
      ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
      const textWidth = ctx.measureText(dimText).width;

      ctx.fillStyle = theme === 'light' ? '#ffffff' : '#18181f';
      ctx.fillRect(-textWidth / 2 - 4, -fontSize - 2, textWidth + 8, fontSize + 4);

      ctx.fillStyle = pencilColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(dimText, 0, 0);
      ctx.restore();
    } else if (type === 'symbol') {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.max(20, Math.sqrt(dx * dx + dy * dy));
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      const angle = Math.atan2(dy, dx);
      const strokeW = customWidth !== undefined ? customWidth : pencilSize;

      ctx.save();
      if (currentSymbol === 'north_arrow') {
        const radius = Math.max(22, Math.min(len / 2, 70));
        ctx.translate(midX, midY);
        // Outer ring
        ctx.lineWidth = Math.max(1.5, strokeW);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner circle
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        // Sharp North Pointer Needle
        const needleH = radius * 0.76;
        const needleW = radius * 0.28;

        // Dark half
        ctx.beginPath();
        ctx.moveTo(0, -needleH);
        ctx.lineTo(-needleW, needleH * 0.4);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = pencilColor;
        ctx.fill();

        // Light outline half
        ctx.beginPath();
        ctx.moveTo(0, -needleH);
        ctx.lineTo(needleW, needleH * 0.4);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.lineWidth = 1;
        ctx.stroke();

        // 'N' label
        ctx.font = `bold ${Math.max(12, radius * 0.45)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = pencilColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('N', 0, -radius - 4);
      } else if (currentSymbol === 'door_swing') {
        ctx.lineWidth = Math.max(1.5, strokeW);
        ctx.beginPath();
        const perpX = sx + Math.cos(angle - Math.PI / 2) * len;
        const perpY = sy + Math.sin(angle - Math.PI / 2) * len;
        ctx.moveTo(sx, sy);
        ctx.lineTo(perpX, perpY);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(sx, sy, len, angle - Math.PI / 2, angle, false);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (currentSymbol === 'double_door') {
        const halfLen = len / 2;
        ctx.lineWidth = Math.max(1.5, strokeW);
        const leftLeafX = sx + Math.cos(angle - Math.PI / 2) * halfLen;
        const leftLeafY = sy + Math.sin(angle - Math.PI / 2) * halfLen;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(leftLeafX, leftLeafY);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(sx, sy, halfLen, angle - Math.PI / 2, angle, false);
        ctx.stroke();

        ctx.lineWidth = Math.max(1.5, strokeW);
        const rightLeafX = ex + Math.cos(angle - Math.PI / 2) * halfLen;
        const rightLeafY = ey + Math.sin(angle - Math.PI / 2) * halfLen;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(rightLeafX, rightLeafY);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ex, ey, halfLen, angle + Math.PI / 2, Math.PI + angle, false);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (currentSymbol === 'window') {
        const perpX = Math.cos(angle + Math.PI / 2);
        const perpY = Math.sin(angle + Math.PI / 2);
        const wallThick = 12;

        ctx.lineWidth = Math.max(1.2, strokeW);
        ctx.beginPath();
        ctx.moveTo(sx - perpX * wallThick, sy - perpY * wallThick);
        ctx.lineTo(sx + perpX * wallThick, sy + perpY * wallThick);
        ctx.moveTo(ex - perpX * wallThick, ey - perpY * wallThick);
        ctx.lineTo(ex + perpX * wallThick, ey + perpY * wallThick);
        ctx.moveTo(sx - perpX * wallThick, sy - perpY * wallThick);
        ctx.lineTo(ex - perpX * wallThick, ey - perpY * wallThick);
        ctx.moveTo(sx + perpX * wallThick, sy + perpY * wallThick);
        ctx.lineTo(ex + perpX * wallThick, ey + perpY * wallThick);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      } else if (currentSymbol === 'column_bubble') {
        const radius = Math.max(16, strokeW * 6);
        ctx.translate(midX, midY);
        ctx.lineWidth = Math.max(1.5, strokeW);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-radius - 10, 0);
        ctx.lineTo(radius + 10, 0);
        ctx.moveTo(0, -radius - 10);
        ctx.lineTo(0, radius + 10);
        ctx.stroke();

        ctx.font = `bold ${Math.max(12, radius * 0.9)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = pencilColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A1', 0, 0);
      } else if (currentSymbol === 'level_datum') {
        ctx.translate(midX, midY);
        ctx.lineWidth = Math.max(1.5, strokeW);
        ctx.beginPath();
        ctx.moveTo(-45, 0);
        ctx.lineTo(45, 0);
        ctx.stroke();

        const triSize = 14;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-triSize, -triSize * 1.5);
        ctx.lineTo(triSize, -triSize * 1.5);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -triSize * 1.5);
        ctx.lineTo(triSize, -triSize * 1.5);
        ctx.closePath();
        ctx.fillStyle = pencilColor;
        ctx.fill();

        ctx.font = `bold 11px 'JetBrains Mono', monospace`;
        ctx.fillStyle = pencilColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('+3.200 m', triSize + 6, -3);
      } else if (currentSymbol === 'scale_bar') {
        ctx.translate(midX, midY);
        const barW = Math.max(120, len);
        const barH = 10;
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, -barH / 2, barW, barH);

        const segW = barW / 4;
        for (let i = 0; i < 4; i++) {
          if (i % 2 === 0) {
            ctx.fillStyle = pencilColor;
            ctx.fillRect(-barW / 2 + i * segW, -barH / 2, segW, barH);
          }
        }
        ctx.font = `9px 'JetBrains Mono', monospace`;
        ctx.fillStyle = pencilColor;
        ctx.textAlign = 'center';
        ctx.fillText('0', -barW / 2, barH + 4);
        ctx.fillText('1m', -barW / 2 + segW, barH + 4);
        ctx.fillText('2m', -barW / 2 + segW * 2, barH + 4);
        ctx.fillText('4m', barW / 2, barH + 4);
      }
      ctx.restore();
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
        oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);
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

    setPanOffset({ x: 0, y: 0 });
    setZoom(1.0);
    setTool('pen');
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

    setPanOffset({ x: 0, y: 0 });
    setZoom(1.0);
    setTool('pen');
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
      showToast('Error importing .archpad / .voxpad backup file.');
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

  const getExportDataUrl = (): string => {
    initOffscreenCanvas();
    const source = offscreenCanvasRef.current || canvasRef.current;
    if (!source) return '';
    const exp = document.createElement('canvas');
    exp.width = source.width;
    exp.height = source.height;
    const eCtx = exp.getContext('2d');
    if (!eCtx) return source.toDataURL('image/png');
    eCtx.fillStyle = '#ffffff';
    eCtx.fillRect(0, 0, exp.width, exp.height);
    eCtx.drawImage(source, 0, 0);
    return exp.toDataURL('image/png');
  };

  // Native share sheet handles
  const handleNativeShare = async () => {
    const dataUrl = getExportDataUrl();
    if (!dataUrl) return;

    if (navigator.share) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${currentProject}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Architectural drawing: ${currentProject}`,
            text: `Architectural CAD drawing from Arch Pad Pro.`
          });
        } else {
          await navigator.share({
            title: `Architectural drawing: ${currentProject}`,
            text: `Architectural CAD drawing from Arch Pad Pro.`
          });
        }
      } catch (err) {
        // Fallback download if user cancels share dialog
        handleTriggerWebDownload();
      }
    } else {
      handleTriggerWebDownload();
    }
  };

  const handleTriggerWebDownload = () => {
    const dataUrl = getExportDataUrl();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `${currentProject}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Drawing exported as PNG');
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
                title="Working in offline mode. Drawings are saved safely on device and will synchronize once reconnected."
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

            {/* Native CAD Architecture Suite badge */}
            <span className="hidden xs:inline-flex bg-[#4f8ef7]/15 border border-[#4f8ef7]/30 text-[#4f8ef7] font-mono text-[9px] font-bold px-2 py-1 rounded-[6px] select-none items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4f8ef7]"></span>
              CAD V2.0
            </span>
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
          currentSymbol={currentSymbol}
          setSymbol={setSymbol}
          paperGrid={paperGrid}
          setPaperGrid={setPaperGrid}
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
          openModal={setActiveModal}
          appIconSvg={APP_ICON_SVG}
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
          projects={projects}
          currentProject={currentProject}
          onSwitchProject={handleSwitchProject}
          onDeleteProject={handleDeleteProject}
        />

      </div>
    </>
  );
}
