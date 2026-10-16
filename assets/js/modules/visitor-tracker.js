

import {
    ref, onValue, set, runTransaction,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const PRESENCE_ACTIVE_WINDOW_MS = 45000;
const PRESENCE_HEARTBEAT_MS = 15000;

function ensureVisitorStatsBar() {
    let bar = document.querySelector('.visitor-stats-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'visitor-stats-bar';
        bar.setAttribute('aria-live', 'polite');
        const footer = document.querySelector('footer');
        if (footer?.parentNode) footer.parentNode.insertBefore(bar, footer);
        else document.body.appendChild(bar);
    }

    let content = bar.querySelector('.visitor-stats-content');
    if (!content) {
        content = bar.querySelector(':scope > div');
        if (!content) {
            content = document.createElement('div');
            bar.appendChild(content);
        }
        content.classList.add('visitor-stats-content');
        content.classList.add('max-w-6xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'flex', 'items-center', 'justify-center', 'gap-6', 'sm:gap-10', 'flex-wrap');
    }

    if (!bar.querySelector('#total-views-count, .total-views-count')) {
        const item = document.createElement('div');
        item.className = 'visitor-stats-item';
        item.innerHTML = '<span class="visitor-stats-dot" style="background:#6366f1"></span><i class="fa-solid fa-eye text-xs" style="color:#6366f1"></i><span class="text-sm font-semibold text-gray-700">Total Views:</span><span id="total-views-count" class="text-sm font-extrabold text-gray-900">0</span>';
        content.appendChild(item);
    } else {
        const totalViewsEl = bar.querySelector('#total-views-count, .total-views-count');
        if (!totalViewsEl.id) totalViewsEl.id = 'total-views-count';
    }

    if (!bar.querySelector('.online-users-count, #online-users-count, #vs-online-count')) {
        const item = document.createElement('div');
        item.className = 'visitor-stats-item';
        item.innerHTML = '<span class="visitor-stats-dot visitor-stats-dot--live"></span><i class="fa-solid fa-users text-xs" style="color:#10b981"></i><span class="text-sm font-semibold text-gray-700">Online Now:</span><span id="online-users-count" class="text-sm font-extrabold text-gray-900 online-users-count">0</span>';
        content.appendChild(item);
    }

    const totalViewsItem = bar.querySelector('#total-views-count, .total-views-count')?.closest('.visitor-stats-item');
    const onlineItem = bar.querySelector('.online-users-count, #online-users-count, #vs-online-count')?.closest('.visitor-stats-item');
    if (totalViewsItem && onlineItem && totalViewsItem !== onlineItem) {
        content.insertBefore(totalViewsItem, onlineItem);
    }

    if (!document.getElementById('visitor-stats-shared-style')) {
        const style = document.createElement('style');
        style.id = 'visitor-stats-shared-style';
        style.textContent = '.visitor-stats-bar{background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:12px 0;margin:2rem 0 2.5rem;width:100%;flex-shrink:0}.visitor-stats-content{display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap}.visitor-stats-item{display:inline-flex;align-items:center;gap:6px}.visitor-stats-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}.visitor-stats-dot--live{background:#10b981;animation:visitor-online-pulse 1.5s infinite}@keyframes visitor-online-pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 0 0 5px rgba(16,185,129,0)}}@media print{.visitor-stats-bar{display:none!important}}';
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

    
    const onlineEls = document.querySelectorAll('.online-users-count, #online-users-count, #vs-online-count');
    const viewEls = document.querySelectorAll('.total-views-count');
    const viewSingle = document.getElementById('total-views-count');

    
    const myPresenceRef = ref(database, `visitorTracking/presence/${sessionId}`);
    const connectedRef = ref(database, '.info/connected');
    let heartbeatTimer = null;
    let presenceRefreshTimer = null;
    let latestPresenceData = null;

    const renderOnlineCount = (data) => {
        const now = Date.now();
        const count = data
            ? Object.values(data).filter((entry) => (
                entry && typeof entry === 'object' &&
                typeof entry.updatedAt === 'number' &&
                now - entry.updatedAt <= PRESENCE_ACTIVE_WINDOW_MS
            )).length
            : 0;
        onlineEls.forEach(el => { el.textContent = count; });
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

    
    if (viewEls.length || viewSingle) {
        const viewsRef = ref(database, 'visitorTracking/totalViews');

        runTransaction(viewsRef, (current) => (current || 0) + 1)
            .catch(err => console.error('View count transaction error:', err));

        onValue(viewsRef, (snap) => {
            const views = snap.val() || 0;
            const text = views.toLocaleString();
            viewEls.forEach(el => { el.textContent = text; });
            if (viewSingle) viewSingle.textContent = text;
        });
    }

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
