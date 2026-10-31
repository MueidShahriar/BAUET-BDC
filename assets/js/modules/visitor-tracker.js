

import {
    ref, onValue, set, runTransaction,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const PRESENCE_ACTIVE_WINDOW_MS = 45000;
const PRESENCE_HEARTBEAT_MS = 15000;

function ensureVisitorStatsBar() {
    let bar = document.querySelector('.visitor-stats-bar');
    const footer = document.querySelector('footer');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'visitor-stats-bar';
        bar.setAttribute('aria-live', 'polite');
    }
    if (footer?.parentNode) {
        footer.parentNode.insertBefore(bar, footer);
    } else if (!bar.parentNode) {
        document.body.appendChild(bar);
    }

    bar.innerHTML = `
        <div class="visitor-stats-shell">
            <div class="visitor-stats-heading">
                <span class="visitor-stats-heading-mark"></span>
                <span>PAGE VISITS</span>
            </div>
            <div class="visitor-stats-live">
                <span class="visitor-stats-dot visitor-stats-dot--live"></span>
                <strong>LIVE</strong>
                <span><b class="online-users-count">0</b> online now</span>
                <span><b class="visitor-page-online-count">0</b> on this page</span>
            </div>
            <div class="visitor-stats-metrics">
                <div class="visitor-stats-metric">
                    <span class="visitor-stats-icon"><i class="fa-solid fa-eye"></i></span>
                    <span><small>THIS PAGE</small><strong class="visitor-page-views-count">0</strong></span>
                </div>
                <div class="visitor-stats-metric">
                    <span class="visitor-stats-icon"><i class="fa-solid fa-globe"></i></span>
                    <span><small>WEBSITE</small><strong class="visitor-total-views-count">0</strong></span>
                </div>
                <div class="visitor-stats-metric">
                    <span class="visitor-stats-icon"><i class="fa-solid fa-arrow-trend-up"></i></span>
                    <span><small>TODAY</small><strong class="visitor-today-views-count">0</strong></span>
                </div>
            </div>
        </div>`;

    if (!document.getElementById('visitor-stats-shared-style')) {
        const style = document.createElement('style');
        style.id = 'visitor-stats-shared-style';
        style.textContent = '.visitor-stats-bar{position:relative;z-index:30;margin:.5rem auto .75rem;padding:0;width:min(100%,1152px);color:#172033;background:transparent;border:0}.visitor-stats-shell{position:relative;overflow:hidden;border:1px solid #e6eaf0;border-radius:10px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.08),0 2px 6px rgba(15,23,42,.04)}.visitor-stats-shell:after{content:"";position:absolute;top:-90px;right:-50px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(225,29,72,.07),transparent 68%);pointer-events:none}.visitor-stats-heading{display:flex;align-items:center;gap:8px;padding:8px 14px 7px;border-bottom:1px solid #edf0f4;color:#344054;font-size:13px;font-weight:800;letter-spacing:.16em}.visitor-stats-heading-mark{width:4px;height:14px;border-radius:4px;background:#e11d48;box-shadow:0 0 10px rgba(225,29,72,.25)}.visitor-stats-live{position:absolute;top:8px;right:14px;z-index:1;display:flex;align-items:center;gap:7px;color:#667085;font-size:11px}.visitor-stats-live strong{color:#059669;font-size:10px;letter-spacing:.1em}.visitor-stats-live b{color:#172033;font-size:13px;margin-right:2px}.visitor-stats-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}.visitor-stats-dot--live{background:#10b981;animation:visitor-online-pulse 1.5s infinite}.visitor-stats-metrics{display:grid;grid-template-columns:repeat(3,1fr)}.visitor-stats-metric{display:flex;align-items:center;gap:10px;padding:10px 14px}.visitor-stats-metric+ .visitor-stats-metric{border-left:1px solid #edf0f4}.visitor-stats-icon{display:grid;place-items:center;width:30px;height:30px;border:1px solid #eadcfb;border-radius:11px;background:#faf7ff;color:#7c3aed;font-size:14px}.visitor-stats-metric small{display:block;color:#667085;font-size:9px;font-weight:800;letter-spacing:.17em}.visitor-stats-metric strong{display:block;color:#172033;font-size:21px;line-height:1.1;margin-top:3px}.visitor-page-online-count{color:#172033}.visitor-stats-metric:nth-child(2) .visitor-stats-icon{color:#2563eb;border-color:#dbeafe;background:#f8fbff}.visitor-stats-metric:nth-child(3) .visitor-stats-icon{color:#e11d48;border-color:#ffe0e6;background:#fff8f9}@keyframes visitor-online-pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.35)}50%{box-shadow:0 0 0 6px rgba(16,185,129,0)}}@media(max-width:640px){.visitor-stats-bar{margin-top:.5rem;margin-bottom:.75rem;padding:0}.visitor-stats-heading{padding:8px 12px}.visitor-stats-live{position:static;padding:7px 12px;border-bottom:1px solid #edf0f4;flex-wrap:wrap}.visitor-stats-metrics{grid-template-columns:1fr}.visitor-stats-metric{padding:10px 12px}.visitor-stats-metric+ .visitor-stats-metric{border-left:0;border-top:1px solid #edf0f4}}@media print{.visitor-stats-bar{display:none!important}}';
        document.head.appendChild(style);
    }
}

