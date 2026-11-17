import { t } from './language-ui.js?v=2';

export function initHeader() {
    const header = document.querySelector('header');
    const isAdminDashboard = /\/(?:pages\/)?admin\.html$/i.test(window.location.pathname || '');
    const menuToggle = document.getElementById('menu-toggle');
    const desktopLinks = Array.from(
        document.querySelectorAll('header nav a[id^="nav-"]')
    );
    const mobileLinks = Array.from(
        document.querySelectorAll('#mobile-menu a[id^="mobile-"]')
    );
    const ctaButtons = Array.from(
        document.querySelectorAll(
            '#login-btn, #pf-logout-header, #mobile-login-btn, #mobile-logout-btn'
        )
    );

    if (header) {
        header.classList.add('site-header');
    }
    if (isAdminDashboard) {
        document.body.classList.add('admin-dashboard-menu');
    }

    desktopLinks.forEach((link) => {
        link.classList.add('nav-link');
        if (
            link.classList.contains('bg-red-50') ||
            link.classList.contains('font-bold')
        ) {
            link.classList.add('nav-link--active');
        }
    });

    const desktopMenu = desktopLinks[0]?.parentElement;
    if (desktopMenu) {
        desktopMenu.id = 'desktop-nav-menu';
        desktopMenu.classList.remove('hidden', 'md:flex', 'flex', 'items-center', 'gap-1', 'text-base', 'font-medium', 'flex-1');
        desktopMenu.classList.add('desktop-nav-menu');

        if (isAdminDashboard) {
            const loginButton = document.getElementById('login-btn');
            if (loginButton && !desktopMenu.contains(loginButton)) {
                loginButton.classList.add('desktop-menu-account');
                desktopMenu.append(loginButton);
            }
        }

        let desktopMenuToggle = document.getElementById('desktop-menu-toggle');
        if (!desktopMenuToggle) {
            desktopMenuToggle = document.createElement('button');
            desktopMenuToggle.id = 'desktop-menu-toggle';
            desktopMenuToggle.type = 'button';
            desktopMenuToggle.className = 'desktop-menu-toggle';
            desktopMenuToggle.setAttribute('aria-controls', 'desktop-nav-menu');
            desktopMenuToggle.setAttribute('aria-expanded', 'false');
            desktopMenuToggle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span data-i18n="desktopMenuLabel">Menu</span>`;

            const loginButton = document.getElementById('login-btn');
            const actionHost = (isAdminDashboard ? menuToggle?.parentElement : loginButton?.parentElement) || menuToggle?.parentElement;
            const reference = (isAdminDashboard ? menuToggle : loginButton) || menuToggle || null;
            if (actionHost) actionHost.insertBefore(desktopMenuToggle, reference);
        }

        const syncDesktopMenuLabel = () => {
            const label = t('desktopMenuLabel');
            desktopMenuToggle.title = label;
            desktopMenuToggle.setAttribute('aria-label', label);
            const labelNode = desktopMenuToggle.querySelector('span');
            if (labelNode) labelNode.textContent = label;
        };
        syncDesktopMenuLabel();
        if (desktopMenuToggle.dataset.languageBound !== 'true') {
            window.addEventListener('languageChanged', syncDesktopMenuLabel);
            desktopMenuToggle.dataset.languageBound = 'true';
        }
    }

    mobileLinks.forEach((link) => {
        link.classList.add('mobile-nav-link');
        if (
            link.classList.contains('bg-red-50') ||
            link.classList.contains('font-bold')
        ) {
            link.classList.add('mobile-nav-link--active');
        }
    });

    ctaButtons.forEach((button) => {
        if (
            button.id === 'mobile-login-btn' ||
            button.id === 'mobile-logout-btn'
        ) {
            return;
        }

        button.classList.add('nav-cta');
    });

    if (menuToggle && !document.getElementById('mobile-profile-btn')) {
        const btn = document.createElement('button');
        btn.id = 'mobile-profile-btn';
        btn.type = 'button';
        btn.className = 'mobile-profile-btn hidden';
        btn.setAttribute('aria-label', 'Profile');
        btn.innerHTML = '<span class="mobile-profile-btn__initials">U</span>';
        menuToggle.parentElement?.insertBefore(btn, menuToggle);
    }
    function setHeaderOffset() {
        const h = header ? header.offsetHeight : 0;
        document.documentElement.style.setProperty('--header-height', h + 'px');
    }
    setHeaderOffset();

    
    let resizeTimer;
    const debouncedOffset = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(setHeaderOffset, 100); };
    window.addEventListener('resize', debouncedOffset);
    if ('ResizeObserver' in window) {
        new ResizeObserver(debouncedOffset).observe(document.body);
    }

    
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            if (header) {
                header.classList.toggle('scrolled', window.scrollY > 50);
            }
            ticking = false;
        });
    }, { passive: true });
}

export function initMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const desktopMenuToggle = document.getElementById('desktop-menu-toggle');
    const desktopMenu = document.getElementById('desktop-nav-menu');
    function setMenuOpen(open) {
        if (!mobileMenu || !menuToggle) return;
        mobileMenu.classList.toggle('hidden', !open);
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    menuToggle?.addEventListener('click', (ev) => {
        if (!mobileMenu) return;
        const open = mobileMenu.classList.contains('hidden');
        setMenuOpen(open);
        ev.stopPropagation();
    });

    if (desktopMenuToggle && desktopMenu && desktopMenuToggle.dataset.initialized !== 'true') {
        const setDesktopMenuOpen = (open) => {
            desktopMenu.classList.toggle('is-open', open);
            desktopMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            document.querySelector('header')?.classList.toggle('desktop-menu-open', open);
        };

        desktopMenuToggle.addEventListener('click', (event) => {
            const open = desktopMenuToggle.getAttribute('aria-expanded') !== 'true';
            setDesktopMenuOpen(open);
            event.stopPropagation();
        });

        desktopMenu.querySelectorAll('a, button').forEach((link) => {
            link.addEventListener('click', () => setDesktopMenuOpen(false));
        });

        document.addEventListener('click', (event) => {
            const isOpen = desktopMenuToggle.getAttribute('aria-expanded') === 'true';
            const clickedInside = desktopMenu.contains(event.target) || desktopMenuToggle.contains(event.target);
            if (isOpen && !clickedInside) setDesktopMenuOpen(false);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && desktopMenuToggle.getAttribute('aria-expanded') === 'true') {
                setDesktopMenuOpen(false);
                desktopMenuToggle.focus();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth < 768) setDesktopMenuOpen(false);
        }, { passive: true });

        desktopMenuToggle.dataset.initialized = 'true';
    }

    mobileMenu?.querySelectorAll('a, button').forEach(a => {
        a.addEventListener('click', () => setMenuOpen(false));
    });
    document.addEventListener('click', (e) => {
        if (!mobileMenu || !menuToggle) return;
        const isOpen = !mobileMenu.classList.contains('hidden');
        const clickedInside = mobileMenu.contains(e.target) || menuToggle.contains(e.target);
        if (isOpen && !clickedInside) setMenuOpen(false);
    });
}
