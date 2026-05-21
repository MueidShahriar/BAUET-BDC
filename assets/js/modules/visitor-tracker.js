

import {
    ref, onValue, set, runTransaction,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            set(myPresenceRef, true).catch(() => {});
            onDisconnect(myPresenceRef).remove();
        }
    });

    const allPresenceRef = ref(database, 'visitorTracking/presence');
    onValue(allPresenceRef, (snap) => {
        const data = snap.val();
        const count = data ? Object.keys(data).length : 0;
        onlineEls.forEach(el => { el.textContent = count; });
        if (onlineSingle) onlineSingle.textContent = count;
    });

    
    if (viewEls.length || viewSingle) {
        const VIEW_FLAG = 'bdc_home_view_counted';
        const viewsRef = ref(database, 'visitorTracking/totalViews');

        if (isHomePage && !sessionStorage.getItem(VIEW_FLAG)) {
            runTransaction(viewsRef, (current) => {
                return (current || 0) + 1;
            }).then(() => {
                sessionStorage.setItem(VIEW_FLAG, '1');
            }).catch(err => console.error('View count transaction error:', err));
        }

        onValue(viewsRef, (snap) => {
            const views = snap.val() || 0;
            const text = views.toLocaleString();
            viewEls.forEach(el => { el.textContent = text; });
            if (viewSingle) viewSingle.textContent = text;
        });
    }
}
