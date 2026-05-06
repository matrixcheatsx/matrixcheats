import { initializeApp }            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc,
         deleteDoc, doc, onSnapshot, setDoc, getDoc, query, limit }
                                     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
         sendEmailVerification }
                                     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCIdRKoALvfMgIRlYjvpckRQzyWGYXSu4w",
  authDomain:        "matrixcheat-0011.firebaseapp.com",
  projectId:         "matrixcheat-0011",
  storageBucket:     "matrixcheat-0011.firebasestorage.app",
  messagingSenderId: "398069626242",
  appId:             "1:398069626242:web:7979c93b79b40b95138b9b",
  measurementId:     "G-Y0WYGJMQQ7"
};

const fbApp   = initializeApp(firebaseConfig);
const db      = getFirestore(fbApp);
const auth    = getAuth(fbApp);

export { db, auth, fbApp, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc, query, limit, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, sendEmailVerification };
