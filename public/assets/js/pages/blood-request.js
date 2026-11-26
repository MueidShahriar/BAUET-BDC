import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';
import { firebaseConfig } from '../modules/firebase-config.js';
import { requestBloodApi } from '../modules/blood-request-api.js?v=1';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const REQUEST_ID_PATTERN = /^BAUET BDC-\d{4}$/;
const PREVIOUS_REQUEST_ID_PATTERN = /^BAUET BDC-\d{12}$/;
const LEGACY_REQUEST_ID_PATTERN = /^BR-\d{8}-[A-F0-9]{10}$/;
let stopTracking = null;
let activeIdempotencyKey = '';
let appCheck = null;
let appCheckRequired = false;
let appCheckReady = Promise.resolve();
let copyToastTimer = 0;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function initAppCheck() {
    try {
        const config = await requestBloodApi('config');
        appCheckRequired = config.appCheckEnforced === true;
        if (config.appCheckSiteKey) {
            appCheck = initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(config.appCheckSiteKey),
                isTokenAutoRefreshEnabled: true
            });
        }
    } catch (_) {
        appCheck = null;
    }
}

function normalizePhone(value) {
    let phone = String(value || '').replace(/[\s()-]/g, '');
    if (phone.startsWith('+88')) phone = phone.slice(3);
    else if (phone.startsWith('88')) phone = phone.slice(2);
    return /^01[3-9]\d{8}$/.test(phone) ? `+88${phone}` : '';
}

function showMessage(message, type = 'error') {
    const box = document.getElementById('request-form-message');
    if (!box) return;
    box.hidden = false;
    box.dataset.type = type;
    box.textContent = message;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearMessage() {
    const box = document.getElementById('request-form-message');
    if (box) box.hidden = true;
}

function fileToPayload(file) {
    if (!file) return Promise.resolve(null);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        return Promise.reject(new Error('Upload a PDF, JPG, or PNG requisition slip.'));
    }
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('Requisition slip must be no larger than 5 MB.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: reader.result });
        reader.onerror = () => reject(new Error('Could not read the selected document.'));
        reader.readAsDataURL(file);
    });
}

function formPayload(form) {
    const values = new FormData(form);
    return {
        bloodGroup: values.get('bloodGroup'),
        requiredUnits: values.get('requiredUnits'),
        requiredDate: values.get('requiredDate'),
        requiredTime: values.get('requiredTime'),
        urgency: values.get('urgency'),
        patientName: values.get('patientName'),
        patientAge: values.get('patientAge'),
        patientGender: values.get('patientGender'),
        reason: values.get('reason'),
        hospitalName: values.get('hospitalName'),
        hospitalAddress: values.get('hospitalAddress'),
        district: values.get('district'),
        wardCabinBed: values.get('wardCabinBed'),
        requesterName: values.get('requesterName'),
        relationship: values.get('relationship'),
        primaryContact: values.get('primaryContact'),
        alternativeContact: values.get('alternativeContact'),
        hasMiddleman: values.get('hasMiddleman') === 'on',
        middlemanName: values.get('middlemanName'),
        middlemanContact: values.get('middlemanContact'),
        middlemanRole: values.get('middlemanRole'),
        middlemanNote: values.get('middlemanNote'),
        additionalNotes: values.get('additionalNotes'),
        publicContactConsent: values.get('publicContactConsent') === 'on',
        consent: values.get('consent') === 'on'
    };
}

