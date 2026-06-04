import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDdp6JldZHpNraNvmkymtbiIgrScrZa9ew",
  authDomain: "chat-app-a0dfa.firebaseapp.com",
  projectId: "chat-app-a0dfa",
  storageBucket: "chat-app-a0dfa.firebasestorage.app",
  messagingSenderId: "704086836210",
  appId: "1:704086836210:web:9934df35c7a1626004216b"
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Messaging di-lazy load karena butuh service worker
// Gunakan getMessagingInstance() dari messaging.js
