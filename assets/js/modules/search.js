import state from './state.js';
import { normalizeBloodGroup, isDonorEligible, getInitials, getTextValue, getDonorEligibilityStatus, getDefaultAvatarImageMarkup } from './utils.js';

function getContactHref() {
    const path = window.location.pathname || '';
    const indexHref = path.includes('/pages/') ? '../index.html' : 'index.html';
    return `${indexHref}#contact`;
}

function formatDate(value) {
    if (!value) return 'Not recorded yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not recorded yet';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function getEligibilityMeta(lastDonateDate) {
    const eligibility = getDonorEligibilityStatus(lastDonateDate);

    if (!eligibility) {
        return {
            className: 'donor-status-indicator--unknown',
            label: 'Not recorded',
            tooltip: 'Last donation date is not recorded yet.'
        };
    }

    if (eligibility.isEligible) {
        return {
            className: 'donor-status-indicator--eligible',
            label: 'Eligible',
            tooltip: `Eligible to donate. Last donation: ${formatDate(lastDonateDate)}.`
        };
    }

    return {
        className: 'donor-status-indicator--waiting',
        label: 'Not eligible',
        tooltip: `Not eligible yet. Eligible again on ${formatDate(eligibility.eligibleDate)}.`
    };
}

function renderDonorCardPublic(d) {
    const lastDate = d.lastDonateDate ? (() => { const _d = new Date(d.lastDonateDate); const _p = n => String(n).padStart(2,'0'); return `${_p(_d.getDate())}/${_p(_d.getMonth()+1)}/${_d.getFullYear()}`; })() : '-';
    const donorName = getTextValue(d.fullName || d.name, 'Unknown Donor');
    const initials = getInitials(donorName, 'D');
    const bloodGroup = getTextValue(d.bloodGroup, '—');
    const location = getTextValue(d.location, '—');
    const phone = getTextValue(d.phone, '—');
    const contactNote = getTextValue(d.publicComment, 'Contact Admin');
    const eligibility = getEligibilityMeta(d.lastDonateDate);
    const statusDot = `
        <span
            class="donor-status-indicator ${eligibility.className}"
            aria-label="${eligibility.label}"
            data-tooltip="${eligibility.tooltip}"
            title="${eligibility.tooltip}"
            tabindex="0">
        </span>`;
    const avatarHtml = d.profilePhoto
        ? `<img src="${d.profilePhoto}" alt="" class="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0 bg-white" />`
        : getDefaultAvatarImageMarkup(d.gender, 'w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0 bg-white donor-card__avatar-image');
    const contactHref = getContactHref();
    const contactDesktop = d.isPhoneHidden
        ? `<a href="${contactHref}" class="flex items-center gap-1 text-red-700 hover:text-red-800 transition-colors">
            <i class="fa-solid fa-circle-info text-red-500"></i>
            <span class="text-xs font-semibold no-underline">${contactNote}</span>
           </a>`
        : `<div class="flex items-center gap-1">
                <i class="fa-solid fa-phone text-red-500"></i>
                <span class="font-bold">Contact:</span>
                <a class="text-xs text-gray-600 underline" href="${phone === '—' ? contactHref : `tel:${phone}`}">${phone}</a>
           </div>`;
    const contactMobileRow = d.isPhoneHidden
        ? `<div class="info-row sm:hidden">
                <i class="icon fa-solid fa-circle-info text-red-500"></i>
                <div class="info-text">
                    <a href="${contactHref}" class="value text-red-700 font-semibold hover:text-red-800 transition-colors">${contactNote}</a>
                </div>
           </div>`
        : `<div class="info-row sm:hidden">
                <i class="icon fa-solid fa-phone text-red-500"></i>
                <div class="info-text">
                    <a class="value font-semibold tracking-wide text-gray-700" href="${phone === '—' ? contactHref : `tel:${phone}`}">${phone}</a>
                </div>
           </div>`;
    return `
        <div class="donor-card bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
            <div class="flex-1 min-w-0 mb-2 sm:mb-0">
                <div class="flex items-center gap-2 mb-1">
                    ${avatarHtml}
                    <div class="donor-card__name-row">
                        <div class="font-bold text-red-700 truncate donor-card__name-text">${donorName}</div>
                        ${statusDot}
                    </div>
                </div>
                <div class="info-stack sm:hidden">
                    <div class="info-row">
                        <i class="icon fa-solid fa-droplet text-red-500"></i>
                        <div class="info-text">
                            <span class="label">Blood Group:</span>
                            <span class="value">${bloodGroup}</span>
                        </div>
                    </div>
                    <div class="info-row sm:hidden">
                        <i class="icon fa-solid fa-calendar-day text-red-500"></i>
                        <div class="info-text">
                            <span class="label">Last Donated:</span>
                            <span class="value">${lastDate}</span>
                        </div>
                    </div>
                    <div class="info-row">
                        <i class="icon fa-solid fa-location-dot text-red-500"></i>
                        <div class="info-text">
                            <span class="label">Current Location:</span>
                            <span class="value">${location}</span>
                        </div>
                    </div>
                    ${contactMobileRow}
                </div>
                <div class="hidden sm:flex sm:flex-col text-xs text-gray-600 gap-1 mt-1">
                    <div class="flex items-center gap-1">
                        <i class="fa-solid fa-droplet text-red-500"></i>
                        <span class="font-bold">Blood Group:</span>
                        <span>${bloodGroup}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i class="fa-solid fa-location-dot text-red-500"></i>
                        <span class="font-bold">Current Location:</span>
                        <span>${location}</span>
                    </div>
                    
                </div>
            </div>
            <div class="flex-shrink-0 hidden sm:flex flex-col items-start md:items-end justify-end text-xs text-gray-500 mt-2 sm:mt-0 whitespace-nowrap">
                <div class="flex items-center gap-1">
                    <i class="fa-solid fa-calendar-day text-red-500"></i>
                    <span class="font-bold">Last Donated:</span>
                    <span>${lastDate}</span>
                </div>
                ${contactDesktop}
            </div>
        </div>
    `;
}

export function setSearchLoading(isLoading) {
    if (!state.searchLoaderEl) return;
    if (isLoading) {
        state.searchLoaderShownAt = performance.now ? performance.now() : Date.now();
        state.searchLoaderEl.classList.remove('hidden');
        state.searchLoaderEl.setAttribute('aria-hidden', 'false');
    } else {
        const now = performance.now ? performance.now() : Date.now();
        const elapsed = now - state.searchLoaderShownAt;
        const remaining = Math.max(0, state.SEARCH_LOADER_MIN_MS - elapsed);
        setTimeout(() => {
            state.searchLoaderEl.classList.add('hidden');
            state.searchLoaderEl.setAttribute('aria-hidden', 'true');
        }, remaining);
    }
}

export function renderSearchResults(filteredDonors) {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;
    if (filteredDonors.length === 0) {
        searchResults.innerHTML = '<div class="text-gray-500 italic">No donors found.</div>';
    } else {
        const header = `<div class="text-sm text-gray-600 mb-2">Found <span class="font-bold text-red-700">${filteredDonors.length}</span> donor(s)</div>`;
        searchResults.innerHTML = header + filteredDonors.map(renderDonorCardPublic).join('');
        if (window.registerFloatEls) window.registerFloatEls(searchResults);
    }
    setSearchLoading(false);
}

export function runSearch() {
    const searchResults = document.getElementById('search-results');
    const searchBlood = document.getElementById('search-blood');
    const eligibleOnlyCheckbox = document.getElementById('eligible-only');
    if (!searchResults) return;
    const blood = searchBlood?.value;
    const showEligibleOnly = eligibleOnlyCheckbox?.checked;
    if (state.searchRunTimeout) {
        clearTimeout(state.searchRunTimeout);
        state.searchRunTimeout = null;
    }
    if (blood === 'select') {
        searchResults.innerHTML = '<div class="text-gray-500 italic">No results yet. Perform a search to display donor entries here.</div>';
        setSearchLoading(false);
        return;
    }
    setSearchLoading(true);
    searchResults.innerHTML = '';
    const normalized = normalizeBloodGroup(blood);
    let filtered = (blood && blood !== 'all' && blood !== 'select') ? (state.donorsByGroup.get(normalized) || []) : state.donorsList;
    if (showEligibleOnly) {
        filtered = filtered.filter(d => isDonorEligible(d.lastDonateDate));
    }
    renderSearchResults(filtered);
}

export function initSearch() {
    const searchForm = document.getElementById('search-form');
    const searchBlood = document.getElementById('search-blood');
    const eligibleOnlyCheckbox = document.getElementById('eligible-only');
    const searchResults = document.getElementById('search-results');
    state.searchLoaderEl = document.getElementById('search-loading');
    if (state.searchLoaderEl) setSearchLoading(false);
    searchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        runSearch();
    });
    eligibleOnlyCheckbox?.addEventListener('change', runSearch);
    searchBlood?.addEventListener('change', runSearch);
    if (searchResults) runSearch();
}
