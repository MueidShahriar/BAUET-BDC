import { initLanguageSystem, t } from './language-ui.js?v=6';

const wideViewport = window.matchMedia('(min-width: 1024px)');

const adminSectionLinks = [
    ['events', 'fa-calendar-days', 'navEvents', 'Events'],
    ['recent', 'fa-hand-holding-droplet', 'adminRecentDonations', 'Recent Donations'],
    ['members', 'fa-users', 'adminMembers', 'Members'],
    ['search', 'fa-magnifying-glass', 'searchTitle', 'Find Donors'],
    ['feedback', 'fa-comment-dots', 'adminFeedback', 'Feedback']
];

function ensureAdminMobileSections(header) {
    const links = header.querySelector('.navbar-mobile-links');
    if (!links || links.querySelector('.admin-mobile-sections')) return;
    const inPages = window.location.pathname.includes('/pages/');
    const group = document.createElement('div');
    group.className = 'admin-mobile-sections hidden';
    group.setAttribute('aria-label', 'Admin sections');
    group.innerHTML = adminSectionLinks.map(([page, icon, key, label]) => `
        <a id="admin-mobile-${page}-link" href="${inPages ? '' : 'pages/'}admin-${page}.html">
            <i class="fa-solid ${icon}" aria-hidden="true"></i>
            <span data-i18n="${key}">${t(key) || label}</span>
        </a>`).join('');
    const profileLink = links.querySelector('#admin-mobile-profile-link');
    links.insertBefore(group, profileLink || null);
    const currentSection = document.body.dataset.adminSection;
    if (currentSection) {
        group.querySelector(`#admin-mobile-${currentSection}-link`)?.setAttribute('aria-current', 'page');
    }
}

export function syncAdminNavbar(isAdmin) {
    const header = document.querySelector('.site-navbar');
    if (!header) return;
    ensureAdminMobileSections(header);
    const brand = header.querySelector('.navbar-brand');
    if (brand) {
        brand.dataset.publicHref ||= brand.getAttribute('href') || '';
        brand.setAttribute('href', isAdmin
            ? (window.location.pathname.includes('/pages/') ? 'admin.html' : 'pages/admin.html')
            : brand.dataset.publicHref);
    }
    const publicLinks = /^(?:nav|mobile)-(?:home|about|how|events|join|search|leaderboard|contact)-link$/;
    header.querySelectorAll('a[id]').forEach(link => {
        if (publicLinks.test(link.id)) link.classList.toggle('hidden', isAdmin);
    });
    const isDashboard = Boolean(document.getElementById('admin-panel'));
    header.querySelectorAll('#nav-dashboard-link, #admin-mobile-link').forEach(link => {
        link.classList.toggle('hidden', !isAdmin || isDashboard);
    });
    header.querySelectorAll('#nav-admin-profile-link, #admin-mobile-profile-link').forEach(link => {
        const mobileProfile = link.id === 'admin-mobile-profile-link';
        link.classList.toggle('hidden', !isAdmin || mobileProfile || link.getAttribute('aria-current') === 'page');
    });
    header.querySelector('.admin-mobile-sections')?.classList.toggle('hidden', !isAdmin);
}

export function initHeader() {
    const header = document.querySelector('.site-navbar');
    if (!header || header.dataset.navbarInitialized) return;
    header.dataset.navbarInitialized = 'true';

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
if (document.querySelector('[data-standalone-navbar]')) initLanguageSystem();
