// src/config/firebase.ts - Secure version
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getEnvironmentConfig } from './environment';

const config = getEnvironmentConfig();

// Initialize Firebase with environment variables
const app = initializeApp(config.firebase);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider with enhanced security
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Enhanced auth settings
if (config.isDevelopment) {
  auth.settings.appVerificationDisabledForTesting = true;
}

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Connect to emulators in development only
if (config.isDevelopment && !auth.emulatorConfig) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.warn('Firebase emulators not available:', error);
  }
}

export default app;