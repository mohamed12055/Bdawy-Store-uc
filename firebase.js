import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyCGu88Q6MEsnYeDUwCu0ofAYrr2J_X8on8",
    authDomain: "bdawy-store-2.firebaseapp.com",
    projectId: "bdawy-store-2",
    storageBucket: "bdawy-store-2.firebasestorage.app",
    messagingSenderId: "1046914436082",
    appId: "1:1046914436082:web:634dfa4802b6b8fc66f96b"
};


const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);

export const db = getFirestore(app);