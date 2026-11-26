import { requestBloodApi } from './blood-request-api.js?v=1';

const STATUS_OPTIONS = ['Pending', 'Verified', 'In Progress', 'Fulfilled', 'Cancelled', 'Expired'];
const STATUS_TRANSITIONS = {
    Pending: ['Verified', 'Cancelled', 'Expired'],
    Verified: ['In Progress', 'Fulfilled', 'Cancelled', 'Expired'],
    'In Progress': ['Fulfilled', 'Cancelled', 'Expired'],
    Fulfilled: [],
    Cancelled: [],
    Expired: []
};
const DELETABLE_STATUSES = new Set(['Fulfilled', 'Cancelled', 'Expired']);

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateTime(timestamp) {
    if (!timestamp) return '—';
    try {
        return new Intl.DateTimeFormat('en-BD', {
            dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka'
        }).format(new Date(timestamp));
    } catch (_) {
        return '—';
    }
}

function statusSlug(status) {
    return String(status || '').toLowerCase().replace(/\s+/g, '-');
}

function objectValuesWithIds(value) {
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).map(([id, item]) => ({ id, ...(item || {}) }));
}

function historyRows(request) {
    const history = objectValuesWithIds(request.statusHistory)
        .sort((a, b) => Number(b.changedAt || 0) - Number(a.changedAt || 0));
    if (!history.length) return '<p class="admin-request-empty-note">No status history available.</p>';
    return `<ol class="admin-request-history">${history.map(item => `
        <li>
            <span class="admin-request-history__dot"></span>
            <div><strong>${escapeHtml(item.from || 'New')} → ${escapeHtml(item.to || '—')}</strong><small>${escapeHtml(formatDateTime(item.changedAt))} · ${escapeHtml(item.changedByLabel || item.changedBy || 'Requester')}</small></div>
        </li>`).join('')}</ol>`;
}

function detailRow(label, value, { sensitive = false } = {}) {
    const cleanValue = value === 0 ? '0' : (value || '—');
    return `<div class="admin-request-detail${sensitive ? ' admin-request-detail--sensitive' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(cleanValue)}</strong></div>`;
}

