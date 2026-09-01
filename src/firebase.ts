import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBD5EbgQqBhVBGN6QTL5kZGsw3Y7MHoWp4",
  authDomain: "wellbeing-tracker-ce9cf.firebaseapp.com",
  projectId: "wellbeing-tracker-ce9cf",
  storageBucket: "wellbeing-tracker-ce9cf.appspot.com",
  messagingSenderId: "555034597658",
  appId: "1:555034597658:web:ee177bd89c92db2f6334a3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Error signing in with Google:", error);
    alert(`Sign-in failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

export const logout = () => signOut(auth);