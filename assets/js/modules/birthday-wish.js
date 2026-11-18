import { t } from './language-ui.js?v=2';

let currentDonor = null;
let dayChangeTimer = null;

function getBirthDateParts(profile) {
    const rawDate = profile?.dateOfBirth || profile?.birthDate || profile?.dob;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(rawDate || ''));
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 ||
        birthDate.getDate() !== day || birthDate > today) {
        return null;
    }

    return { month, day };
}

function getBirthdayHost() {
    const profileContent = document.getElementById('profile-content');
    if (profileContent) {
        return { container: profileContent, before: profileContent.firstChild };
    }

    const hero = document.getElementById('hero');
    if (hero?.parentElement) {
        return { container: hero.parentElement, before: hero };
    }

    return null;
}

function createBirthdayBanner() {
    const banner = document.createElement('aside');
    banner.id = 'birthday-wish';
    banner.className = 'birthday-wish';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    const balloonField = document.createElement('span');
    balloonField.className = 'birthday-wish__balloon-field';
    balloonField.setAttribute('aria-hidden', 'true');
    balloonField.innerHTML = [
        { position: 'left-one', string: 'M12 0 C7 11 6 19 12 29 C18 39 18 48 11 57 C7 63 8 68 12 72' },
        { position: 'left-two', string: 'M12 0 C19 10 6 18 11 28 C17 39 5 47 12 56 C18 63 13 68 12 72' },
        { position: 'right-one', string: 'M12 0 C6 9 18 19 12 30 C7 40 6 48 13 57 C19 64 16 69 12 72' },
        { position: 'right-two', string: 'M12 0 C18 12 9 20 11 30 C13 40 19 48 12 57 C5 64 8 68 12 72' }
    ].map(({ position, string }) => `
        <span class="birthday-wish__balloon birthday-wish__balloon--${position}">
            <svg class="birthday-wish__string" viewBox="0 0 24 72" preserveAspectRatio="none" aria-hidden="true">
                <path d="${string}"></path>
            </svg>
        </span>`).join('');

    const partyPopper = document.createElement('span');
    partyPopper.className = 'birthday-wish__popper';
    partyPopper.setAttribute('aria-hidden', 'true');
    partyPopper.innerHTML = `
        <svg viewBox="0 0 140 120" focusable="false">
            <g class="birthday-wish__popper-burst">
                <path d="M54 57C49 42 44 28 34 16" fill="none" stroke="#fbbf24" stroke-linecap="round" stroke-width="3.5"/>
                <path d="M58 54C59 37 56 21 56 7" fill="none" stroke="#f59e0b" stroke-linecap="round" stroke-width="3.5"/>
                <path d="M62 53C72 37 78 22 80 8" fill="none" stroke="#14b8a6" stroke-linecap="round" stroke-width="3.5"/>
                <path d="M65 55C81 43 90 31 98 18" fill="none" stroke="#ec4899" stroke-linecap="round" stroke-width="3.5"/>
                <path d="M67 58C85 53 101 45 116 37" fill="none" stroke="#0ea5e9" stroke-linecap="round" stroke-width="3.5"/>
                <path d="M66 62C84 65 101 62 119 58" fill="none" stroke="#84cc16" stroke-linecap="round" stroke-width="3.5"/>
                <path d="M62 65C77 76 91 82 106 86" fill="none" stroke="#8b5cf6" stroke-linecap="round" stroke-width="3.5"/>
                <path d="M83 34c7-8 15 0 20-8s-2-10 4-15M91 48c7-7 15 1 20-6s-1-9 5-13M88 70c7 7 15-1 21 6s2 9 8 12" fill="none" stroke="#ec4899" stroke-linecap="round" stroke-width="2.8"/>
                <path d="m23 24 5 10-10-3z" fill="#fb7185"/>
                <path d="m44 13 3 12-7-2z" fill="#f59e0b"/>
                <path d="m73 19 10-8 1 12z" fill="#8b5cf6"/>
                <path d="m115 28 11 4-9 5z" fill="#14b8a6"/>
                <path d="m105 10 3 5 6 1-5 4-1 6-4-5-6-1 5-4z" fill="#fbbf24"/>
                <path d="m101 76 3 5 6 1-5 4-1 6-4-5-6-1 5-4z" fill="#0ea5e9"/>
                <circle cx="31" cy="45" r="3" fill="#0ea5e9"/>
                <circle cx="63" cy="9" r="2.5" fill="#ec4899"/>
                <circle cx="128" cy="43" r="3" fill="#f97316"/>
                <circle cx="120" cy="76" r="2.5" fill="#84cc16"/>
                <circle cx="79" cy="29" r="2.4" fill="#f97316"/>
            </g>
            <path d="M7 111 42 43 74 62z" fill="#fbbf24"/>
            <path d="m42 43 32 19-16 25z" fill="#f59e0b"/>
            <path d="m26 74 8 4-5 9-8-4zM17 91l8 4-5 9-8-4z" fill="#fff" opacity=".88"/>
            <path d="m40 42 35 20-5 9-35-20z" fill="#d97706"/>
            <path d="m7 111 11-2-8 10z" fill="#be123c"/>
        </svg>`;

    const icon = document.createElement('span');
    icon.className = 'birthday-wish__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<i class="fa-solid fa-cake-candles"></i>';

    const copy = document.createElement('span');
    copy.className = 'birthday-wish__copy';

    const title = document.createElement('strong');
    title.className = 'birthday-wish__title';

    const message = document.createElement('span');
    message.className = 'birthday-wish__message';

    copy.append(title, message);
    banner.append(balloonField, partyPopper, icon, copy);
    return banner;
}

function renderBirthdayWish() {
    const banner = document.getElementById('birthday-wish');
    const birthDate = getBirthDateParts(currentDonor);
    const today = new Date();
    const isBirthday = birthDate && birthDate.month === today.getMonth() + 1 &&
        birthDate.day === today.getDate();

    if (!isBirthday) {
        banner?.remove();
        return;
    }

    const host = getBirthdayHost();
    if (!host) return;

    const birthdayBanner = banner || createBirthdayBanner();
    if (birthdayBanner.parentElement !== host.container) {
        host.container.insertBefore(birthdayBanner, host.before);
    }

    const name = String(currentDonor?.fullName || currentDonor?.name || '').trim();
    const title = t('birthdayWishTitle');
    birthdayBanner.querySelector('.birthday-wish__title').textContent =
        name ? `${title}, ${name}!` : `${title}!`;
    birthdayBanner.querySelector('.birthday-wish__message').textContent = t('birthdayWishMessage');
}

function scheduleDayChangeCheck() {
    window.clearTimeout(dayChangeTimer);
    if (!getBirthDateParts(currentDonor) || !getBirthdayHost()) return;

    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    dayChangeTimer = window.setTimeout(() => {
        renderBirthdayWish();
        scheduleDayChangeCheck();
    }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
}

function refreshBirthdayWish() {
    renderBirthdayWish();
    scheduleDayChangeCheck();
}

export function updateBirthdayWish(profile) {
    currentDonor = profile && typeof profile === 'object' ? profile : null;
    refreshBirthdayWish();
}

window.addEventListener('languageChanged', renderBirthdayWish);
window.addEventListener('focus', refreshBirthdayWish);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshBirthdayWish();
});
