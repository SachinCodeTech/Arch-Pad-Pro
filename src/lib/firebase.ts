import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Project, Drawing } from '../types';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connectivity on initial boot
async function testConnection() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable') || (error as any)?.code === 'unavailable')) {
      console.info("Firestore client operating in offline mode.");
    }
  }
}
testConnection();

// Cloud Firebase Data Fetching
export async function getCloudProjects(userId: string): Promise<Project[]> {
  const path = 'projects';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const list: Project[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: data.id,
        name: data.name,
        created: data.created,
        modified: data.modified,
        scale: data.scale,
        userId: data.userId
      });
    });
    return list;
  } catch (error: any) {
    if (error && (error.code === 'unavailable' || String(error?.message).includes('unavailable') || String(error?.message).includes('offline'))) {
      console.info('Operating in offline mode for cloud projects.');
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function uploadProjectToCloud(userId: string, project: Project, canvasData: string): Promise<void> {
  try {
    const projRef = doc(db, 'projects', project.id);
    const updatedProj = {
      id: project.id,
      userId,
      name: project.name,
      created: Math.round(project.created),
      modified: Math.round(project.modified),
      scale: project.scale
    };
    await setDoc(projRef, updatedProj);

    const drawRef = doc(db, 'drawings', project.id);
    const updatedDraw = {
      projectId: project.id,
      userId,
      canvasData: canvasData || '',
      modified: Math.round(project.modified)
    };
    await setDoc(drawRef, updatedDraw);
  } catch (error: any) {
    if (error && (error.code === 'unavailable' || String(error?.message).includes('unavailable') || String(error?.message).includes('offline'))) {
      console.info('Cloud sync deferred: client is offline.');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `projects/${project.id}`);
  }
}

export async function getCloudDrawing(projectId: string): Promise<string> {
  const path = `drawings/${projectId}`;
  try {
    const qDoc = doc(db, 'drawings', projectId);
    const snapshot = await getDoc(qDoc);
    if (snapshot.exists()) {
      return snapshot.data().canvasData || '';
    }
    return '';
  } catch (error: any) {
    if (error && (error.code === 'unavailable' || String(error?.message).includes('unavailable') || String(error?.message).includes('offline'))) {
      return '';
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteProjectFromCloud(projectId: string): Promise<void> {
  try {
    const projRef = doc(db, 'projects', projectId);
    await deleteDoc(projRef);

    const drawRef = doc(db, 'drawings', projectId);
    await deleteDoc(drawRef);
  } catch (error: any) {
    if (error && (error.code === 'unavailable' || String(error?.message).includes('unavailable') || String(error?.message).includes('offline'))) {
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
  }
}

// Google Login Integration Helper
export async function logInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign In Failed:', error);
    throw error;
  }
}

export async function logOutFromGoogle() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Failed:', error);
  }
}
