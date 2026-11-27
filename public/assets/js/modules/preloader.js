export async function finishPreloader() {
    const loader = document.getElementById('page-loader');
    if (!loader || loader.dataset.finishing === 'true') return;

    loader.dataset.finishing = 'true';
    // Wait for the fill that's already running. A slow page or auth check
    // can finish after the animation without starting another timer.
    const fill = loader.querySelector('.logo-fill')?.getAnimations?.().find(
        animation => animation.animationName === 'loadUp'
    );
    if (fill) await fill.finished.catch(() => {});

    loader.style.display = 'none';
    document.body.classList.remove('loading');
    document.dispatchEvent(new Event('preloader:done'));
}

export function initPreloader({ waitForAuth = false, maxWaitMs = 0 } = {}) {
    if (waitForAuth) {
        if (maxWaitMs > 0) window.setTimeout(finishPreloader, maxWaitMs);
        return;
    }

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
