// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCG1Bg8Ld_banSbN5C9KtifXSUMcjqo8QY",
  authDomain: "daytrader-tracker.firebaseapp.com",
  projectId: "daytrader-tracker",
  storageBucket: "daytrader-tracker.firebasestorage.app",
  messagingSenderId: "404336328891",
  appId: "1:404336328891:web:26e89ffcb3ba64dd4ba99e",
  measurementId: "G-85LN5DWJFD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;


