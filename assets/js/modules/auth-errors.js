import { t } from './language-ui.js?v=2';

const errorKeys = {
    'auth/invalid-credential': 'authInvalidCredentials',
    'auth/wrong-password': 'authInvalidCredentials',
    'auth/user-not-found': 'authInvalidCredentials',
    'auth/invalid-email': 'authInvalidEmail',
    'auth/missing-email': 'authInvalidEmail',
    'auth/email-already-in-use': 'authEmailAlreadyUsed',
    'auth/credential-already-in-use': 'authEmailAlreadyUsed',
    'auth/weak-password': 'authWeakPassword',
    'auth/too-many-requests': 'authTooManyAttempts',
    'auth/network-request-failed': 'authNetworkError',
    'auth/user-disabled': 'authUserDisabled',
    'auth/operation-not-allowed': 'authUnavailable',
    'auth/requires-recent-login': 'authRecentLoginRequired'
};

export function getFriendlyAuthError(error, context = 'login') {
    const code = String(error?.code || '').toLowerCase();
    if (context === 'reset' && [
        'auth/invalid-credential',
        'auth/user-not-found',
        'auth/wrong-password'
    ].includes(code)) {
        return t('authGenericResetError');
    }

    const key = errorKeys[code] || {
        login: 'authGenericLoginError',
        signup: 'authGenericSignupError',
        reset: 'authGenericResetError'
    }[context] || 'authGenericLoginError';

    return t(key);
}
