import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBUI3hD_5Unp6Du6gVU70Y2UP4dLfp8GYk",
  authDomain: "notifications-5855e.firebaseapp.com",
  databaseURL: "https://notifications-5855e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "notifications-5855e",
  storageBucket: "notifications-5855e.firebasestorage.app",
  messagingSenderId: "265570766524",
  appId: "1:265570766524:web:b1cdb4065a066b65584ab9",
  measurementId: "G-KFPQCN7H25"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const auth = getAuth(app);
export const database = getDatabase(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});
googleProvider.addScope("email");
googleProvider.addScope("profile");

export default app;