function validateForm(form, payload) {
    form.querySelectorAll('[aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
    if (!form.reportValidity()) return 'Please complete all required fields.';
    if (!normalizePhone(payload.primaryContact)) {
        form.elements.primaryContact.setAttribute('aria-invalid', 'true');
        form.elements.primaryContact.focus();
        return 'Enter a valid Bangladesh primary mobile number.';
    }
    if (payload.alternativeContact && !normalizePhone(payload.alternativeContact)) {
        form.elements.alternativeContact.setAttribute('aria-invalid', 'true');
        form.elements.alternativeContact.focus();
        return 'Enter a valid Bangladesh alternative mobile number.';
    }
    if (normalizePhone(payload.alternativeContact) && normalizePhone(payload.alternativeContact) === normalizePhone(payload.primaryContact)) {
        return 'Alternative contact number must be different from the primary number.';
    }
    if (payload.hasMiddleman && !normalizePhone(payload.middlemanContact)) {
        form.elements.middlemanContact.setAttribute('aria-invalid', 'true');
        form.elements.middlemanContact.focus();
        return 'Enter a valid Bangladesh mobile number for the middleman or coordinator.';
    }
    if (payload.hasMiddleman && normalizePhone(payload.middlemanContact) === normalizePhone(payload.primaryContact)) {
        return 'Middleman contact number must be different from the primary contact number.';
    }
    const requiredAt = new Date(`${payload.requiredDate}T${payload.requiredTime}:00+06:00`).getTime();
    if (!Number.isFinite(requiredAt) || requiredAt < Date.now() - 5 * 60 * 1000) return 'Required date and time cannot be in the past.';
    return '';
}

function setSubmitting(submitting) {
    const button = document.getElementById('request-submit');
    if (!button) return;
    button.disabled = submitting;
    button.classList.toggle('is-loading', submitting);
    button.querySelector('.submit-label').textContent = submitting ? 'Submitting securely…' : 'Submit Blood Request';
}

function showSuccess(result) {
    const success = document.getElementById('request-success');
    document.getElementById('success-request-id').textContent = result.requestId;
    document.getElementById('tracking-request-id').value = result.requestId;
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function submitRequest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.submitting === 'true') return;
    clearMessage();
    const payload = formPayload(form);
    const validationError = validateForm(form, payload);
    if (validationError) {
        showMessage(validationError);
        return;
    }
    form.dataset.submitting = 'true';
    setSubmitting(true);
    activeIdempotencyKey ||= crypto.randomUUID().replace(/-/g, '');
    try {
        await appCheckReady;
        payload.requisitionSlip = await fileToPayload(form.elements.requisitionSlip.files[0]);
        const appCheckToken = appCheck ? (await getToken(appCheck)).token : '';
        if (appCheckRequired && !appCheckToken) throw new Error('App verification could not start. Refresh the page and try again.');
        const result = await requestBloodApi('', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': activeIdempotencyKey,
                ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {})
            },
            body: JSON.stringify(payload)
        });
        showMessage('Request submitted successfully. Save your Request ID to track its status.', 'success');
        showSuccess(result);
        form.reset();
        document.getElementById('middleman-toggle')?.dispatchEvent(new Event('change'));
        document.getElementById('requisition-file-name').textContent = 'Choose a secure document';
        activeIdempotencyKey = '';
    } catch (error) {
        showMessage(error.message || 'Could not submit the request. Please try again.');
    } finally {
        form.dataset.submitting = 'false';
        setSubmitting(false);
    }
}

function statusSlug(status) {
    return String(status || '').toLowerCase().replace(/\s+/g, '-');
}

function formatDateTime(timestamp) {
    if (!timestamp) return '—';
    return new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(timestamp));
}

function trackingProgress(status) {
    if (status === 'Cancelled' || status === 'Expired') {
        const message = status === 'Cancelled'
            ? 'This request was cancelled and is no longer active.'
            : 'The required time has passed, so this request is now closed.';
        return `<div class="tracking-closed" data-status="${escapeHtml(statusSlug(status))}"><i class="fa-solid fa-circle-xmark" aria-hidden="true"></i><span>${escapeHtml(message)}</span></div>`;
    }
    const steps = [
        ['Pending', 'Submitted', 'fa-paper-plane'],
        ['Verified', 'Verified', 'fa-shield-halved'],
        ['In Progress', 'In progress', 'fa-droplet'],
        ['Fulfilled', 'Fulfilled', 'fa-circle-check']
    ];
    const currentIndex = Math.max(0, steps.findIndex(([value]) => value === status));
    return `<ol class="tracking-progress" aria-label="Request progress">${steps.map(([value, label, icon], index) => {
        const state = index < currentIndex ? 'complete' : (index === currentIndex ? 'current' : 'upcoming');
        return `<li data-state="${state}"><span><i class="fa-solid ${icon}" aria-hidden="true"></i></span><small>${escapeHtml(label)}</small></li>`;
    }).join('')}</ol>`;
}

function setTrackingLoading(loading) {
    const button = document.getElementById('tracking-submit');
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    const label = button.querySelector('span:last-child');
    if (label) label.textContent = loading ? 'Checking…' : 'Check Status';
}

