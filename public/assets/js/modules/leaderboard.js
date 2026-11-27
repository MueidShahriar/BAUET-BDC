import { t } from './language-ui.js?v=7';
import {
    buildDonorLeaderboard,
    formatDateDisplay,
    getInitials,
    getTextValue,
    normalizeBloodGroup,
    getDefaultAvatarImageMarkup
} from './utils.js';

let leaderboardFilterHandlersReady = false;
let cachedLeaderboardEntries = [];

const badgeTierMap = {
    gold: 'gold',
    silver: 'silver',
    bronze: 'bronze'
};

function getLeaderboardBadgeLabel(badge) {
    if (!badge || !badge.key) return '';
    return t(badge.key);
}

const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => htmlEntities[character]);
}

function renderLeaderboardCard(entry, rank) {
    const { donor, badge, score, donationCount, lastDonationDate } = entry;
    const donorName = getTextValue(donor.fullName || donor.name, 'Unknown');
    const initials = getInitials(donorName, '?');
    const location = getTextValue(donor.location, '—');
    const blood = normalizeBloodGroup(donor.bloodGroup || donor.blood || donor.blood_group) || '—';
    const lastDonation = lastDonationDate ? formatDateDisplay(lastDonationDate) : '—';
    const badgeLabel = getLeaderboardBadgeLabel(badge);
    const avatar = donor.profilePhoto
        ? `<img src="${donor.profilePhoto}" alt="${initials}" class="leaderboard-avatar__img" loading="lazy" decoding="async" />`
        : getDefaultAvatarImageMarkup(donor.gender, 'leaderboard-avatar__img');
    const medalClass = rank === 1 ? 'leaderboard-medal--gold'
        : rank === 2 ? 'leaderboard-medal--silver'
        : rank === 3 ? 'leaderboard-medal--bronze'
        : 'leaderboard-medal--neutral';
    const cardTierClass = badge?.tier ? `leaderboard-card--${badge.tier}` : '';

    return `
        <article class="leaderboard-card ${cardTierClass}">
            <div class="leaderboard-rank ${medalClass}">${rank}</div>
            <div class="leaderboard-avatar">${avatar}</div>
            <div class="leaderboard-body">
                <div class="leaderboard-top">
                    <h3 class="leaderboard-name">${donorName}</h3>
                    <span class="donor-badge ${badge?.className || ''}">${badge?.icon || ''} ${badgeLabel}</span>
                </div>
                <div class="leaderboard-meta">
                    <span><i class="fa-solid fa-droplet"></i> ${blood}</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${location}</span>
                    <span><i class="fa-solid fa-calendar-check"></i> ${t('leaderboardLastDonation')} ${lastDonation}</span>
                </div>
                <div class="leaderboard-stats">
                    <span class="leaderboard-score"><i class="fa-solid fa-chart-line"></i> ${t('leaderboardScore')}: ${score}</span>
                    <span class="leaderboard-donations"><i class="fa-solid fa-hand-holding-droplet"></i> ${t('leaderboardDonations')}: ${donationCount}</span>
                </div>
            </div>
        </article>
    `;
}

function renderHomeDonorCard(entry, rank) {
    const { donor, badge, score, donationCount, lastDonationDate } = entry;
    const donorName = getTextValue(donor.fullName || donor.name, 'Unknown');
    const location = getTextValue(donor.location, '—');
    const blood = normalizeBloodGroup(donor.bloodGroup || donor.blood || donor.blood_group) || '—';
    const lastDonation = lastDonationDate ? formatDateDisplay(lastDonationDate) : '—';
    const badgeLabel = getLeaderboardBadgeLabel(badge);
    const avatar = donor.profilePhoto
        ? `<img src="${escapeHtml(donor.profilePhoto)}" alt="" loading="lazy" decoding="async" />`
        : getDefaultAvatarImageMarkup(donor.gender);
    const badgeTier = badge?.tier || 'neutral';
    const badgeMarkup = badgeLabel
        ? `<span class="donor-badge ${badge.className}">${badgeLabel}</span>`
        : '';

    return `
        <article class="home-donor-card" data-badge-tier="${badgeTier}">
            <div class="home-donor-card-heading">
                <div class="home-donor-avatar" aria-hidden="true">${avatar}</div>
                <div>
                    <h3>${escapeHtml(donorName)}</h3>
                    ${badgeMarkup}
                </div>
                <span class="home-donor-rank">#${rank}</span>
            </div>
            <div class="home-donor-meta">
                <span><i class="fa-solid fa-droplet" aria-hidden="true"></i> ${escapeHtml(blood)}</span>
                <span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escapeHtml(location)}</span>
                <span><i class="fa-solid fa-calendar-check" aria-hidden="true"></i> ${t('leaderboardLastDonation')} ${escapeHtml(lastDonation)}</span>
            </div>
            <div class="home-donor-metrics">
                <span>${t('leaderboardDonations')}: <strong>${donationCount}</strong></span>
                <span>${t('leaderboardScore')}: <strong>${score}</strong></span>
            </div>
        </article>
    `;
}

