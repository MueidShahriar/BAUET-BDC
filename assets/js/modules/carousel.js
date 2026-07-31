import state from './state.js';
import { getInitials, getTextValue, normalizeDonorId } from './utils.js';

export function setRecentLoading(isLoading) {
    state.recentLoaderState = Boolean(isLoading);

    if (!state.recentLoaderEl) return;

    state.recentLoaderEl.classList.toggle('hidden', !isLoading);

    state.recentLoaderEl.setAttribute(
        'aria-hidden',
        (!isLoading).toString()
    );

    const carousel = document.getElementById('recentDonorCarousel');

    if (!carousel) return;

    carousel.setAttribute('aria-busy', isLoading.toString());

    if (isLoading) {
        carousel.classList.remove('show-controls');
    } else {
        setTimeout(() => {
            carousel.classList.add('show-controls');
        }, 100);
    }
}

function formatDate(date) {
    if (!date) return '—';

    const d = new Date(date);

    if (isNaN(d.getTime())) return '—';

    const pad = n => String(n).padStart(2, '0');

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function getRecentDonationProfile(donation) {
    if (!donation || !Array.isArray(state.donorsList) || !state.donorsList.length) {
        return null;
    }

    const normalizedDonationId = normalizeDonorId(donation.donorId || donation.rawDonorId);
    const donationPhone = getTextValue(donation.phone, '');
    const donationEmail = getTextValue(donation.email, '').toLowerCase();
    const donationName = getTextValue(donation.name || donation.donorName || donation.fullName, '').toLowerCase();

    return state.donorsList.find((donor) => {
        const normalizedDonorId = normalizeDonorId(donor.donorId || donor.rawDonorId);
        if (normalizedDonationId && normalizedDonorId && normalizedDonationId === normalizedDonorId) {
            return true;
        }

        const donorPhone = getTextValue(donor.phone, '');
        if (donationPhone && donorPhone && donationPhone === donorPhone) {
            return true;
        }

        const donorEmail = getTextValue(donor.email, '').toLowerCase();
        if (donationEmail && donorEmail && donationEmail === donorEmail) {
            return true;
        }

        const donorName = getTextValue(donor.fullName || donor.name, '').toLowerCase();
        return Boolean(donationName && donorName && donationName === donorName);
    }) || null;
}

function resolveRecentDonationEntry(donation) {
    const profile = getRecentDonationProfile(donation);
    return profile
        ? {
            ...profile,
            ...donation,
            profilePhoto: donation.profilePhoto || profile.profilePhoto || ''
        }
        : donation;
}

function resetBootstrapCarousel(carousel, itemCount) {
    if (!carousel) return;

    carousel.classList.remove('show-controls');
    carousel.setAttribute('data-active-index', '0');

    const $ = window.jQuery;
    if (!$ || !$.fn?.carousel) return;

    try {
        $(carousel).carousel('dispose');
    } catch (_) {
        // Ignore stale instance disposal errors.
    }

    if (itemCount <= 1) return;

    $(carousel).carousel({
        interval: Number(carousel.dataset.interval) || 3000,
        pause: carousel.dataset.pause || 'hover',
        wrap: true,
        ride: false
    });
    $(carousel).carousel(0);
}

export function renderRecentDonorsCarousel(donors = []) {
    const carouselInner = document.querySelector(
        '#recentDonorCarousel .carousel-inner'
    );

    const carouselIndicators = document.querySelector(
        '#recentDonorCarousel .carousel-indicators'
    );

    const carousel = document.getElementById('recentDonorCarousel');

    if (!carouselInner || !carouselIndicators) return;

    carouselInner.innerHTML = '';
    carouselIndicators.innerHTML = '';

    if (!Array.isArray(donors) || donors.length === 0) {
        if (carousel) {
            carousel.dataset.state = 'empty';
        }

        carouselInner.innerHTML = `
            <div class="carousel-item active">
                <article class="recent-card mx-auto max-w-2xl w-full">

                    <div class="recent-card__chip">
                        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                        Recent Donation Feed
                    </div>

                    <div class="recent-card__summary">

                        <div class="recent-card__avatar" aria-hidden="true">
                            BD
                        </div>

                        <div class="recent-card__summary-copy">
                            <p class="recent-card__headline">
                                No recent donations have been published yet.
                            </p>

                            <p class="recent-card__date">
                                Once admins add a donation entry, it will appear here automatically.
                            </p>
                        </div>

                    </div>
                </article>
            </div>
        `;

        if (carousel) {
            carousel.classList.remove('show-controls');
        }

        return;
    }

    if (carousel) {
        carousel.dataset.state =
            donors.length === 1 ? 'single' : 'ready';
    }

    let itemsHTML = '';
    let indicatorsHTML = '';

    donors.forEach((entry, index) => {
        const d = resolveRecentDonationEntry(entry);
        const donationDate = formatDate(d.date);

        const donorName = getTextValue(
            d.name || d.donorName || d.fullName,
            'Anonymous Donor'
        );

        const locationLabel = getTextValue(d.location, '—');
        const department = getTextValue(d.department, '—');
        const batch = getTextValue(d.batch, '—');
        const age = getTextValue(d.age, '—');

        const weightValue = getTextValue(d.weight, '');
        const weight = weightValue ? `${weightValue} kg` : '—';

        const bloodGroup = getTextValue(d.bloodGroup, '—');

        const initials = getInitials(donorName, 'BD');

        const itemClass =
            index === 0
                ? 'carousel-item active'
                : 'carousel-item';

        const avatarMarkup = d.profilePhoto
            ? `<img src="${d.profilePhoto}" alt="${donorName}" class="recent-card__avatar-image" loading="lazy" />`
            : initials;

        itemsHTML += `
            <div class="${itemClass}">
                <article class="recent-card mx-auto max-w-2xl w-full">

                    <span class="recent-card__halo" aria-hidden="true"></span>
                    <div class="recent-card__summary">

                        <div class="recent-card__avatar" aria-hidden="true">
                            ${avatarMarkup}
                        </div>

                        <div class="recent-card__summary-copy">
                            <p class="recent-card__headline">
                                A huge thank you to <span>${donorName}</span>.
                            </p>

                            <p class="recent-card__date">
                                Donated on <span>${donationDate}</span>
                            </p>
                        </div>

                    </div>

                    <div class="recent-card__divider" aria-hidden="true"></div>

                    <div class="recent-card__stats">

                        <div class="recent-card__stat recent-card__stat--wide recent-card__stat--donation-center">
                            <span class="recent-card__stat-label">
                                <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                                Donation Center
                            </span>

                            <span class="recent-card__stat-value">
                                ${locationLabel}
                            </span>
                        </div>

                        <div class="recent-card__stat recent-card__stat--accent recent-card__stat--blood">
                            <span class="recent-card__stat-label">
                                <i class="fa-solid fa-droplet" aria-hidden="true"></i>
                                Blood Group
                            </span>

                            <span class="recent-card__stat-value">
                                ${bloodGroup}
                            </span>
                        </div>

                        <div class="recent-card__stat recent-card__stat--batch">
                            <span class="recent-card__stat-label">
                                <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
                                Batch
                            </span>

                            <span class="recent-card__stat-value">
                                ${batch}
                            </span>
                        </div>

                        <div class="recent-card__stat recent-card__stat--age">
                            <span class="recent-card__stat-label">
                                <i class="fa-solid fa-user" aria-hidden="true"></i>
                                Age
                            </span>

                            <span class="recent-card__stat-value">
                                ${age}
                            </span>
                        </div>

                        <div class="recent-card__stat recent-card__stat--department">
                            <span class="recent-card__stat-label">
                                <i class="fa-solid fa-building-columns" aria-hidden="true"></i>
                                Department
                            </span>

                            <span class="recent-card__stat-value">
                                ${department}
                            </span>
                        </div>

                        <div class="recent-card__stat recent-card__stat--weight">
                            <span class="recent-card__stat-label">
                                <i class="fa-solid fa-weight-scale" aria-hidden="true"></i>
                                Weight
                            </span>

                            <span class="recent-card__stat-value">
                                ${weight}
                            </span>
                        </div>

                    </div>
                </article>
            </div>
        `;

        indicatorsHTML += `
            <li
                data-target="#recentDonorCarousel"
                data-slide-to="${index}"
                class="${index === 0 ? 'active' : ''}">
            </li>
        `;
    });

    carouselInner.innerHTML = itemsHTML;
    carouselIndicators.innerHTML = indicatorsHTML;
    resetBootstrapCarousel(carousel, donors.length);

    carouselIndicators.classList.toggle(
        'hidden',
        donors.length <= 1
    );

    if (carousel) {
        setTimeout(() => {
            if (donors.length > 1) {
                carousel.classList.add('show-controls');
            }
        }, 150);
    }
}

export function initCarousel() {
    if (!state.recentLoaderEl) {
        state.recentLoaderEl =
            document.getElementById('recent-loading');

        if (state.recentLoaderEl) {
            setRecentLoading(state.recentLoaderState);
        }
    }

    const initialCarousel =
        document.getElementById('recentDonorCarousel');

    if (initialCarousel) {
        initialCarousel.classList.remove('show-controls');
    }

    window.setTimeout(() => {
        if (!state.recentLoaderState) return;

        renderRecentDonorsCarousel([]);

        setRecentLoading(false);
    }, 6500);
}
