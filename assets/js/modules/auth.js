import state from './state.js';
import { openModal, closeModal, showModalMessage } from './modals.js';
import { t } from './language-ui.js?v=2';
import { getTextValue, getDefaultAvatarImageUrl } from './utils.js';
import { updateBirthdayWish } from './birthday-wish.js?v=5';
import { getFriendlyAuthError } from './auth-errors.js?v=1';

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

export function updateLoginButtonState(database, ref, onValue, renderAdminMembersList, renderAdminEventsList, deleteMemberFn, deleteEventFn, afterRoleResolvedFn, promoteMemberFn, demoteMemberFn, toggleMemberStatusFn) {
    if (state.isAuthRedirecting) return;
    const assetPrefix = window.location.pathname.includes('/pages/') ? '../' : '';
    const isAdminPage = /\/(pages\/)?admin\.html$/i.test(window.location.pathname || '');
    const loginBtn = document.getElementById('login-btn');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const profileUserId = document.getElementById('profile-userId');
    const adminPanel = document.getElementById('admin-panel');
    const adminBadge = document.getElementById('admin-badge');
    const adminMobileLink = document.getElementById('admin-mobile-link');
    const adminDesktopLink = document.getElementById('nav-dashboard-link');
    const leaderboardSections = document.querySelectorAll('#donor-leaderboard, #leaderboard-section, [data-public-leaderboard]');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');
    
    const navLinkIds = ['nav-home-link','nav-about-link','nav-how-link','nav-events-link','nav-join-link','nav-search-link','nav-leaderboard-link','nav-contact-link'];
    const mobileNavIds = ['mobile-home-link','mobile-about-link','mobile-how-link','mobile-events-link','mobile-join-link','mobile-search-link','mobile-leaderboard-link','mobile-contact-link'];
    if (!loginBtn && !mobileLoginBtn) return;
    if (state.currentUser) {
        if (mobileLogoutBtn) { mobileLogoutBtn.classList.remove('hidden'); mobileLogoutBtn.classList.add('block'); }
        if (profileUserId) profileUserId.textContent = `User ID: ${state.currentUser.uid}`;
        const userRef = ref(database, `donors/${state.currentUser.uid}`);
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val() || {};
            
            const adminRef = ref(database, `admins/${state.currentUser.uid}`);
            onValue(adminRef, (adminSnap) => {
                const isAdminFlag = !!adminSnap.val();
                state.currentUserRole = isAdminFlag ? 'admin' : (userData.role || 'member');

                
                applyUserUiUpdates(userData);
            }, () => {
                // Non-admin accounts are not allowed to read the admins collection.
                // Their donor profile still supplies the existing member-role fallback.
                state.currentUserRole = userData.role || 'member';
                applyUserUiUpdates(userData);
            }, { onlyOnce: true });
            
            function applyUserUiUpdates(resolvedUserData) {
                state.currentUserProfile = { ...resolvedUserData, uid: state.currentUser?.uid || null };
                updateBirthdayWish(state.currentUserProfile);
                const photoUrl = resolvedUserData.profilePhoto || getDefaultAvatarImageUrl(resolvedUserData.gender);
                const displayName = getTextValue(resolvedUserData.fullName || resolvedUserData.name, 'User');
                if (loginBtn) {
                    loginBtn.innerHTML = '<img src="' + photoUrl + '" alt="' + t('btnProfile') + '" class="nav-avatar"><span class="sr-only">' + t('btnProfile') + '</span>';
                    loginBtn.classList.add('nav-avatar-btn');
                    loginBtn.setAttribute('aria-label', t('btnProfile'));
                    loginBtn.setAttribute('title', t('btnProfile'));
                    loginBtn.dataset.state = 'loggedin';
                    loginBtn.removeAttribute('data-i18n');
                }
                if (mobileProfileBtn) {
                    mobileProfileBtn.innerHTML = '<img src="' + photoUrl + '" alt="' + t('btnProfile') + '">';
                    mobileProfileBtn.classList.remove('hidden');
                    mobileProfileBtn.setAttribute('aria-label', t('btnProfile'));
                    mobileProfileBtn.setAttribute('title', t('btnProfile'));
                }
                if (mobileLoginBtn) {
                    mobileLoginBtn.classList.add('hidden');
                }

                if (state.currentUserRole === 'admin') {
                    adminPanel?.classList.remove('hidden');
                    document.body.classList.add('admin-mode');
                    leaderboardSections.forEach(section => section.classList.add('hidden'));
                    if (adminBadge) { adminBadge.classList.add('hidden'); adminBadge.classList.remove('inline-flex'); }
                    navLinkIds.forEach(id => document.getElementById(id)?.classList.add('hidden'));
                    mobileNavIds.forEach(id => document.getElementById(id)?.classList.add('hidden'));
                    adminMobileLink?.classList.remove('hidden');
                    if (adminDesktopLink) { adminDesktopLink.classList.remove('hidden'); }
                    renderAdminMembersList(deleteMemberFn, promoteMemberFn, demoteMemberFn, toggleMemberStatusFn);
                    renderAdminEventsList(deleteEventFn);
                } else {
                    adminPanel?.classList.add('hidden');
                    document.body.classList.remove('admin-mode');
                    leaderboardSections.forEach(section => section.classList.remove('hidden'));
                    if (adminBadge) { adminBadge.classList.add('hidden'); adminBadge.classList.remove('inline-flex'); }
                    adminMobileLink?.classList.add('hidden');
                    if (adminDesktopLink) { adminDesktopLink.classList.add('hidden'); }
                    navLinkIds.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
                    mobileNavIds.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
                }
                hideAuthRedirectOverlay();
                if (typeof afterRoleResolvedFn === 'function') afterRoleResolvedFn(state.currentUserRole);
                if (isAdminPage && state.currentUserRole !== 'admin') {
                    window.location.assign(getProfileHref());
                }
            }
            const photoUrl = userData.profilePhoto || getDefaultAvatarImageUrl(userData.gender);
            const displayName = getTextValue(userData.fullName || userData.name, 'User');
            if (loginBtn) {
                loginBtn.innerHTML = '<img src="' + photoUrl + '" alt="' + t('btnProfile') + '" class="nav-avatar"><span class="sr-only">' + t('btnProfile') + '</span>';
                loginBtn.classList.add('nav-avatar-btn');
                loginBtn.setAttribute('aria-label', t('btnProfile'));
                loginBtn.setAttribute('title', t('btnProfile'));
                loginBtn.dataset.state = 'loggedin';
                loginBtn.removeAttribute('data-i18n');
            }
            if (mobileProfileBtn) {
                mobileProfileBtn.innerHTML = '<img src="' + photoUrl + '" alt="' + t('btnProfile') + '">';
                mobileProfileBtn.classList.remove('hidden');
                mobileProfileBtn.setAttribute('aria-label', t('btnProfile'));
                mobileProfileBtn.setAttribute('title', t('btnProfile'));
            }
            
        }, { onlyOnce: true });
    } else {
        if (loginBtn) {
            loginBtn.innerHTML = '<img src="' + assetPrefix + 'image/login.png" alt="Login" class="inline-icon"> ' + t('btnLogin');
            loginBtn.dataset.state = 'loggedout';
            loginBtn.setAttribute('data-i18n', 'btnLogin');
            loginBtn.classList.remove('nav-avatar-btn');
        }
        if (mobileProfileBtn) {
            mobileProfileBtn.classList.add('hidden');
            mobileProfileBtn.innerHTML = '<span class="mobile-profile-btn__initials">U</span>';
        }
        if (mobileLoginBtn) {
            mobileLoginBtn.classList.remove('hidden');
            mobileLoginBtn.innerHTML = '<img src="' + assetPrefix + 'image/login.png" alt="Login" class="inline-icon"> ' + t('btnLogin');
            mobileLoginBtn.setAttribute('data-i18n', 'btnLogin');
        }
        if (mobileLogoutBtn) { mobileLogoutBtn.classList.add('hidden'); mobileLogoutBtn.classList.remove('block'); }
        if (profileUserId) profileUserId.textContent = '';
        state.currentUserProfile = null;
        updateBirthdayWish(null);
        adminPanel?.classList.add('hidden');
        document.body.classList.remove('admin-mode');
        leaderboardSections.forEach(section => section.classList.remove('hidden'));
        adminBadge?.classList.add('hidden');
        adminMobileLink?.classList.add('hidden');
        if (adminDesktopLink) { adminDesktopLink.classList.add('hidden'); }
        
        navLinkIds.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
        mobileNavIds.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
        hideAuthRedirectOverlay();
        if (isAdminPage) {
            window.location.assign(assetPrefix ? '../index.html' : 'index.html');
        }
    }
}

export function initAuth({
    auth, database, ref, onValue, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged,
    renderAdminMembersFn, renderAdminEventsFn, deleteMemberFn, deleteEventFn, updateLoginFn
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
