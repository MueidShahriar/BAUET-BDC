const PRELOADER_FILL_MS = 2000;
const preloaderStartedAt = performance.now();
let finishTimer = null;

export function finishPreloader() {
    const pageLoader = document.getElementById('page-loader');
    if (!pageLoader || pageLoader.dataset.finished === 'true') return;

    const remainingTime = Math.max(0, PRELOADER_FILL_MS - (performance.now() - preloaderStartedAt));
    if (remainingTime > 0) {
        if (!finishTimer) {
            finishTimer = setTimeout(() => {
                finishTimer = null;
                finishPreloader();
            }, remainingTime);
        }
        return;
    }

    pageLoader.dataset.finished = 'true';
    pageLoader.classList.add('fade-out');
    document.body.classList.remove('loading');
    setTimeout(() => {
        pageLoader.style.display = 'none';
    }, 500);
}

export function initPreloader({ waitForAuth = false } = {}) {
    if (waitForAuth) return;

    const finishAfterLoad = () => finishPreloader();
    if (document.readyState === 'complete') {
        finishAfterLoad();
    } else {
        window.addEventListener('load', finishAfterLoad, { once: true });
    }
}
