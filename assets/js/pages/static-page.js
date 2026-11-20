

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth, signInWithEmailAndPassword, signOut,
    onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getDatabase, ref, onValue, push
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { firebaseConfig } from "../modules/firebase-config.js";
import { initPreloader } from "../modules/preloader.js?v=5";
import { initHeader, initMobileMenu } from "../modules/header.js?v=12";
import { initFloatObserver } from "../modules/float-observer.js";
import { initBackToTop } from "../modules/back-to-top.js?v=11";
import { openModal, closeModal, showModalMessage } from "../modules/modals.js";
import { updateLoginButtonState, initAuth } from "../modules/auth.js?v=16";
import { initLanguageSystem } from "../modules/language-ui.js?v=7";
import { initVisitorTracker } from "../modules/visitor-tracker.js";
import { initFeedback } from "../modules/feedback.js";
import state from "../modules/state.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const feedbackRef = ref(database, 'feedback');

function callUpdateLogin() {
    updateLoginButtonState(database, ref, onValue);
}

window.addEventListener('load', () => {
    initPreloader();
    initHeader();
    initMobileMenu();
    initFloatObserver();
    initBackToTop();
    initLanguageSystem();
    initFeedback(feedbackRef, push);
    initVisitorTracker(database, false);

    window.addEventListener('languageChanged', () => callUpdateLogin());

    const successModal = document.getElementById('success-modal');
    const loginModal = document.getElementById('login-modal');
    document.getElementById('success-close')?.addEventListener('click', () => closeModal(successModal));
    successModal?.querySelector('.absolute.inset-0')?.addEventListener('click', () => closeModal(successModal));
    document.getElementById('login-cancel')?.addEventListener('click', () => closeModal(loginModal));
    loginModal?.querySelector('.absolute.inset-0')?.addEventListener('click', () => closeModal(loginModal));
    document.addEventListener('keydown', ev => {
        if (ev.key === 'Escape') [successModal, loginModal].forEach(m => closeModal(m));
    });

    initAuth({
        auth, database, ref, onValue,
        signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged,
        updateLoginFn: callUpdateLogin
    });
});
