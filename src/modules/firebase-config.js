import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDd8iwelJoyTXhUUk5r-iRp3wudG7YCXpY",
  authDomain: "walkie-talkie-pe1-gcm.firebaseapp.com",
  projectId: "walkie-talkie-pe1-gcm",
  storageBucket: "walkie-talkie-pe1-gcm.firebasestorage.app",
  messagingSenderId: "959829668678",
  appId: "1:959829668678:web:c69db9fe7d7e521e442b47"
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});
