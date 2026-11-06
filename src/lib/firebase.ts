import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
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
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();

// Cloud Firebase Data Fetching
export async function getCloudProjects(userId: string): Promise<Project[]> {
  try {
    const qDoc = collection(db, 'projects');
    const snapshot = await getDocs(qDoc);
    const list: Project[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.userId === userId) {
        list.push({
          id: data.id,
          name: data.name,
          created: data.created,
          modified: data.modified,
          scale: data.scale,
          userId: data.userId
        });
      }
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'projects');
  }
}

export async function uploadProjectToCloud(userId: string, project: Project, canvasData: string): Promise<void> {
  try {
    const projRef = doc(db, 'projects', project.id);
    const updatedProj = {
      id: project.id,
      userId,
      name: project.name,
      created: project.created,
      modified: project.modified,
      scale: project.scale
    };
    await setDoc(projRef, updatedProj);

    const drawRef = doc(db, 'drawings', project.id);
    const updatedDraw = {
      projectId: project.id,
      userId,
      canvasData: canvasData || '',
      modified: project.modified
    };
    await setDoc(drawRef, updatedDraw);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `projects/${project.id}`);
  }
}

export async function getCloudDrawing(projectId: string): Promise<string> {
  try {
    const qDoc = doc(db, 'drawings', projectId);
    const snapshot = await getDocFromServer(qDoc);
    if (snapshot.exists()) {
      return snapshot.data().canvasData || '';
    }
    return '';
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `drawings/${projectId}`);
  }
}

export async function deleteProjectFromCloud(projectId: string): Promise<void> {
  try {
    const projRef = doc(db, 'projects', projectId);
    await deleteDoc(projRef);

    const drawRef = doc(db, 'drawings', projectId);
    await deleteDoc(drawRef);
  } catch (error) {
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
