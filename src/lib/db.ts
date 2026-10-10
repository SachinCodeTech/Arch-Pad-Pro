import { Project } from '../types';

const DB_NAME = 'voxpad_local_db';
const DB_VERSION = 3; // version 3 with sync_queue

let dbPromise: Promise<IDBDatabase> | null = null;

export interface SyncQueueItem {
  id: string; // project ID
  action: 'upsert' | 'delete';
  timestamp: number;
}

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
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
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function getLocalProjects(): Promise<Project[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveLocalProject(project: Project): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'sync_queue'], 'readwrite');
    const store = tx.objectStore('projects');
    const syncStore = tx.objectStore('sync_queue');
    
    store.put(project);
    syncStore.put({
      id: project.id,
      action: 'upsert',
      timestamp: Date.now()
    });

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function getLocalProject(id: string): Promise<Project | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteLocalProject(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
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

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function getLocalDrawing(projectId: string): Promise<string> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drawings', 'readonly');
    const store = tx.objectStore('drawings');
    const request = store.get(projectId);

    request.onsuccess = () => {
      resolve(request.result?.canvasData || '');
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveLocalDrawing(projectId: string, canvasData: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
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

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function queueSyncAction(projectId: string, action: 'upsert' | 'delete'): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    store.put({
      id: projectId,
      action,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('Could not queue sync action:', err);
  }
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
