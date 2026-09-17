import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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
  operation: OperationType;
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
  };
}

export function handleFirestoreError(error: unknown, operation: OperationType, path: string | null): never {
  const user = auth.currentUser;
  const info: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operation,
    path,
    authInfo: {
      userId: user ? user.uid : null,
      email: user ? user.email : null,
      emailVerified: user ? user.emailVerified : false,
      isAnonymous: user ? user.isAnonymous : true,
    },
  };
  console.error('[VeggieChef Firestore Error]', JSON.stringify(info, null, 2));
  throw new Error(JSON.stringify(info));
}

// Resolved Firebase Configuration (supports both Vercel Environment Variables and local config)
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
const activeConfig = {
  apiKey: metaEnv?.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: metaEnv?.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: metaEnv?.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  firestoreDatabaseId: metaEnv?.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
  storageBucket: metaEnv?.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: metaEnv?.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: metaEnv?.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with configured databaseId
export const db: Firestore = getFirestore(
  app,
  activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)'
    ? activeConfig.firestoreDatabaseId
    : undefined
);

let currentAuthUser: User | null = null;
let authInitPromise: Promise<User | null> | null = null;

export function ensureFirebaseAuth(): Promise<User | null> {
  if (currentAuthUser) {
    return Promise.resolve(currentAuthUser);
  }
  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      currentAuthUser = user;
      unsubscribe();
      resolve(user);
    });
    // Fallback in case onAuthStateChanged is slow or user is unauthenticated
    setTimeout(() => resolve(currentAuthUser), 100);
  });

  return authInitPromise;
}

// Initial connection test as recommended by skill
export async function testConnection(): Promise<boolean> {
  try {
    await ensureFirebaseAuth();
    // Test read with server check
    await getDocFromServer(doc(db, 'family_groups', 'connection_test_check'));
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Ignore not-found or permission check for non-existent test doc, as long as network connected
    if (msg.includes('the client is offline')) {
      console.warn('[VeggieChef Firebase] Client appears offline.');
      return false;
    }
    return true;
  }
}

// Run test connection asynchronously on load
if (typeof window !== 'undefined') {
  ensureFirebaseAuth().catch((err) => console.warn('Auth init err:', err));
}
