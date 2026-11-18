const PRELOADER_FILL_MS = 900;
const DATA_PROGRESS_FADE_DELAY_MS = 850;
const preloaderStartedAt = performance.now();
let finishTimer = null;

export function setPreloaderProgress(progress) {
    const pageLoader = document.getElementById('page-loader');
    const value = Number(progress);
    if (
        !pageLoader ||
        pageLoader.dataset.progressMode !== 'true' ||
        pageLoader.dataset.finished === 'true' ||
        pageLoader.dataset.finishRequested === 'true' ||
        !Number.isFinite(value)
    ) return;

    const current = Number(pageLoader.dataset.progress || 0);
    const next = Math.max(current, Math.min(100, Math.max(0, value)));
    pageLoader.dataset.progress = String(next);
    pageLoader.style.setProperty('--loader-fill-offset', `${100 - next}%`);
}

function hidePreloader(pageLoader) {
    if (!pageLoader || pageLoader.dataset.finished === 'true') return;

    pageLoader.dataset.finished = 'true';
    pageLoader.classList.add('fade-out');
    document.body.classList.remove('loading');
    setTimeout(() => {
        pageLoader.style.display = 'none';
        document.dispatchEvent(new Event('preloader:done'));
    }, 500);
}

export function finishPreloader() {
    const pageLoader = document.getElementById('page-loader');
    if (!pageLoader || pageLoader.dataset.finished === 'true') return;

    if (pageLoader.dataset.progressMode === 'true') {
        setPreloaderProgress(100);
        if (pageLoader.dataset.finishRequested === 'true') return;
        pageLoader.dataset.finishRequested = 'true';
        finishTimer = setTimeout(() => {
            finishTimer = null;
            hidePreloader(pageLoader);
        }, DATA_PROGRESS_FADE_DELAY_MS);
        return;
    }

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

    hidePreloader(pageLoader);
}

export function initPreloader({ waitForAuth = false, waitForData = false, maxWaitMs = 0 } = {}) {
    if (waitForAuth || waitForData) return;

    let fallbackTimer;
    const finishAfterLoad = () => {
        window.clearTimeout(fallbackTimer);
        window.removeEventListener('load', finishAfterLoad);
        finishPreloader();
    };
    if (document.readyState === 'complete') {
        finishAfterLoad();
    } else {
        window.addEventListener('load', finishAfterLoad, { once: true });
        if (maxWaitMs > 0) fallbackTimer = window.setTimeout(finishAfterLoad, maxWaitMs);
    }
}
