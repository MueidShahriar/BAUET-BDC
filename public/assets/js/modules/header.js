import { initLanguageSystem, t } from './language-ui.js?v=7';

const wideViewport = window.matchMedia('(min-width: 1024px)');
const pagesPrefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
const dashboardHref = `${pagesPrefix}admin.html`;

function initServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(window.location.protocol)) return;

    const register = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                updateViaCache: 'none'
            });
            await registration.update();
        } catch (error) {
            console.warn('Service worker registration failed:', error);
        }
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
}

const adminSectionLinks = [
    ['dashboard', 'fa-gauge-high', 'navDashboard', 'Dashboard', dashboardHref],
    ['profile', 'fa-user', 'profileTitle', 'My Profile', `${pagesPrefix}profile.html`],
    ['events', 'fa-calendar-days', 'navEvents', 'Events'],
    ['recent', 'fa-hand-holding-droplet', 'adminRecentDonations', 'Recent Donations'],
    ['members', 'fa-users', 'adminMembers', 'Members'],
    ['search', 'fa-magnifying-glass', 'searchTitle', 'Find Donors'],
    ['feedback', 'fa-comment-dots', 'adminFeedback', 'Feedback'],
    ['requests', 'fa-hand-holding-medical', '', 'Blood Requests', `${dashboardHref}?section=requests`]
];

function ensureAdminMobileSections(header) {
    const links = header.querySelector('.navbar-mobile-links');
    if (!links || links.querySelector('.admin-mobile-sections')) return;
    const group = document.createElement('div');
    group.className = 'admin-mobile-sections hidden';
    group.setAttribute('aria-label', 'Admin sections');
    group.innerHTML = adminSectionLinks.map(([page, icon, key, label, href]) => `
        <a id="admin-section-mobile-${page}-link" href="${href || `${pagesPrefix}admin-${page}.html`}">
            <i class="fa-solid ${icon}" aria-hidden="true"></i>
            <span${key ? ` data-i18n="${key}"` : ''}>${key ? (t(key) || label) : label}</span>
        </a>`).join('');
    const profileLink = links.querySelector('#admin-mobile-profile-link');
    links.insertBefore(group, profileLink || null);
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    const currentSection = document.body.dataset.adminSection
        || requestedSection
        || (window.location.pathname.endsWith('/profile.html') ? 'profile' : '')
        || (window.location.pathname.endsWith('/admin.html') ? 'dashboard' : '');
    if (currentSection) {
        group.querySelector(`#admin-section-mobile-${currentSection}-link`)?.setAttribute('aria-current', 'page');
    }
}

function ensureBloodRequestLinks(header) {
    const requestHref = `${pagesPrefix}request-blood.html`;
    const desktopLinks = header.querySelector('.navbar-desktop-links');
    if (desktopLinks && !desktopLinks.querySelector('#nav-request-link')) {
        const link = document.createElement('a');
        link.id = 'nav-request-link';
        link.href = requestHref;
        link.innerHTML = '<i class="fa-solid fa-droplet" aria-hidden="true"></i><span>Request Blood</span>';
        desktopLinks.insertBefore(link, desktopLinks.querySelector('#nav-contact-link'));
    }
    const mobileLinks = header.querySelector('.navbar-mobile-links');
    if (mobileLinks && !mobileLinks.querySelector('#mobile-request-link')) {
        const link = document.createElement('a');
        link.id = 'mobile-request-link';
        link.href = requestHref;
        link.innerHTML = '<i class="fa-solid fa-droplet" aria-hidden="true"></i><span>Request Blood</span>';
        mobileLinks.insertBefore(link, mobileLinks.querySelector('#admin-mobile-link, #admin-mobile-profile-link'));
    }
}

