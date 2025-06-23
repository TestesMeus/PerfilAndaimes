import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyDqUz_6Z8YrPwGuu0dD9PCBrxu_No8Ksu0',
  authDomain: 'perfilandaimes-7e7af.firebaseapp.com',
  projectId: 'perfilandaimes-7e7af',
  storageBucket: 'perfilandaimes-7e7af.appspot.com',
  messagingSenderId: '989299455444',
  appId: '1:989299455444:web:af7b08d8d484f43ab0d241',
  measurementId: 'G-SCPC3KYHD8'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app); 