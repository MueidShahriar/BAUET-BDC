import state from './state.js';
import { openModal, closeModal, showModalMessage } from './modals.js';
import { t } from './language-ui.js?v=7';
import { getDefaultAvatarImageUrl } from './utils.js';
import { updateBirthdayWish } from './birthday-wish.js?v=6';
import { getFriendlyAuthError } from './auth-errors.js?v=2';
import { syncAdminNavbar } from './header.js?v=17';

function getAuthRedirectOverlay() {
    let overlay = document.getElementById('auth-redirect-overlay');
    if (!overlay) {
        const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
        overlay = document.createElement('div');
        overlay.id = 'auth-redirect-overlay';
        overlay.className = 'auth-redirect-overlay';
        overlay.innerHTML =
            '<div class="logo-wrapper">' +
                '<div class="logo-base">' +
                    '<img src="' + assetPrefix + 'image/blood-drop.png" alt="" />' +
                '</div>' +
                '<div class="logo-fill">' +
                    '<img src="' + assetPrefix + 'image/blood-drop.png" alt="Loading" />' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
    }
    return overlay;
}

function showAuthRedirectOverlay() {
    if (state.isAuthRedirecting) return;
    state.isAuthRedirecting = true;
    const overlay = getAuthRedirectOverlay();
    overlay.classList.add('is-visible');
    document.body.classList.add('auth-redirecting');
}

function hideAuthRedirectOverlay() {
    if (!state.isAuthRedirecting) return;
    state.isAuthRedirecting = false;
    const overlay = document.getElementById('auth-redirect-overlay');
    if (overlay) overlay.classList.remove('is-visible');
    document.body.classList.remove('auth-redirecting');
}

function getProfileHref() {
    const path = window.location.pathname || '';
    return path.includes('/pages/') ? 'profile.html' : 'pages/profile.html';
}

function getAdminHref() {
    const path = window.location.pathname || '';
    return path.includes('/pages/') ? 'admin.html' : 'pages/admin.html';
}

function restoreLoginButton(button) {
    if (!button) return;
    button.removeAttribute('aria-label');
    button.removeAttribute('title');
    button.removeAttribute('data-i18n');
    button.innerHTML = '<i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>' +
        '<span data-i18n="btnLogin"></span>';
    button.lastElementChild.textContent = t('btnLogin');
}

