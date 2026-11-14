import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGooglePopup(): Promise<{
  name: string;
  email: string;
  uid: string;
}> {
  const result = await signInWithPopup(auth, googleProvider);
  const firebaseUser = result.user;
  if (!firebaseUser.email) {
    throw new Error('Tu cuenta de Google no devolvió un correo electrónico.');
  }
  return {
    name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
    email: firebaseUser.email,
    uid: firebaseUser.uid,
  };
}

export async function signOutGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore signout errors when user signed in with email/password
  }
}
