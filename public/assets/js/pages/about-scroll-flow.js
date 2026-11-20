const aboutPage = document.querySelector('.about-page');
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

if (aboutPage && !reduceMotion) {
    const defaultDuration = 520;
    const defaultDistance = 20;
    let previousY = window.scrollY;
    let previousTime = performance.now();
    let smoothedSpeed = 0;
    let framePending = false;
    let idleTimer;

    function setFlow(speed) {
        const intensity = Math.min(speed / 1.25, 1);
        const duration = Math.round(defaultDuration - intensity * 280);
        const distance = Math.round(defaultDistance - intensity * 12);

        aboutPage.style.setProperty('--about-flow-duration', `${duration}ms`);
        aboutPage.style.setProperty('--about-flow-distance', `${distance}px`);
    }

    function measureScroll() {
        framePending = false;

        const now = performance.now();
        const currentY = window.scrollY;
        const elapsed = Math.max(now - previousTime, 1);
        const instantSpeed = Math.abs(currentY - previousY) / elapsed;

        smoothedSpeed = smoothedSpeed * 0.65 + instantSpeed * 0.35;
        setFlow(smoothedSpeed);

        previousY = currentY;
        previousTime = now;
    }

    function handleScroll() {
        if (!framePending) {
            framePending = true;
            window.requestAnimationFrame(measureScroll);
        }

        window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
            smoothedSpeed = 0;
            setFlow(0);
        }, 170);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
}