function getSessionId() {
    let sid = sessionStorage.getItem('bdc_session_id');
    if (!sid) {
        sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        sessionStorage.setItem('bdc_session_id', sid);
    }
    return sid;
}

export function initVisitorTracker(database, isHomePage = false) {
    ensureVisitorStatsBar();
    const sessionId = getSessionId();
    const pageKey = (window.location.pathname.split('/').pop() || 'index')
        .replace(/\.html?$/i, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_') || 'index';
    const now = new Date();
    const dateKey = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');

    
    const onlineEls = document.querySelectorAll('.online-users-count, #online-users-count, #vs-online-count');
    const pageOnlineEl = document.querySelector('.visitor-page-online-count');
    const pageViewEls = document.querySelectorAll('.visitor-page-views-count');
    const totalViewEls = document.querySelectorAll('.visitor-total-views-count, .total-views-count');
    const todayViewEls = document.querySelectorAll('.visitor-today-views-count');

    
    const myPresenceRef = ref(database, `visitorTracking/presence/${sessionId}`);
    const connectedRef = ref(database, '.info/connected');
    let heartbeatTimer = null;
    let presenceRefreshTimer = null;
    let latestPresenceData = null;

    const renderOnlineCount = (data) => {
        const now = Date.now();
        const activeEntries = data
            ? Object.values(data).filter((entry) => (
                entry && typeof entry === 'object' &&
                typeof entry.updatedAt === 'number' &&
                now - entry.updatedAt <= PRESENCE_ACTIVE_WINDOW_MS
            ))
            : [];
        onlineEls.forEach(el => { el.textContent = activeEntries.length; });
        if (pageOnlineEl) {
            pageOnlineEl.textContent = activeEntries.filter(entry => entry.path === window.location.pathname).length;
        }
    };

    // A session is one browser tab. sessionStorage preserves its id across a refresh,
    // so mounting this module again cannot create an additional online record.
    const writePresence = () => set(myPresenceRef, {
        updatedAt: Date.now(),
        path: window.location.pathname || '/'
    }).catch(() => {});

    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            writePresence();
            onDisconnect(myPresenceRef).remove();
            if (heartbeatTimer) window.clearInterval(heartbeatTimer);
            heartbeatTimer = window.setInterval(writePresence, PRESENCE_HEARTBEAT_MS);
        }
    });

    const allPresenceRef = ref(database, 'visitorTracking/presence');
    onValue(allPresenceRef, (snap) => {
        latestPresenceData = snap.val();
        renderOnlineCount(latestPresenceData);
    });
    presenceRefreshTimer = window.setInterval(() => {
        renderOnlineCount(latestPresenceData);
    }, 1000);

    // Resume a stale heartbeat as soon as a backgrounded tab becomes active again.
    const refreshPresenceWhenVisible = () => {
        if (document.visibilityState === 'visible') writePresence();
    };
    document.addEventListener('visibilitychange', refreshPresenceWhenVisible);

    
    const totalViewsRef = ref(database, 'visitorTracking/totalViews');
    const pageViewsRef = ref(database, `visitorTracking/pageViews/${pageKey}/total`);
    const todayViewsRef = ref(database, `visitorTracking/dailyViews/${dateKey}`);
    onValue(totalViewsRef, snap => {
        totalViewEls.forEach(el => { el.textContent = Number(snap.val() || 0).toLocaleString(); });
    });
    onValue(pageViewsRef, snap => {
        pageViewEls.forEach(el => { el.textContent = Number(snap.val() || 0).toLocaleString(); });
    });
    onValue(todayViewsRef, snap => {
        todayViewEls.forEach(el => { el.textContent = Number(snap.val() || 0).toLocaleString(); });
    });

    Promise.all([
        runTransaction(totalViewsRef, current => (current || 0) + 1),
        runTransaction(pageViewsRef, current => (current || 0) + 1),
        runTransaction(todayViewsRef, current => (current || 0) + 1)
    ]).catch(err => console.error('Visitor view count transaction error:', err));

    window.addEventListener('pagehide', () => {
        if (heartbeatTimer) window.clearInterval(heartbeatTimer);
        if (presenceRefreshTimer) window.clearInterval(presenceRefreshTimer);
        document.removeEventListener('visibilitychange', refreshPresenceWhenVisible);
        // onDisconnect covers crashes and connection loss; remove also handles normal navigation.
        myPresenceRef && removePresence();
    }, { once: true });

    function removePresence() {
        set(myPresenceRef, null).catch(() => {});
    }
}
