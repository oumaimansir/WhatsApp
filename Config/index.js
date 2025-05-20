// Import the functions you need from the SDKs you need
import { createClient } from "@supabase/supabase-js";
import app from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCNM4uHKgVuV8NPpja5UU_-YCI5TLHjM2k",
  authDomain: "whatsapp-oumaima.firebaseapp.com",
  projectId: "whatsapp-oumaima",
  storageBucket: "whatsapp-oumaima.firebasestorage.app",
  messagingSenderId: "625255303739",
  appId: "1:625255303739:web:602f9bc649387674032a1e",
  measurementId: "G-QSGGXR3D29"
};

// Initialize Firebase
const firebase = app.initializeApp(firebaseConfig);
export default firebase;
const supabaseUrl = "https://grsevlojydshivxlfpzs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyc2V2bG9qeWRzaGl2eGxmcHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0ODI5MzksImV4cCI6MjA2MTA1ODkzOX0.lctclQ6a7o05PaU0YsQTbvZg75YtDG-dV5hwWGUBSRM";
const supabase = createClient(supabaseUrl,supabaseKey);
export{supabase}