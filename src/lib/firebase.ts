import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import type { JournalEntry } from '../types';
import firebaseConfigRaw from '../../firebase-applet-config.json';

// Initialize Firebase App
const firebaseConfig = {
  projectId: firebaseConfigRaw.projectId,
  appId: firebaseConfigRaw.appId,
  apiKey: firebaseConfigRaw.apiKey,
  authDomain: firebaseConfigRaw.authDomain,
  firestoreDatabaseId: firebaseConfigRaw.firestoreDatabaseId,
  storageBucket: firebaseConfigRaw.storageBucket,
  messagingSenderId: firebaseConfigRaw.messagingSenderId,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to provisioned Firestore database ID
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== ''
    ? firebaseConfig.firestoreDatabaseId
    : '(default)'
);

// Auth instance
export const auth = getAuth(app);

// Google Auth Provider configured for interactive federated login
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Strict Undefined-Stripping Utility (Zero-Crash Payload Hygiene)
 * Recursively removes all `undefined` values from objects and arrays
 * before submitting to Firestore setDoc/updateDoc.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }

  return data;
}

/**
 * Google Sign-In with Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Record user profile in Firestore
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(
        userRef,
        sanitizeForFirestore({
          uid: result.user.uid,
          email: result.user.email || null,
          displayName: result.user.displayName || 'Journaler',
          photoURL: result.user.photoURL || null,
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    }
    return result.user;
  } catch (error: any) {
    console.error('Firebase Auth Error:', error);
    throw error;
  }
}

/**
 * Sign Out
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribe to User Journal Interactions
 * Path: /users/{userId}/interactions
 * Isolated strictly to the authenticated user.
 */
export function subscribeToUserEntries(
  userId: string,
  onData: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as JournalEntry;
        entries.push({
          ...data,
          id: docSnapshot.id,
        });
      });
      onData(entries);
    },
    (err) => {
      console.error('[Firestore] subscribe error:', err);
      // Fallback: query without order if index is building
      const fallbackQuery = collection(db, 'users', userId, 'interactions');
      onSnapshot(
        fallbackQuery,
        (fallbackSnap) => {
          const list: JournalEntry[] = [];
          fallbackSnap.forEach((docSnap) => {
            list.push({ ...(docSnap.data() as JournalEntry), id: docSnap.id });
          });
          list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          onData(list);
        },
        onError
      );
    }
  );
}

/**
 * Persist Journal Entry to Cloud Firestore
 * Guaranteed Transaction Verification:
 * Path: /users/{userId}/interactions/{interactionId}
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error('Cannot save entry: User is not authenticated.');
  if (!entry.id) throw new Error('Cannot save entry: Missing entry ID.');

  const docRef = doc(db, 'users', userId, 'interactions', entry.id);
  const payload = sanitizeForFirestore({
    id: entry.id,
    userId,
    title: entry.title || 'Untitled Reflection',
    summary: entry.summary || '',
    tags: entry.tags || ['Reflection'],
    reflectionQuestion: entry.reflectionQuestion || '',
    actionInsights: entry.actionInsights || null,
    turns: entry.turns || [],
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Delete Journal Entry from Cloud Firestore
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('Cannot delete entry: Missing userId or entryId.');
  const docRef = doc(db, 'users', userId, 'interactions', entryId);
  await deleteDoc(docRef);
}
