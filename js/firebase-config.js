/*
  TUT TextSwap — Firebase configuration
  ======================================
  This prototype runs on a built-in local database (js/db.js, backed by
  localStorage) so it works immediately with no setup. When you're ready
  to move to a real backend, follow these steps and the app will switch
  itself over to Firebase automatically.

  STEP 1 — Create a Firebase project
    1. Go to https://console.firebase.google.com and create a project
       (e.g. "tut-textswap").
    2. In Build > Authentication, enable the "Email/Password" sign-in
       method.
    3. In Build > Firestore Database, create a database (start in test
       mode while developing, then lock it down with security rules
       before going live).
    4. In Project settings > General, scroll to "Your apps", click the
       Web icon (</>) and register the app. Firebase will show you a
       firebaseConfig object — copy its values into FIREBASE_CONFIG below.

  STEP 2 — Turn Firebase on
    Set USE_FIREBASE to true below. Reload the app — js/db.js checks
    this flag and, when true, talks to Firestore/Auth instead of
    localStorage. No other file needs to change.

  STEP 3 — Recreate the admin account for real
    The local prototype ships with a hardcoded demo admin login (see the
    note in js/db.js / the README). Once Firebase is on, create a real
    admin user in Firebase Authentication and give that user's document
    in the "users" Firestore collection a field: role: "admin".
    Then delete the hardcoded demo credential from js/db.js — it must
    never ship in a real deployment.
*/

const USE_FIREBASE = false; // flip to true once FIREBASE_CONFIG below is filled in

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
