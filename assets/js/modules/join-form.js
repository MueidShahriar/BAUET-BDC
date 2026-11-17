import state from './state.js';
import { showModalMessage } from './modals.js';
import { normalizeDonorId, getDonorIdNumber, getMaxDonorIdNumber, DONOR_ID_COUNTER_SEED } from './utils.js';
import { t } from './language-ui.js?v=2';
import { getFriendlyAuthError } from './auth-errors.js?v=1';

function getLocalDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function initJoinForm({ auth, database, ref, set, runTransaction, createUserWithEmailAndPassword }) {
    state.joinFeedbackEl = document.getElementById('join-feedback');

    function clearJoinFeedback() {
        if (!state.joinFeedbackEl) return;
        state.joinFeedbackEl.textContent = '';
        state.joinFeedbackEl.classList.add('hidden');
        state.joinFeedbackEl.classList.remove('join-feedback--success', 'join-feedback--error');
    }

    function setJoinFeedback(message, type = 'success') {
        if (!state.joinFeedbackEl || !message) return;
        state.joinFeedbackEl.textContent = message;
        state.joinFeedbackEl.classList.remove('hidden', 'join-feedback--success', 'join-feedback--error');
        state.joinFeedbackEl.classList.add(type === 'error' ? 'join-feedback--error' : 'join-feedback--success');
    }

    const joinForm = document.getElementById('join-form');
    const phoneInput = document.getElementById('phone');
    const phoneToast = document.getElementById('join-phone-toast');
    const phoneToastMessage = document.getElementById('join-phone-toast-message');
    let phoneToastTimeout;

    function hidePhoneToast() {
        window.clearTimeout(phoneToastTimeout);
        phoneToast?.classList.remove('show');
        phoneToast?.setAttribute('aria-hidden', 'true');
    }

    function showPhoneToast(message) {
        if (!phoneToast || !phoneToastMessage) {
            setJoinFeedback(message, 'error');
            return;
        }
        window.clearTimeout(phoneToastTimeout);
        phoneToastMessage.textContent = message;
        phoneToast.setAttribute('aria-hidden', 'false');
        phoneToast.classList.add('show');
        phoneToastTimeout = window.setTimeout(hidePhoneToast, 3500);
    }

    phoneInput?.addEventListener('input', () => {
        const digitCount = phoneInput.value.replace(/\D/g, '').length;
        const previousDigitCount = Number(phoneInput.dataset.previousDigitCount || 0);
        if (digitCount > 11 && previousDigitCount <= 11) {
            showPhoneToast('Phone number cannot exceed 11 digits.');
        } else if (digitCount <= 11) {
            hidePhoneToast();
        }
        phoneInput.dataset.previousDigitCount = String(digitCount);
    });

    phoneInput?.addEventListener('invalid', (event) => {
        event.preventDefault();
        showPhoneToast('Phone number must contain exactly 11 digits.');
    });

    const passwordToggles = Array.from(joinForm?.querySelectorAll('[data-password-target]') || []);
    function syncPasswordToggle(toggle) {
        const passwordInput = document.getElementById(toggle.dataset.passwordTarget);
        if (!passwordInput) return;

        const isVisible = passwordInput.type === 'text';
        const labelKey = isVisible ? 'loginHidePassword' : 'loginShowPassword';
        const label = t(labelKey);
        toggle.dataset.i18n = labelKey;
        toggle.title = label;
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
        toggle.querySelector('i')?.classList.toggle('fa-eye', !isVisible);
        toggle.querySelector('i')?.classList.toggle('fa-eye-slash', isVisible);
    }

    passwordToggles.forEach((toggle) => {
        const passwordInput = document.getElementById(toggle.dataset.passwordTarget);
        if (!passwordInput) return;

        syncPasswordToggle(toggle);

        toggle.addEventListener('click', () => {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            syncPasswordToggle(toggle);
        });
    });
    window.addEventListener('languageChanged', () => passwordToggles.forEach(syncPasswordToggle));

    const lastDonateDateInput = document.getElementById('lastDonateDate');
    if (lastDonateDateInput) {
        lastDonateDateInput.max = getLocalDateInputValue();
    }

    joinForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearJoinFeedback();
        const fd = new FormData(joinForm);
        const email = fd.get('email')?.toString().trim();
        const password = fd.get('password')?.toString();
        const confirm = fd.get('confirmPassword')?.toString();
        const gender = fd.get('gender')?.toString();
        const isPhoneHidden = gender === 'Female';
        const donorData = {
            fullName: fd.get('fullName')?.toString().trim(),
            phone: fd.get('phone')?.toString().trim(),
            bloodGroup: fd.get('bloodGroup')?.toString().trim(),
            location: fd.get('location')?.toString().trim(),
            lastDonateDate: fd.get('lastDonateDate')?.toString() || '',
            role: 'member',
            gender: gender || 'Other',
            isPhoneHidden: isPhoneHidden
        };
        if (!donorData.fullName || donorData.fullName.length < 3) { setJoinFeedback('Please enter your full name (minimum 3 characters).', 'error'); return; }
        if (!email) { setJoinFeedback('Please provide a valid email address.', 'error'); return; }
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
        if (!gmailRegex.test(email)) { setJoinFeedback('Only @gmail.com email addresses are accepted. Please use a Gmail account.', 'error'); return; }
        if (!donorData.bloodGroup) { setJoinFeedback('Please select your blood group to help matches find you.', 'error'); return; }
        const digitsOnly = donorData.phone.replace(/\D/g, '');
        if (digitsOnly.length !== 11) {
            showPhoneToast(digitsOnly.length > 11
                ? 'Phone number cannot exceed 11 digits.'
                : 'Phone number must contain exactly 11 digits.');
            phoneInput?.focus();
            return;
        }
        hidePhoneToast();
        donorData.phone = digitsOnly;
        if (!donorData.location || donorData.location.length < 3) { setJoinFeedback('Share your current location (minimum 3 characters).', 'error'); return; }
        if (donorData.lastDonateDate) {
            const selectedDate = donorData.lastDonateDate.trim();
            const dateParts = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(selectedDate);
            const lastDonation = dateParts ? new Date(`${selectedDate}T00:00:00`) : null;
            const isValidDate = Boolean(lastDonation && !Number.isNaN(lastDonation.getTime())
                && lastDonation.getFullYear() === Number(dateParts[1])
                && lastDonation.getMonth() + 1 === Number(dateParts[2])
                && lastDonation.getDate() === Number(dateParts[3]));
            if (!isValidDate || selectedDate > getLocalDateInputValue()) {
                setJoinFeedback('Last donation date cannot be in the future.', 'error');
                return;
            }
        }
        if (!password || !confirm) { setJoinFeedback('Please set and confirm your password.', 'error'); return; }
        if (password !== confirm) { setJoinFeedback('Passwords do not match. Please re-enter them.', 'error'); return; }
        if (password.length < 6) { setJoinFeedback('Password must be at least 6 characters.', 'error'); return; }

        let accountCreated = false;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            accountCreated = true;
            const user = userCredential.user;
            const donorRef = ref(database, 'donors/' + user.uid);
            const counterRef = ref(database, 'stats/donorIdCounter');
            const result = await runTransaction(counterRef, (current) => {
                const currentNum = getDonorIdNumber(current);
                const counterCurrent = Number.isFinite(currentNum) ? currentNum : DONOR_ID_COUNTER_SEED;
                const existingMax = getMaxDonorIdNumber(state.donorsList);
                return Math.max(counterCurrent, existingMax, DONOR_ID_COUNTER_SEED) + 1;
            });
            if (!result.committed) throw new Error('Failed to allocate donor ID');
            const donorId = normalizeDonorId(result.snapshot.val());
            await set(donorRef, {
                ...donorData,
                donorId,
                totalDonations: 0,
                email,
                createdAt: new Date().toISOString()
            });
            setJoinFeedback(`Welcome, ${donorData.fullName}! Your donor profile was created successfully.`, 'success');
            showModalMessage('success-modal', `Welcome, ${donorData.fullName}! Your donor profile was created successfully.`, 'Success');
            joinForm.reset();
            setTimeout(() => clearJoinFeedback(), 7000);
        } catch (error) {
            console.error('Join form submission failed:', error);
            if (accountCreated) {
                setJoinFeedback('An error occurred while saving your profile data. Please try again.', 'error');
                showModalMessage('success-modal', 'An error occurred while saving your profile data.', 'Error');
            } else {
                const message = getFriendlyAuthError(error, 'signup');
                setJoinFeedback(message, 'error');
                showModalMessage('success-modal', message, t('authRegistrationFailedTitle'));
            }
        }
    });

}