function getLeaderboardEntries(donors, recentDonations) {
    const limit = Math.max(0, donors?.length || 0);
    if (!limit) return [];
    return buildDonorLeaderboard(donors, recentDonations, limit);
}

function applyLeaderboardFilters() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    const emptyEl = document.getElementById('leaderboard-empty');
    const queryInput = document.getElementById('leaderboard-filter-input');
    const bloodSelect = document.getElementById('leaderboard-filter-blood');
    const badgeSelect = document.getElementById('leaderboard-filter-badge');
    const sortSelect = document.getElementById('leaderboard-filter-sort');
    const countEl = document.getElementById('leaderboard-filter-count');

    const query = (queryInput?.value || '').trim().toLowerCase();
    const blood = normalizeBloodGroup(bloodSelect?.value || '');
    const badge = badgeSelect?.value || '';
    const sort = sortSelect?.value || 'rank';

    let filtered = cachedLeaderboardEntries.filter((entry) => {
        const donor = entry.donor || {};
        const name = getTextValue(donor.fullName || donor.name, '').toLowerCase();
        const location = getTextValue(donor.location, '').toLowerCase();
        const donorBlood = normalizeBloodGroup(donor.bloodGroup || donor.blood || donor.blood_group);
        if (query && !name.includes(query) && !location.includes(query)) return false;
        if (blood && donorBlood !== blood) return false;
        if (badge && badgeTierMap[entry.badge?.tier || ''] !== badge) return false;
        return true;
    });

    if (sort === 'score') {
        filtered = [...filtered].sort((a, b) => b.score - a.score);
    } else if (sort === 'donations') {
        filtered = [...filtered].sort((a, b) => b.donationCount - a.donationCount);
    } else if (sort === 'recent') {
        filtered = [...filtered].sort((a, b) => {
            const aTime = a.lastDonationDate ? new Date(a.lastDonationDate).getTime() : 0;
            const bTime = b.lastDonationDate ? new Date(b.lastDonationDate).getTime() : 0;
            return bTime - aTime;
        });
    }

    if (!filtered.length) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
    } else {
        if (emptyEl) emptyEl.classList.add('hidden');
        container.innerHTML = filtered.map((entry, index) => renderHomeDonorCard(entry, index + 1)).join('');
    }

    if (countEl) countEl.textContent = `${filtered.length} donors`;
}

export function renderDonorLeaderboard(donors = [], recentDonations = [], options = {}) {
    const {
        containerId = 'leaderboard-list',
        emptyId = 'leaderboard-empty',
        limit = 5
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;
    const emptyEl = document.getElementById(emptyId);

    if (!donors.length) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    const ranked = buildDonorLeaderboard(donors, recentDonations, limit);
    if (!ranked.length) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    container.innerHTML = ranked.map((entry, index) => renderHomeDonorCard(entry, index + 1)).join('');
}

export function renderDonorTicker(donors = [], recentDonations = [], options = {}) {
    const {
        containerId = 'donor-ticker-track',
        emptyId = 'donor-ticker-empty'
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;
    const section = container.closest('#donor-leaderboard');
    const list = container.closest('.home-donor-list');
    const emptyEl = document.getElementById(emptyId);

    section?.classList.remove('hidden');

    const limit = Number(container.dataset.limit || 10);
    const ranked = donors.length
        ? buildDonorLeaderboard(donors, recentDonations, Number.isFinite(limit) ? limit : 10)
        : [];
    container.innerHTML = ranked.map((entry, index) => renderHomeDonorCard(entry, index + 1)).join('');
    if (list) list.hidden = ranked.length === 0;
    emptyEl?.classList.toggle('hidden', ranked.length > 0);
}

export function initLeaderboardFilters(donors = [], recentDonations = []) {
    const filtersWrap = document.getElementById('leaderboard-filters');
    if (!filtersWrap) return;
    cachedLeaderboardEntries = getLeaderboardEntries(donors, recentDonations);

    if (!leaderboardFilterHandlersReady) {
        const queryInput = document.getElementById('leaderboard-filter-input');
        const bloodSelect = document.getElementById('leaderboard-filter-blood');
        const badgeSelect = document.getElementById('leaderboard-filter-badge');
        const sortSelect = document.getElementById('leaderboard-filter-sort');
        const resetBtn = document.getElementById('leaderboard-filter-reset');

        const handleInput = () => applyLeaderboardFilters();
        queryInput?.addEventListener('input', handleInput);
        bloodSelect?.addEventListener('change', handleInput);
        badgeSelect?.addEventListener('change', handleInput);
        sortSelect?.addEventListener('change', handleInput);
        resetBtn?.addEventListener('click', () => {
            if (queryInput) queryInput.value = '';
            if (bloodSelect) bloodSelect.value = '';
            if (badgeSelect) badgeSelect.value = '';
            if (sortSelect) sortSelect.value = 'rank';
            applyLeaderboardFilters();
        });

        leaderboardFilterHandlersReady = true;
    }

    applyLeaderboardFilters();
}
