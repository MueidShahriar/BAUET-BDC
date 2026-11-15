export function initBackToTop() {
    let backToTopBtn = document.getElementById('back-to-top');

    // Some standalone long pages do not include the FAB markup. Create the
    // same shared control there instead of leaving those pages without it.
    if (!backToTopBtn) {
        const fabWrap = document.createElement('div');
        fabWrap.id = 'fab-wrap';
        fabWrap.className = 'fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2';

        backToTopBtn = document.createElement('a');
        backToTopBtn.id = 'back-to-top';
        backToTopBtn.href = '#top';
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

    const footerEl = document.querySelector('footer');
    let footerIsVisible = false;

    
    if ('IntersectionObserver' in window && footerEl) {
        const fabFooterIO = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                footerIsVisible = entry.isIntersecting && entry.intersectionRatio > 0.01;
                updateBtn();
            });
        }, { threshold: [0, 0.01, 0.1] });
        fabFooterIO.observe(footerEl);
    }

    function updateBtn() {
        const beyond = window.scrollY > 180;
        // Keep the control available near the bottom of long mobile pages too;
        // the footer should not make the only navigation shortcut disappear.
        backToTopBtn.classList.toggle('show', beyond);
    }

    
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            updateBtn();
            ticking = false;
        });
    }, { passive: true });

    updateBtn();

    backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