export function updateLoginButtonState(database, ref, onValue, afterRoleResolvedFn) {
    if (state.isAuthRedirecting) return;
    const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
    const isAdminPage = /\/(?:pages\/)?admin(?:-(?:events|recent|members|search|feedback))?\.html$/i.test(window.location.pathname || '');
    const loginBtn = document.getElementById('login-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const profileUserId = document.getElementById('profile-userId');
    const adminPanel = document.getElementById('admin-panel');
    const adminBadge = document.getElementById('admin-badge');
    const leaderboardSections = document.querySelectorAll('#donor-leaderboard, #leaderboard-section, [data-public-leaderboard]');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');
    
    if (!loginBtn && !mobileLoginBtn) return;
    const desktopLogoutBtn = document.getElementById('navbar-logout-btn');
    const user = state.currentUser;
    desktopLogoutBtn?.classList.toggle('hidden', !user);
    mobileLogoutBtn?.classList.toggle('hidden', !user);
    if (user) {
        if (profileUserId) profileUserId.textContent = `User ID: ${user.uid}`;
        let userData;
        let isAdminFlag;
        let roleApplied = false;

        function applyUserRole() {
            if (state.currentUser?.uid !== user.uid) return;
            const isAdmin = isAdminFlag === true || userData?.role === 'admin';
            if (roleApplied || (!isAdmin && (isAdminFlag === undefined || !userData))) return;
            roleApplied = true;
            state.currentUserRole = isAdmin ? 'admin' : (userData.role || 'member');
            syncAdminNavbar(isAdmin);
            if (adminPanel) {
                adminPanel.hidden = !isAdmin;
                adminPanel.classList.toggle('hidden', !isAdmin);
            }
            document.body.classList.toggle('admin-mode', isAdmin);
            leaderboardSections.forEach(section => section.classList.toggle('hidden', isAdmin));
            adminBadge?.classList.add('hidden');
            adminBadge?.classList.remove('inline-flex');
            hideAuthRedirectOverlay();
            afterRoleResolvedFn?.(state.currentUserRole);
            if (isAdminPage && !isAdmin) window.location.assign(getProfileHref());
        }

        function applyUserProfile(profile) {
            if (state.currentUser?.uid !== user.uid) return;
            userData = profile;
            const photoUrl = userData.profilePhoto || getDefaultAvatarImageUrl(userData.gender);
            const profileLabel = t('btnProfile');
            for (const button of [loginBtn, mobileProfileBtn]) {
                if (!button) continue;
                const avatar = document.createElement('img');
                avatar.src = photoUrl;
                avatar.decoding = 'async';
                avatar.alt = '';
                if (button === loginBtn) avatar.className = 'nav-avatar';
                button.replaceChildren(avatar);
                button.setAttribute('aria-label', profileLabel);
                button.setAttribute('title', profileLabel);
            }
            if (loginBtn) {
                loginBtn.classList.add('nav-avatar-btn');
                loginBtn.dataset.state = 'loggedin';
                loginBtn.removeAttribute('data-i18n');
            }
            mobileProfileBtn?.classList.remove('hidden');
            mobileLoginBtn?.classList.add('hidden');
            state.currentUserProfile = { ...userData, uid: user.uid };
            updateBirthdayWish(state.currentUserProfile);
            applyUserRole();
        }

        function resolveAdminFlag(isAdmin) {
            isAdminFlag = isAdmin;
            applyUserRole();
        }

        const adminRef = ref(database, `admins/${user.uid}`);
        const userRef = ref(database, `donors/${user.uid}`);
        onValue(adminRef, snapshot => resolveAdminFlag(Boolean(snapshot.val())), () => resolveAdminFlag(false), { onlyOnce: true });
        onValue(userRef, snapshot => applyUserProfile(snapshot.val() || {}), () => applyUserProfile({}), { onlyOnce: true });
    } else {
        if (loginBtn) {
            restoreLoginButton(loginBtn);
            loginBtn.dataset.state = 'loggedout';
            loginBtn.classList.remove('nav-avatar-btn');
        }
        if (mobileProfileBtn) {
            mobileProfileBtn.classList.add('hidden');
            mobileProfileBtn.innerHTML = '<span class="mobile-profile-btn__initials">U</span>';
        }
        if (mobileLoginBtn) {
            mobileLoginBtn.classList.remove('hidden');
            restoreLoginButton(mobileLoginBtn);
        }
        if (profileUserId) profileUserId.textContent = '';
        state.currentUserProfile = null;
        state.currentUserRole = 'member';
        updateBirthdayWish(null);
        if (adminPanel) {
            adminPanel.hidden = true;
            adminPanel.classList.add('hidden');
        }
        document.body.classList.remove('admin-mode');
        leaderboardSections.forEach(section => section.classList.remove('hidden'));
        adminBadge?.classList.add('hidden');
        syncAdminNavbar(false);
        
        hideAuthRedirectOverlay();
        if (isAdminPage) {
            window.location.assign(assetPrefix ? '../index.html' : 'index.html');
        }
    }
}

export function initAuth({
    auth, database, ref, onValue, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged,
    updateLoginFn
}) {
    const loginModal = document.getElementById('login-modal');
    const loginBtn = document.getElementById('login-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');
    const loginForm = document.getElementById('login-form');
    const mobileMenu = document.getElementById('mobile-menu');

    function handleLoginClick() {
        if (state.currentUser) {
            window.location.href = getProfileHref();
        } else {
            openModal(loginModal);
        }
    }
    loginBtn?.addEventListener('click', handleLoginClick);
    mobileLoginBtn?.addEventListener('click', () => {
        if (mobileMenu) closeModal(mobileMenu);
        handleLoginClick();
    });
    mobileProfileBtn?.addEventListener('click', handleLoginClick);

    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

    const doLogout = () => {
        signOut(auth).then(() => {
            showModalMessage('success-modal', 'You have been logged out successfully.', 'Logout Successful');
        }).catch((error) => {
            console.error('Logout failed:', error);
            showModalMessage('success-modal', 'An error occurred during logout.', 'Logout Failed');
        });
    };

    document.getElementById('navbar-logout-btn')?.addEventListener('click', doLogout);
    mobileLogoutBtn?.addEventListener('click', () => {
        if (mobileMenu) closeModal(mobileMenu);
        doLogout();
    });

    loginForm?.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const email = document.getElementById('login-email')?.value?.trim();
        const password = document.getElementById('login-password')?.value;
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                state.currentUser = userCredential.user;
                showAuthRedirectOverlay();
                if (typeof updateLoginFn === 'function') updateLoginFn();
                closeModal(loginModal);
                const userRef = ref(database, `donors/${state.currentUser.uid}`);
                onValue(userRef, (userSnapshot) => {
                    const userData = userSnapshot.val() || {};
                    const adminRef = ref(database, `admins/${state.currentUser.uid}`);
                    onValue(adminRef, (adminSnapshot) => {
                        const isAdmin = Boolean(adminSnapshot.val()) || userData.role === 'admin';
                        window.location.assign(isAdmin ? getAdminHref() : getProfileHref());
                    }, () => {
                        window.location.assign(userData.role === 'admin' ? getAdminHref() : getProfileHref());
                    }, { onlyOnce: true });
                }, { onlyOnce: true });
            })
            .catch((error) => {
                showModalMessage('success-modal', getFriendlyAuthError(error, 'login'), t('authLoginFailedTitle'));
            });
    });

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    forgotPasswordLink?.addEventListener('click', (ev) => {
        ev.preventDefault();
        const email = document.getElementById('login-email')?.value?.trim();
        if (!email) {
            showModalMessage('success-modal', 'Please enter your email to reset the password.', 'Email Required');
            return;
        }
        sendPasswordResetEmail(auth, email)
            .then(() => {
                showModalMessage('success-modal', `A password reset link has been sent to ${email}. Please check your inbox.`, 'Password Reset Sent');
                closeModal(loginModal);
            })
            .catch((error) => {
                showModalMessage('success-modal', getFriendlyAuthError(error, 'reset'), t('authResetTitle'));
            });
    });

    const pwToggle = document.getElementById('toggle-password');
    const pwInput = document.getElementById('login-password');
    function syncPasswordToggle() {
        if (!pwToggle || !pwInput) return;
        const isVisible = pwInput.type === 'text';
        const labelKey = isVisible ? 'loginHidePassword' : 'loginShowPassword';
        const label = t(labelKey);
        pwToggle.dataset.i18n = labelKey;
        pwToggle.setAttribute('aria-label', label);
        pwToggle.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
        pwToggle.title = label;
        pwToggle.querySelector('i')?.classList.toggle('fa-eye', !isVisible);
        pwToggle.querySelector('i')?.classList.toggle('fa-eye-slash', isVisible);
    }

    syncPasswordToggle();
    pwToggle?.addEventListener('click', () => {
        if (!pwInput) return;
        const isHidden = pwInput.getAttribute('type') === 'password';
        pwInput.setAttribute('type', isHidden ? 'text' : 'password');
        syncPasswordToggle();
    });
    window.addEventListener('languageChanged', syncPasswordToggle);

    onAuthStateChanged(auth, (user) => {
        state.currentUser = user;
        if (!user) state.currentUserProfile = null;
        updateLoginFn();
    });
}