function renderTracking(result, expectedRequestId) {
    const box = document.getElementById('tracking-result');
    if (!result || result.requestId !== expectedRequestId) {
        box.dataset.type = 'error';
        box.innerHTML = '<strong>Request not found.</strong><p>Check the Request ID and try again.</p>';
        box.hidden = false;
        return;
    }
    box.dataset.type = 'success';
    box.innerHTML = `
        <div class="tracking-result-head">
            <div class="tracking-result-icon" data-status="${escapeHtml(statusSlug(result.status))}"><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i></div>
            <div><small>Current status</small><strong>${escapeHtml(result.status)}</strong></div>
            <span class="status-pill" data-status="${escapeHtml(statusSlug(result.status))}">${escapeHtml(result.status)}</span>
        </div>
        <div class="tracking-request-code"><span>Request ID</span><code>${escapeHtml(result.requestId)}</code></div>
        ${trackingProgress(result.status)}
        <div class="tracking-meta">
            <span><i class="fa-solid fa-droplet" aria-hidden="true"></i><small>Blood requirement</small><b>${escapeHtml(result.bloodGroup)} · ${escapeHtml(result.requiredUnits)} RBC unit${Number(result.requiredUnits) === 1 ? '' : 's'}</b></span>
            <span><i class="fa-regular fa-calendar" aria-hidden="true"></i><small>Required on</small><b>${escapeHtml(result.requiredDate)} at ${escapeHtml(result.requiredTime)}</b></span>
            <span><i class="fa-regular fa-clock" aria-hidden="true"></i><small>Last updated</small><b>${escapeHtml(formatDateTime(result.updatedAt))}</b></span>
        </div>
        <p class="tracking-live"><span></span><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Secure auto-refresh is active · every 15 seconds</p>`;
    box.hidden = false;
}

function renderApprovedRequest(request) {
    const box = document.getElementById('tracking-result');
    if (!request) {
        box.dataset.type = 'error';
        box.innerHTML = '<div class="tracking-error"><i class="fa-solid fa-circle-exclamation"></i><div><strong>This request is not publicly available.</strong><p>It may be pending, fulfilled, cancelled, expired, or the link may be invalid.</p></div></div>';
        box.hidden = false;
        return;
    }
    const contactRow = request.contact
        ? `<span><i class="fa-solid fa-phone"></i><small>Approved public contact</small><b>${escapeHtml(request.contact)}</b></span>`
        : '<span><i class="fa-solid fa-phone"></i><small>Contact</small><b>Contact BAUET BDC for coordination</b></span>';
    box.dataset.type = 'success';
    box.innerHTML = `
        <div class="tracking-result-head"><div class="tracking-result-icon" data-status="verified"><i class="fa-solid fa-shield-halved"></i></div><div><small>Administrator review</small><strong>Verified request</strong></div><span class="status-pill" data-status="${escapeHtml(statusSlug(request.status))}">${escapeHtml(request.status)}</span></div>
        <div class="tracking-request-code"><span>Request ID</span><code>${escapeHtml(request.requestId)}</code></div>
        <div class="tracking-meta">
            <span><i class="fa-solid fa-droplet"></i><small>Blood requirement</small><b>${escapeHtml(request.bloodGroup)} · ${escapeHtml(request.requiredUnits)} RBC unit${Number(request.requiredUnits) === 1 ? '' : 's'}</b></span>
            <span><i class="fa-solid fa-hospital"></i><small>Hospital</small><b>${escapeHtml(request.hospitalName)}, ${escapeHtml(request.district)}</b></span>
            <span><i class="fa-regular fa-calendar"></i><small>Required on</small><b>${escapeHtml(request.requiredDate)} at ${escapeHtml(request.requiredTime)}</b></span>
            <span><i class="fa-solid fa-bolt"></i><small>Urgency</small><b>${escapeHtml(request.urgency)}</b></span>
            ${contactRow}
        </div>
        <p class="tracking-live"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Administrator-verified public request. ${escapeHtml(request.disclaimer || '')}</p>`;
    box.hidden = false;
    document.getElementById('track-title').textContent = 'Verified Blood Request';
    document.getElementById('request-tracking-form').hidden = true;
    document.getElementById('track-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function startTracking(event) {
    event.preventDefault();
    const requestId = document.getElementById('tracking-request-id').value.trim().toUpperCase();
    const box = document.getElementById('tracking-result');
    if (!REQUEST_ID_PATTERN.test(requestId) && !PREVIOUS_REQUEST_ID_PATTERN.test(requestId)) {
        box.hidden = false;
        box.dataset.type = 'error';
        box.textContent = 'Enter a valid Request ID, for example BAUET BDC-1234.';
        return;
    }
    box.hidden = false;
    box.removeAttribute('data-type');
    box.innerHTML = '<div class="tracking-loading"><span></span><div><strong>Checking your request</strong><small>Connecting securely…</small></div></div>';
    setTrackingLoading(true);
    try {
        if (stopTracking) stopTracking();
        let active = true;
        const refresh = async () => {
            try {
                const result = await requestBloodApi(`${encodeURIComponent(requestId)}/track`);
                if (active) renderTracking(result, requestId);
            } catch (error) {
                if (!active) return;
                box.dataset.type = 'error';
                box.innerHTML = `<div class="tracking-error"><i class="fa-solid fa-circle-exclamation"></i><div><strong>Request not found</strong><p>${escapeHtml(error.message || 'Check the Request ID and try again.')}</p></div></div>`;
            }
        };
        await refresh();
        const timer = window.setInterval(refresh, 15000);
        stopTracking = () => { active = false; window.clearInterval(timer); };
    } catch (error) {
        box.dataset.type = 'error';
        box.textContent = error.message || 'Could not check the request status.';
    } finally {
        setTrackingLoading(false);
    }
}

function showCopyToast() {
    const toast = document.getElementById('request-copy-toast');
    if (!toast) return;
    window.clearTimeout(copyToastTimer);
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('show'));
    copyToastTimer = window.setTimeout(() => {
        toast.classList.remove('show');
        window.setTimeout(() => { toast.hidden = true; }, 220);
    }, 1800);
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (_) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        return copied;
    }
}

