import { Project } from '../types';

const DB_NAME = 'voxpad_local_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBDatabase> | null = null;
let idbAvailable: boolean = true;

// In-memory fallback store in case IndexedDB is wiped, disabled, or in private/airplane mode
const memoryStore = {
  projects: new Map<string, Project>(),
  drawings: new Map<string, string>(),
  syncQueue: new Map<string, SyncQueueItem>()
};

export interface SyncQueueItem {
  id: string; // project ID
  action: 'upsert' | 'delete';
  timestamp: number;
}

export function getDB(): Promise<IDBDatabase> {
  if (!idbAvailable) {
    return Promise.reject(new Error('IndexedDB not available, using memory/local fallback'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        idbAvailable = false;
        return reject(new Error('IndexedDB not supported'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Create projects store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        // Create drawings store
        if (!db.objectStoreNames.contains('drawings')) {
          db.createObjectStore('drawings', { keyPath: 'projectId' });
        }

        // Create sync_queue store for offline changes
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        idbAvailable = false;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked, working with fallback');
      };
    } catch (e) {
      idbAvailable = false;
      reject(e);
    }
  });

  return dbPromise;
}

export async function getLocalProjects(): Promise<Project[]> {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => {
        const list = request.result || [];
        // Update memory mirror
        list.forEach((p: Project) => memoryStore.projects.set(p.id, p));
        resolve(list);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    // Fallback to memory store or localStorage backup
    try {
      const backup = localStorage.getItem('voxpad_projects_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((p: Project) => memoryStore.projects.set(p.id, p));
          return parsed;
        }
      }
    } catch (e) {}
    return Array.from(memoryStore.projects.values());
  }
}

export async function saveLocalProject(project: Project): Promise<void> {
  // Always update memory store and localStorage backup immediately for instant offline durability
  memoryStore.projects.set(project.id, project);
  try {
    const all = Array.from(memoryStore.projects.values());
    localStorage.setItem('voxpad_projects_backup', JSON.stringify(all));
  } catch (e) {}

  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'sync_queue'], 'readwrite');
      const store = tx.objectStore('projects');
      const syncStore = tx.objectStore('sync_queue');
      
      store.put(project);
      syncStore.put({
        id: project.id,
        action: 'upsert',
        timestamp: Date.now()
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Persisted to memory fallback
  }
}

export async function getLocalProject(id: string): Promise<Project | null> {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return memoryStore.projects.get(id) || null;
  }
}

export async function deleteLocalProject(id: string): Promise<void> {
  memoryStore.projects.delete(id);
  memoryStore.drawings.delete(id);
  try {
    const all = Array.from(memoryStore.projects.values());
    localStorage.setItem('voxpad_projects_backup', JSON.stringify(all));
  } catch (e) {}

  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'drawings', 'sync_queue'], 'readwrite');
      const projStore = tx.objectStore('projects');
      const drawStore = tx.objectStore('drawings');
      const syncStore = tx.objectStore('sync_queue');

      projStore.delete(id);
      drawStore.delete(id);
      syncStore.put({
        id,
        action: 'delete',
        timestamp: Date.now()
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {}
}

export async function getLocalDrawing(projectId: string): Promise<string> {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('drawings', 'readonly');
      const store = tx.objectStore('drawings');
      const request = store.get(projectId);

      request.onsuccess = () => {
        const data = request.result?.canvasData || '';
        if (data) memoryStore.drawings.set(projectId, data);
        resolve(data);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return memoryStore.drawings.get(projectId) || '';
  }
}

export async function saveLocalDrawing(projectId: string, canvasData: string): Promise<void> {
  memoryStore.drawings.set(projectId, canvasData);

  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['drawings', 'sync_queue'], 'readwrite');
      const store = tx.objectStore('drawings');
      const syncStore = tx.objectStore('sync_queue');
      const data = {
        projectId,
        canvasData,
        modified: Date.now()
      };
      store.put(data);
      syncStore.put({
        id: projectId,
        action: 'upsert',
        timestamp: Date.now()
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {}
}

export async function queueSyncAction(projectId: string, action: 'upsert' | 'delete'): Promise<void> {
  memoryStore.syncQueue.set(projectId, { id: projectId, action, timestamp: Date.now() });

  try {
    const db = await getDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    store.put({
      id: projectId,
      action,
      timestamp: Date.now()
    });
  } catch (err) {}
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return Array.from(memoryStore.syncQueue.values());
  }
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  memoryStore.syncQueue.delete(id);

  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {}
}

export async function clearSyncQueue(): Promise<void> {
  memoryStore.syncQueue.clear();

  try {
    const db = await getDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {}
}
