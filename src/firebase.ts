import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect, 
  getRedirectResult,
  signOut 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBD5EbgQqBhVBGN6QTL5kZGsw3Y7MHoWp4",
  authDomain: "wellbeing-tracker-ce9cf.firebaseapp.com",
  projectId: "wellbeing-tracker-ce9cf",
  storageBucket: "wellbeing-tracker-ce9cf.firebasestorage.app",
  messagingSenderId: "555034597658",
  appId: "1:555034597658:web:ee177bd89c92db2f6334a3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export const loginWithGoogle = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Error initiating redirect sign-in:", error);
    alert(`Sign-in failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

export const logout = () => signOut(auth);
export { getRedirectResult };