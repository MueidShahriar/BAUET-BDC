const __pendingCounts__ = new Map();
const homeCountAnimations = new WeakMap();
const homeCountFormat = new Intl.NumberFormat();
const HOME_COUNT_DURATION_MS = 600;
let homeCountsInView = false;

window.__statsVisible__ = false;
window.__animateCountTo__ = undefined;

function showHomeCount(el) {
    const loader = document.getElementById('page-loader');
    if (!homeCountsInView || (loader && !loader.hidden && loader.style.display !== 'none')) return;

    const target = Number(el.dataset.countTo);
    const previous = homeCountAnimations.get(el);
    if (!Number.isFinite(target) || previous?.target === target) return;
    if (previous?.frame != null) cancelAnimationFrame(previous.frame);

    const from = previous?.value ?? 0;
    const animation = { target, value: from, frame: null };
    homeCountAnimations.set(el, animation);
    const write = (value) => {
        animation.value = value;
        el.textContent = homeCountFormat.format(value);
    };

    if (from === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        write(target);
        return;
    }

    const startedAt = performance.now();
    const step = (now) => {
        const progress = Math.min(1, (now - startedAt) / HOME_COUNT_DURATION_MS);
        const eased = 1 - (1 - progress) ** 2;
        write(Math.round(from + (target - from) * eased));
        animation.frame = progress < 1 ? requestAnimationFrame(step) : null;
    };
    write(from);
    animation.frame = requestAnimationFrame(step);
}

function initHomeCounts() {
    const metrics = document.getElementById('community-stats');
    const counters = metrics?.querySelectorAll('[data-count-animate]');
    if (!counters?.length) return;

    const showCounts = () => counters.forEach(showHomeCount);
    document.addEventListener('preloader:done', showCounts, { once: true });
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            homeCountsInView = entry.isIntersecting;
            showCounts();
        });
        observer.observe(metrics);
    } else {
        homeCountsInView = true;
        showCounts();
    }
}

export function setCountTarget(id, value) {
    const v = Number(value || 0);
    const el = document.getElementById(id);
    if (!el) {
        __pendingCounts__.set(id, v);
        return;
    }
    if (el.hasAttribute('data-count-direct')) {
        el.textContent = v.toLocaleString();
        return;
    }
    el.dataset.countTo = String(v);
    if (el.hasAttribute('data-count-animate')) {
        showHomeCount(el);
        return;
    }
    if (window.__statsVisible__ && typeof window.__animateCountTo__ === 'function') {
        window.__animateCountTo__(el, v);
    }
}

export function flushPendingCounts() {
    if (!__pendingCounts__.size) return;
    const pendingEntries = Array.from(__pendingCounts__.entries());
    __pendingCounts__.clear();
    pendingEntries.forEach(([id, value]) => {
        setCountTarget(id, value);
    });
}

export function getPendingCounts() {
    return __pendingCounts__;
}

export function initStatsCounter() {
    initHomeCounts();
    const statNums = document.querySelectorAll('.stat-card .num');
    const fmt = (n) => n.toLocaleString();

    const animateCountTo = (el, target, duration = 1200, startOverride = undefined) => {
        const startVal = (startOverride != null)
            ? Number(startOverride)
            : Number(el.textContent.replace(/,/g, '') || '0');
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const step = (now) => {
            const p = Math.min(1, (now - start) / duration);
            const val = Math.round(startVal + (target - startVal) * ease(p));
            el.textContent = fmt(val);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };
    window.__animateCountTo__ = animateCountTo;

    let statsWasVisible = false;
    const statsCard = document.querySelector('#donor-count')?.closest('.how-card') || document.querySelector('.stats-grid');

    if ('IntersectionObserver' in window && statsCard) {
        const statsIO = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const nowVisible = entry.isIntersecting && entry.intersectionRatio > 0.30;
                const becameVisible = nowVisible && !statsWasVisible;
                window.__statsVisible__ = nowVisible;
                if (becameVisible) {
                    statNums.forEach(el => {
                        const target = Number(el.dataset.countTo || el.textContent || '0');
                        animateCountTo(el, target, 1500, 0);
                    });
                }
                statsWasVisible = nowVisible;
            });
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
        statsIO.observe(statsCard);
    } else if (statsCard) {
        statNums.forEach(el => {
            const target = Number(el.dataset.countTo || el.textContent || '0');
            animateCountTo(el, target);
        });
    }

    if (__pendingCounts__.size) {
        for (const [id, v] of __pendingCounts__) {
            const el = document.getElementById(id);
            if (el) el.dataset.countTo = String(v);
        }
        __pendingCounts__.clear();
    }
}
