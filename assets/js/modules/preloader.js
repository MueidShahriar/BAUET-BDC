export function finishPreloader() {
    const pageLoader = document.getElementById('page-loader');
    if (!pageLoader || pageLoader.dataset.finished === 'true') return;
    pageLoader.dataset.finished = 'true';
    pageLoader.classList.add('fade-out');
    document.body.classList.remove('loading');
    setTimeout(() => {
        pageLoader.style.display = 'none';
    }, 500);
}

export function initPreloader({ waitForAuth = false } = {}) {
    if (waitForAuth) return;
    setTimeout(finishPreloader, 2200);
}
