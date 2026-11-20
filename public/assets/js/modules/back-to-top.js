export function initBackToTop() {
    let backToTopBtn = document.getElementById('back-to-top');

    // Some standalone long pages do not include the FAB markup. Create the
    // same shared control there instead of leaving those pages without it.
    if (!backToTopBtn) {
        const fabWrap = document.createElement('div');
        fabWrap.id = 'fab-wrap';
        fabWrap.className = 'fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2';

        backToTopBtn = document.createElement('button');
        backToTopBtn.id = 'back-to-top';
        backToTopBtn.type = 'button';
        backToTopBtn.setAttribute('aria-label', 'Back to top');
        backToTopBtn.title = 'Back to top';
        backToTopBtn.className = 'bg-red-600 text-white w-12 h-12 rounded-full shadow-lg hover:bg-red-700 transition-all text-lg flex items-center justify-center';
        backToTopBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>`;
        fabWrap.appendChild(backToTopBtn);
        document.body.appendChild(fabWrap);
    }

    backToTopBtn.setAttribute('aria-label', 'Back to top');
    backToTopBtn.closest('#fab-wrap')?.classList.add('z-[60]');

    // Protect against a page script being initialized more than once.
    if (backToTopBtn.dataset.initialized === 'true') return;
    backToTopBtn.dataset.initialized = 'true';

    const showAfterScroll = 120;
    let scrollAnimationFrame = 0;
    let scrollBehaviorRestore = null;

    function getScrollRoot() {
        const body = document.body;
        const html = document.documentElement;
        const bodyOverflow = getComputedStyle(body).overflowY;
        if (html.scrollHeight <= html.clientHeight + 1 &&
            body.scrollHeight > body.clientHeight &&
            (bodyOverflow === 'auto' || bodyOverflow === 'scroll')) {
            return body;
        }
        return document.scrollingElement || document.documentElement;
    }

    function updateBtn() {
        const scrollTop = Math.max(
            window.scrollY || 0,
            window.pageYOffset || 0,
            document.documentElement?.scrollTop || 0,
            document.body?.scrollTop || 0
        );
        const beyond = scrollTop > showAfterScroll;
        // Keep the control available near the bottom of long mobile pages too;
        // the footer should not make the only navigation shortcut disappear.
        backToTopBtn.classList.toggle('show', beyond);
        backToTopBtn.setAttribute('aria-hidden', beyond ? 'false' : 'true');
        backToTopBtn.tabIndex = beyond ? 0 : -1;
    }

    let ticking = false;
    const scheduleUpdate = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateBtn();
            ticking = false;
        });
    };
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    document.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true });
    window.addEventListener('pageshow', updateBtn);

    updateBtn();

    backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const scrollRoot = getScrollRoot();
        const startY = Math.max(
            window.scrollY || 0,
            scrollRoot.scrollTop || 0,
            document.documentElement.scrollTop || 0,
            document.body.scrollTop || 0
        );
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (scrollAnimationFrame) cancelAnimationFrame(scrollAnimationFrame);

        // A button avoids anchor/history navigation and always scrolls this
        // document. Drive the scroll frame-by-frame for consistent behavior.
        const previousBehavior = scrollBehaviorRestore ?? scrollRoot.style.scrollBehavior;
        scrollBehaviorRestore = previousBehavior;
        if (reducedMotion || startY <= 1) {
            scrollRoot.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            window.scrollTo(0, 0);
            scrollRoot.style.scrollBehavior = previousBehavior;
            scrollBehaviorRestore = null;
            scrollAnimationFrame = 0;
            updateBtn();
            return;
        }

        scrollRoot.style.scrollBehavior = 'auto';
        const duration = Math.min(1400, Math.max(700, startY * 0.04));
        let animationStart = null;
        const scrollFrame = (now) => {
            if (animationStart === null) animationStart = now;
            const progress = Math.min(1, (now - animationStart) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            scrollRoot.scrollTop = Math.max(0, startY * (1 - eased));

            if (progress < 1) {
                scrollAnimationFrame = requestAnimationFrame(scrollFrame);
                return;
            }

            scrollRoot.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            scrollRoot.style.scrollBehavior = previousBehavior;
            scrollBehaviorRestore = null;
            scrollAnimationFrame = 0;
            updateBtn();
        };
        scrollAnimationFrame = requestAnimationFrame(scrollFrame);
    });
}
