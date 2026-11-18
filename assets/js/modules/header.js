import { initLanguageSystem } from './language-ui.js?v=6';

const wideViewport = window.matchMedia('(min-width: 1024px)');

export function syncAdminNavbar(isAdmin) {
    const header = document.querySelector('.site-navbar');
    if (!header) return;
    const publicLinks = /^(?:nav|mobile)-(?:home|about|how|events|join|search|leaderboard|contact)-link$/;
    header.querySelectorAll('a[id]').forEach(link => {
        if (publicLinks.test(link.id)) link.classList.toggle('hidden', isAdmin);
    });
    const isDashboard = Boolean(document.getElementById('admin-panel'));
    header.querySelectorAll('#nav-dashboard-link, #admin-mobile-link').forEach(link => {
        link.classList.toggle('hidden', !isAdmin || isDashboard);
    });
    header.querySelectorAll('#nav-admin-profile-link, #admin-mobile-profile-link').forEach(link => {
        link.classList.toggle('hidden', !isAdmin || link.getAttribute('aria-current') === 'page');
    });
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
