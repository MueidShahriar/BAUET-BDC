

import {
    ref, onValue, set, runTransaction,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const PRESENCE_ACTIVE_WINDOW_MS = 45000;
const PRESENCE_HEARTBEAT_MS = 15000;

function getSessionId() {
    let sid = sessionStorage.getItem('bdc_session_id');
    if (!sid) {
        sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        sessionStorage.setItem('bdc_session_id', sid);
    }
    return sid;
}

export function initVisitorTracker(database, isHomePage = false) {
    const sessionId = getSessionId();

    
    const onlineEls = document.querySelectorAll('.online-users-count');
    const onlineSingle = document.getElementById('online-users-count');
    const viewEls = document.querySelectorAll('.total-views-count');
    const viewSingle = document.getElementById('total-views-count');

    
    const myPresenceRef = ref(database, `visitorTracking/presence/${sessionId}`);
    const connectedRef = ref(database, '.info/connected');
    let heartbeatTimer = null;

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
        const data = snap.val();
        const now = Date.now();
        const count = data
            ? Object.values(data).filter((entry) => {
                if (entry && typeof entry === 'object' && typeof entry.updatedAt === 'number') {
                    return now - entry.updatedAt <= PRESENCE_ACTIVE_WINDOW_MS;
                }
                return Boolean(entry);
            }).length
            : 0;
        onlineEls.forEach(el => { el.textContent = count; });
        if (onlineSingle) onlineSingle.textContent = count;
    });

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
        document.removeEventListener('visibilitychange', refreshPresenceWhenVisible);
        // onDisconnect covers crashes and connection loss; remove also handles normal navigation.
        myPresenceRef && removePresence();
    }, { once: true });

    function removePresence() {
        set(myPresenceRef, null).catch(() => {});
    }
}