function requestCard(request) {
    const patient = request.patientInformation || {};
    const hospital = request.hospitalInformation || {};
    const requester = request.requesterInformation || {};
    const middleman = request.middlemanInformation || null;
    const canShare = ['Verified', 'In Progress'].includes(request.status);
    const statusButtons = (STATUS_TRANSITIONS[request.status] || []).filter(status => STATUS_OPTIONS.includes(status)).map(status =>
        `<button type="button" data-request-action="status" data-request-id="${escapeHtml(request.requestId)}" data-next-status="${escapeHtml(status)}">${escapeHtml(status)}</button>`
    ).join('') || '<span class="admin-request-empty-note">This request is closed.</span>';
    const deleteButton = DELETABLE_STATUSES.has(request.status)
        ? `<button type="button" class="admin-request-delete" data-request-action="delete" data-request-id="${escapeHtml(request.requestId)}"><i class="fa-solid fa-trash-can"></i> Delete request</button>`
        : '';
    const requisition = request.requisitionSlip?.storagePath
        ? `<button type="button" class="admin-request-document" data-request-action="document" data-request-id="${escapeHtml(request.requestId)}"><i class="fa-solid fa-file-shield"></i> Open requisition slip</button>`
        : '<span class="admin-request-empty-note">No requisition slip uploaded</span>';
    return `
        <article class="admin-request-card" data-request-card="${escapeHtml(request.requestId)}">
            <div class="admin-request-card__head">
                <div class="admin-request-blood">${escapeHtml(request.bloodGroup || '—')}</div>
                <div class="admin-request-card__title">
                    <div><strong>${escapeHtml(request.requestId)}</strong><span class="admin-request-status" data-status="${statusSlug(request.status)}">${escapeHtml(request.status)}</span></div>
                    <p>${escapeHtml(request.requiredUnits)} RBC unit${Number(request.requiredUnits) === 1 ? '' : 's'} · ${escapeHtml(request.urgency)} · ${escapeHtml(hospital.district)}</p>
                </div>
                <div class="admin-request-card__controls">
                    <button type="button" class="admin-request-expand" data-request-action="expand" aria-expanded="false"><i class="fa-solid fa-chevron-down"></i><span>Details</span></button>
                    ${deleteButton}
                </div>
            </div>
            <div class="admin-request-card__quick">
                <span><i class="fa-solid fa-hospital"></i>${escapeHtml(hospital.name || '—')}</span>
                <span><i class="fa-regular fa-calendar"></i>${escapeHtml(request.requiredDate || '—')} at ${escapeHtml(request.requiredTime || '—')}</span>
                <span><i class="fa-regular fa-clock"></i>Submitted ${escapeHtml(formatDateTime(request.createdAt))}</span>
            </div>
            <div class="admin-request-card__details" hidden>
                <div class="admin-request-detail-grid">
                    <section><h4>Blood Requirement</h4>${detailRow('Component', 'RBC')}${detailRow('Blood Group', request.bloodGroup)}${detailRow('Required Units', request.requiredUnits)}${detailRow('Urgency', request.urgency)}${detailRow('Required Date & Time', `${request.requiredDate || '—'} at ${request.requiredTime || '—'}`)}</section>
                    <section><h4>Patient Information</h4>${detailRow('Name', patient.name, { sensitive: true })}${detailRow('Age', patient.age, { sensitive: true })}${detailRow('Gender', patient.gender, { sensitive: true })}${detailRow('Reason', request.reason, { sensitive: true })}</section>
                    <section><h4>Hospital Information</h4>${detailRow('Hospital', hospital.name)}${detailRow('Address', hospital.address)}${detailRow('District', hospital.district)}${detailRow('Ward / Cabin / Bed', hospital.wardCabinBed)}</section>
                    <section><h4>Requester Information</h4>${detailRow('Name', requester.name, { sensitive: true })}${detailRow('Relationship', requester.relationship, { sensitive: true })}${detailRow('Primary Contact', requester.primaryContact, { sensitive: true })}${detailRow('Alternative Contact', requester.alternativeContact, { sensitive: true })}${detailRow('Public contact allowed', requester.publicContactConsent ? 'Yes' : 'No')}</section>
                    ${middleman ? `<section><h4>Middleman / Coordinator</h4>${detailRow('Name', middleman.name, { sensitive: true })}${detailRow('Contact', middleman.contact, { sensitive: true })}${detailRow('Role / Organization', middleman.role)}${detailRow('Relationship / Note', middleman.note, { sensitive: true })}</section>` : ''}
                </div>
                <section class="admin-request-notes"><h4>Additional Information</h4><p>${escapeHtml(request.additionalNotes || 'No additional notes.')}</p>${requisition}</section>
                <section class="admin-request-timestamps"><span>Created: <b>${escapeHtml(formatDateTime(request.createdAt))}</b></span><span>Updated: <b>${escapeHtml(formatDateTime(request.updatedAt))}</b></span><span>Verified: <b>${escapeHtml(formatDateTime(request.verifiedAt))}</b></span></section>
                <section><h4>Status History</h4>${historyRows(request)}</section>
                <div class="admin-request-actions">
                    <div class="admin-request-status-actions" aria-label="Manage request status">${statusButtons}</div>
                    ${canShare ? `<div class="admin-request-share-actions"><button type="button" data-request-action="whatsapp" data-request-id="${escapeHtml(request.requestId)}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button><button type="button" data-request-action="facebook" data-request-id="${escapeHtml(request.requestId)}"><i class="fa-brands fa-facebook-f"></i> Facebook</button></div>` : ''}
                </div>
            </div>
            <div class="admin-request-action-message" aria-live="polite"></div>
        </article>`;
}

function shareText(request) {
    const hospital = request.hospitalInformation || {};
    const requester = request.requesterInformation || {};
    const contact = requester.publicContactConsent ? `\nContact: ${requester.primaryContact}` : '';
    return [
        'Verified RBC Blood Request',
        `Request ID: ${request.requestId}`,
        `Blood Group: ${request.bloodGroup}`,
        `Required: ${request.requiredUnits} RBC unit${Number(request.requiredUnits) === 1 ? '' : 's'}`,
        `Hospital: ${hospital.name}`,
        `District: ${hospital.district}`,
        `Required: ${request.requiredDate} at ${request.requiredTime}`,
        `Urgency: ${request.urgency}${contact}`,
        'Compatibility and donor eligibility must be confirmed by the hospital or blood bank.'
    ].join('\n');
}

export function initBloodRequestAdmin({ database, auth, ref, onValue, update }) {
    const panel = document.getElementById('admin-section-requests');
    if (!panel || panel.dataset.initialized === 'true') return;
    panel.dataset.initialized = 'true';

    const listElement = document.getElementById('admin-blood-request-list');
    const notificationsElement = document.getElementById('admin-request-notifications');
    const filters = {
        search: document.getElementById('admin-request-search'),
        blood: document.getElementById('admin-request-blood-filter'),
        district: document.getElementById('admin-request-district-filter'),
        urgency: document.getElementById('admin-request-urgency-filter'),
        status: document.getElementById('admin-request-status-filter'),
        sort: document.getElementById('admin-request-sort')
    };
    let requests = [];
    let notifications = [];

    async function authorizedFetch(path, options = {}) {
        const user = auth.currentUser;
        if (!user) throw new Error('Your admin session has ended. Please sign in again.');
        const token = await user.getIdToken();
        return requestBloodApi(path, {
            ...options,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
        });
    }

    function filteredRequests() {
        const search = filters.search.value.trim().toLowerCase();
        const district = filters.district.value.trim().toLowerCase();
        const result = requests.filter(request => {
            if (search && !String(request.requestId || '').toLowerCase().includes(search)) return false;
            if (filters.blood.value && request.bloodGroup !== filters.blood.value) return false;
            if (district && !String(request.hospitalInformation?.district || '').toLowerCase().includes(district)) return false;
            if (filters.urgency.value && request.urgency !== filters.urgency.value) return false;
            if (filters.status.value && request.status !== filters.status.value) return false;
            return true;
        });
        return result.sort((a, b) => {
            const delta = Number(b.createdAt || 0) - Number(a.createdAt || 0);
            return filters.sort.value === 'oldest' ? -delta : delta;
        });
    }

    function renderRequests() {
        const visible = filteredRequests();
        document.getElementById('admin-request-visible-count').textContent = String(visible.length);
        document.getElementById('admin-request-total-count').textContent = String(requests.length);
        document.getElementById('admin-overview-pending-requests').textContent = String(requests.filter(item => item.status === 'Pending').length);
        listElement.innerHTML = visible.length
            ? visible.map(requestCard).join('')
            : '<div class="admin-request-empty"><i class="fa-solid fa-inbox"></i><strong>No blood requests match these filters.</strong></div>';
    }

    function renderNotifications() {
        const unread = notifications.filter(item => !item.read);
        const badge = document.getElementById('admin-request-unread-badge');
        badge.hidden = unread.length === 0;
        badge.textContent = unread.length > 99 ? '99+' : String(unread.length);
        if (!unread.length) {
            notificationsElement.innerHTML = '';
            return;
        }
        notificationsElement.innerHTML = `
            <div class="admin-request-notification-head"><strong><i class="fa-solid fa-bell"></i> ${unread.length} new request notification${unread.length === 1 ? '' : 's'}</strong><button type="button" data-notification-action="read-all">Mark all read</button></div>
            <div class="admin-request-notification-list">${unread.slice(0, 5).map(item => `<button type="button" data-notification-id="${escapeHtml(item.id)}" data-request-id="${escapeHtml(item.requestId)}"><b>${escapeHtml(item.bloodGroup)} · ${escapeHtml(item.requiredUnits)} unit${Number(item.requiredUnits) === 1 ? '' : 's'}</b><span>${escapeHtml(item.hospitalName)} · ${escapeHtml(item.district)}</span><small>${escapeHtml(formatDateTime(item.createdAt))}</small></button>`).join('')}</div>`;
    }

    async function markNotificationRead(notificationIds) {
        if (!notificationIds.length) return;
        const updates = {};
        notificationIds.forEach(id => { updates[`adminNotifications/${id}/read`] = true; });
        await update(ref(database), updates);
    }

    async function handleAction(event) {
        const actionButton = event.target.closest('[data-request-action]');
        if (!actionButton) return;
        const card = actionButton.closest('.admin-request-card');
        const requestId = actionButton.dataset.requestId || card?.dataset.requestCard;
        const request = requests.find(item => item.requestId === requestId);
        if (!request) return;
        if (actionButton.dataset.requestAction === 'expand') {
            const details = card.querySelector('.admin-request-card__details');
            const expanded = actionButton.getAttribute('aria-expanded') === 'true';
            actionButton.setAttribute('aria-expanded', String(!expanded));
            actionButton.querySelector('span').textContent = expanded ? 'Details' : 'Hide';
            details.hidden = expanded;
            return;
        }
        if (actionButton.dataset.requestAction === 'status') {
            const nextStatus = actionButton.dataset.nextStatus;
            if (!window.confirm(`Change ${requestId} from ${request.status} to ${nextStatus}?`)) return;
            const message = card.querySelector('.admin-request-action-message');
            message.textContent = 'Updating status…';
            actionButton.disabled = true;
            try {
                const result = await authorizedFetch(`${encodeURIComponent(requestId)}/status`, {
                    method: 'POST', body: JSON.stringify({ status: nextStatus })
                });
                message.textContent = result.matchedDonorCount
                    ? `Status updated. ${result.matchedDonorCount} eligible donor notification${result.matchedDonorCount === 1 ? '' : 's'} created.`
                    : 'Status updated successfully.';
            } catch (error) {
                message.textContent = error.message;
                actionButton.disabled = false;
            }
            return;
        }
        if (actionButton.dataset.requestAction === 'delete') {
            const confirmed = window.confirm(`Permanently delete closed request ${requestId}?\n\nThis removes its tracking record, notifications and uploaded document. This action cannot be undone.`);
            if (!confirmed) return;
            const message = card.querySelector('.admin-request-action-message');
            message.removeAttribute('data-type');
            message.textContent = 'Deleting closed request…';
            actionButton.disabled = true;
            try {
                await authorizedFetch(encodeURIComponent(requestId), { method: 'DELETE' });
                requests = requests.filter(item => item.requestId !== requestId);
                notifications = notifications.filter(item => item.requestId !== requestId);
                renderRequests();
                renderNotifications();
            } catch (error) {
                message.dataset.type = 'error';
                message.textContent = error.message;
                actionButton.disabled = false;
            }
            return;
        }
        if (actionButton.dataset.requestAction === 'document') {
            actionButton.disabled = true;
            try {
                const result = await authorizedFetch(`${encodeURIComponent(requestId)}/requisition`);
                window.open(result.url, '_blank', 'noopener,noreferrer');
            } catch (error) {
                card.querySelector('.admin-request-action-message').textContent = error.message;
            } finally {
                actionButton.disabled = false;
            }
            return;
        }
        const publicUrl = new URL('../pages/request-blood.html', window.location.href);
        publicUrl.searchParams.set('approved', requestId);
        if (actionButton.dataset.requestAction === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText(request)}\n${publicUrl.href}`)}`, '_blank', 'noopener,noreferrer');
        }
        if (actionButton.dataset.requestAction === 'facebook') {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl.href)}`, '_blank', 'noopener,noreferrer');
        }
    }

    Object.values(filters).forEach(control => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', renderRequests));
    document.getElementById('admin-request-reset').addEventListener('click', () => {
        filters.search.value = '';
        filters.blood.value = '';
        filters.district.value = '';
        filters.urgency.value = '';
        filters.status.value = '';
        filters.sort.value = 'newest';
        renderRequests();
    });
    listElement.addEventListener('click', handleAction);
    notificationsElement.addEventListener('click', async event => {
        const allButton = event.target.closest('[data-notification-action="read-all"]');
        if (allButton) {
            await markNotificationRead(notifications.filter(item => !item.read).map(item => item.id));
            return;
        }
        const item = event.target.closest('[data-notification-id]');
        if (!item) return;
        filters.search.value = item.dataset.requestId;
        renderRequests();
        await markNotificationRead([item.dataset.notificationId]);
    });

    onValue(ref(database, 'bloodRequests'), snapshot => {
        requests = objectValuesWithIds(snapshot.val()).map(item => ({ ...item, requestId: item.requestId || item.id }));
        renderRequests();
    }, error => {
        listElement.innerHTML = `<div class="admin-request-empty admin-request-empty--error"><strong>Could not load blood requests.</strong><span>${escapeHtml(error.message)}</span></div>`;
    });
    onValue(ref(database, 'adminNotifications'), snapshot => {
        notifications = objectValuesWithIds(snapshot.val())
            .filter(item => item.type === 'bloodRequest')
            .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        renderNotifications();
    });

    authorizedFetch('expire', { method: 'POST', body: '{}' }).catch(() => {});
}
