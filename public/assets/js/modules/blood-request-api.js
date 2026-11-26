const API_PATH_PREFIX = '/api/blood-requests';
const LOCAL_API_ORIGIN = 'http://localhost:3000';

let activeApiOrigin = '';

function isLocalPreview() {
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
}
function canRetryOnLocalNode() {
    return isLocalPreview()
        && activeApiOrigin === ''
        && window.location.origin !== LOCAL_API_ORIGIN;
}

async function fetchFrom(origin, path, options) {
    return fetch(`${origin}${path}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options?.headers || {})
        }
    });
}

async function fetchWithLocalFallback(path, options) {
    try {
        const response = await fetchFrom(activeApiOrigin, path, options);
        if (![404, 405].includes(response.status) || !canRetryOnLocalNode()) return response;
    } catch (error) {
        if (!canRetryOnLocalNode()) throw error;
    }

    try {
        const response = await fetchFrom(LOCAL_API_ORIGIN, path, options);
        activeApiOrigin = LOCAL_API_ORIGIN;
        return response;
    } catch (_) {
        throw new Error('Blood request server is not running. Start it with npm start, then try again.');
    }
}

function fallbackError(response) {
    if (response.status === 404 || response.status === 405) {
        return 'Blood request service is not available on this deployment. Deploy the latest server code and try again.';
    }
    if (response.status === 413) return 'The uploaded requisition slip is too large.';
    if (response.status >= 500) return 'Blood request service is temporarily unavailable. Please try again.';
    return 'The blood request could not be completed.';
}

export async function requestBloodApi(path = '', options = {}) {
    const normalizedPath = path ? `/${String(path).replace(/^\/+/, '')}` : '';
    let response;
    try {
        response = await fetchWithLocalFallback(`${API_PATH_PREFIX}${normalizedPath}`, options);
    } catch (error) {
        if (error?.message?.startsWith('Blood request server')) throw error;
        throw new Error('Could not connect to the blood request service. Check your connection and try again.');
    }

    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : {};

    if (!response.ok) throw new Error(result.error || fallbackError(response));
    return result;
}