function init() {
    appCheckReady = initAppCheck();
    const dateField = document.getElementById('required-date');
    if (dateField) dateField.min = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    document.getElementById('blood-request-form')?.addEventListener('submit', submitRequest);
    document.getElementById('request-tracking-form')?.addEventListener('submit', startTracking);
    const middlemanToggle = document.getElementById('middleman-toggle');
    const middlemanFields = document.getElementById('middleman-fields');
    const syncMiddlemanFields = () => {
        const enabled = Boolean(middlemanToggle?.checked);
        if (middlemanFields) middlemanFields.hidden = !enabled;
        ['middlemanName', 'middlemanContact', 'middlemanRole', 'middlemanNote'].forEach(name => {
            const field = document.querySelector(`[name="${name}"]`);
            if (field) field.disabled = !enabled;
        });
        for (const name of ['middlemanName', 'middlemanContact']) {
            const field = document.querySelector(`[name="${name}"]`);
            if (field) field.required = enabled;
        }
    };
    middlemanToggle?.addEventListener('change', syncMiddlemanFields);
    syncMiddlemanFields();
    document.getElementById('requisition-slip')?.addEventListener('change', event => {
        const file = event.target.files[0];
        document.getElementById('requisition-file-name').textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Choose a secure document';
    });
    document.querySelectorAll('[data-copy-target]').forEach(button => button.addEventListener('click', async () => {
        const text = document.getElementById(button.dataset.copyTarget)?.textContent || '';
        if (!text || !(await copyText(text))) return;
        button.setAttribute('aria-label', 'Copied');
        showCopyToast();
        window.setTimeout(() => button.setAttribute('aria-label', 'Copy'), 1200);
    }));
    document.getElementById('track-new-request')?.addEventListener('click', () => {
        document.getElementById('request-tracking-form').requestSubmit();
        document.getElementById('track-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const approvedRequestId = new URLSearchParams(window.location.search).get('approved')?.trim().toUpperCase();
    if (REQUEST_ID_PATTERN.test(approvedRequestId || '') || PREVIOUS_REQUEST_ID_PATTERN.test(approvedRequestId || '') || LEGACY_REQUEST_ID_PATTERN.test(approvedRequestId || '')) {
        if (stopTracking) stopTracking();
        let active = true;
        const refreshApproved = async () => {
            try {
                const result = await requestBloodApi(`${encodeURIComponent(approvedRequestId)}/approved`);
                if (active) renderApprovedRequest(result);
            } catch (_) {
                if (active) renderApprovedRequest(null);
            }
        };
        refreshApproved();
        const timer = window.setInterval(refreshApproved, 30000);
        stopTracking = () => { active = false; window.clearInterval(timer); };
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