export function syncAdminNavbar(isAdmin) {
    const header = document.querySelector('.site-navbar');
    if (!header) return;
    ensureAdminMobileSections(header);
    const brand = header.querySelector('.navbar-brand');
    if (brand) {
        brand.dataset.publicHref ||= brand.getAttribute('href') || '';
        brand.setAttribute('href', isAdmin ? dashboardHref : brand.dataset.publicHref);
    }
    const publicLinks = /^(?:nav|mobile)-(?:home|about|how|events|join|search|leaderboard|request|contact)-link$/;
    header.querySelectorAll('a[id]').forEach(link => {
        if (publicLinks.test(link.id)) link.classList.toggle('hidden', isAdmin);
    });
    const isDashboard = window.location.pathname.endsWith('/admin.html');
    header.querySelectorAll('#nav-dashboard-link').forEach(link => {
        link.classList.toggle('hidden', !isAdmin || isDashboard);
    });
    header.querySelector('#admin-mobile-link')?.classList.add('hidden');
    header.querySelectorAll('#nav-admin-profile-link').forEach(link => {
        link.classList.toggle('hidden', !isAdmin || link.getAttribute('aria-current') === 'page');
    });
    header.querySelector('#admin-mobile-profile-link')?.classList.add('hidden');
    header.querySelector('.admin-mobile-sections')?.classList.toggle('hidden', !isAdmin);
}

async function initStandaloneAdminNavbar() {
    const [appSdk, authSdk, databaseSdk, { firebaseConfig }] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js'),
        import('./firebase-config.js')
    ]);
    const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    const database = databaseSdk.getDatabase(app);
    const { get, ref } = databaseSdk;

    authSdk.onAuthStateChanged(auth, (user) => {
        syncAdminNavbar(false);
        if (!user) return;

        const revealDashboard = (isAdmin) => {
            if (isAdmin && auth.currentUser === user) syncAdminNavbar(true);
        };
        get(ref(database, `admins/${user.uid}`)).then(
            snapshot => revealDashboard(Boolean(snapshot.val())), () => {}
        );
        get(ref(database, `donors/${user.uid}/role`)).then(
            snapshot => revealDashboard(snapshot.val() === 'admin'), () => {}
        );
    });
}

export function initHeader() {
    const header = document.querySelector('.site-navbar');
    if (!header || header.dataset.navbarInitialized) return;
    header.dataset.navbarInitialized = 'true';
    ensureBloodRequestLinks(header);

    const syncHeaderHeight = () => {
        if (header.offsetHeight) {
            document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
        }
    };
    syncHeaderHeight();
    if ('ResizeObserver' in window) {
        new ResizeObserver(syncHeaderHeight).observe(header);
    } else {
        window.addEventListener('resize', syncHeaderHeight, { passive: true });
    }
}

export function initMobileMenu() {
    const header = document.querySelector('.site-navbar');
    const toggle = header?.querySelector('#menu-toggle');
    const menu = header?.querySelector('#mobile-menu');
    if (!toggle || !menu || toggle.dataset.navbarInitialized) return;
    toggle.dataset.navbarInitialized = 'true';

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
        menu.classList.toggle('hidden', !open);
        toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => {
        setOpen(!isOpen() && !wideViewport.matches);
        if (isOpen()) {
            const firstVisibleItem = Array.from(menu.querySelectorAll('a[href], button:not([disabled])'))
                .find(item => item.getClientRects().length > 0);
            firstVisibleItem?.focus();
        }
    });

    menu.addEventListener('click', (event) => {
        if (event.target.closest('a[href], button')) setOpen(false);
    }, { capture: true });

    const closeOutside = (event) => {
        if (isOpen() && !menu.contains(event.target) && !toggle.contains(event.target)) {
            setOpen(false);
        }
    };
    document.addEventListener('click', closeOutside);
    document.addEventListener('focusin', closeOutside);
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !isOpen()) return;
        setOpen(false);
        toggle.focus();
    });
    wideViewport.addEventListener('change', () => setOpen(false));
}

initHeader();
initMobileMenu();
initServiceWorker();
if (document.querySelector('#page-loader.admin-page-preloader')) {
    import('./preloader.js?v=9')
        .then(({ initPreloader }) => initPreloader({ waitForAuth: true, maxWaitMs: 15000 }))
        .catch(error => console.warn('Could not initialize admin preloader:', error));
}
if (document.querySelector('[data-standalone-navbar]')) {
    initLanguageSystem();
    initStandaloneAdminNavbar().catch(error => console.warn('Could not load admin navigation:', error));
}
