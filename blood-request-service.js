const crypto = require('crypto');
const {
  getApps,
  initializeApp,
  applicationDefault,
  cert
} = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { getStorage } = require('firebase-admin/storage');
const { getAppCheck } = require('firebase-admin/app-check');

const FIREBASE_DEFAULTS = Object.freeze({
  databaseURL: 'https://blood-donation-community-a1eb2-default-rtdb.firebaseio.com',
  storageBucket: 'blood-donation-community-a1eb2.appspot.com'
});
const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const URGENCY_LEVELS = new Set(['Emergency', 'Within 24 Hours', 'Scheduled']);
const REQUEST_STATUSES = new Set(['Pending', 'Verified', 'In Progress', 'Fulfilled', 'Cancelled', 'Expired']);
const STATUS_TRANSITIONS = Object.freeze({
  Pending: new Set(['Verified', 'Cancelled', 'Expired']),
  Verified: new Set(['In Progress', 'Fulfilled', 'Cancelled', 'Expired']),
  'In Progress': new Set(['Fulfilled', 'Cancelled', 'Expired']),
  Fulfilled: new Set(),
  Cancelled: new Set(),
  Expired: new Set()
});
const ALLOWED_UPLOADS = Object.freeze({
  'application/pdf': { extension: 'pdf', signature: buffer => buffer.subarray(0, 4).toString() === '%PDF' },
  'image/jpeg': { extension: 'jpg', signature: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: 'png', signature: buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) }
});
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_SUBMISSIONS = 5;
const LOOKUP_RATE_MAX = 20;
const rateBuckets = new Map();
const lookupRateBuckets = new Map();

function parseServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    return parsed;
  }
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }
  return null;
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = parseServiceAccount();
  const supportsApplicationDefault = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.K_SERVICE
    || process.env.FUNCTION_TARGET
    || process.env.FIREBASE_CONFIG
  );
  if (!serviceAccount && !supportsApplicationDefault) {
    throw createHttpError(503, 'Firebase Admin is not configured on the server. Add the Firebase service account environment variables.');
  }
  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL || FIREBASE_DEFAULTS.databaseURL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || FIREBASE_DEFAULTS.storageBucket
  });
}

function cleanText(value, maxLength, { required = false } = {}) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (required && !text) throw createHttpError(400, 'Please complete all required fields.');
  if (text.length > maxLength) throw createHttpError(400, `A field exceeds the ${maxLength} character limit.`);
  return text;
}

function normalizePhone(value, { required = false } = {}) {
  let phone = String(value || '').replace(/[\s()-]/g, '');
  if (!phone && !required) return '';
  if (phone.startsWith('+88')) phone = phone.slice(3);
  else if (phone.startsWith('88')) phone = phone.slice(2);
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw createHttpError(400, 'Enter a valid Bangladesh mobile number.');
  }
  return `+88${phone}`;
}

function createHttpError(status, message, code = '') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function parseDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw createHttpError(400, 'Enter a valid required date and time.');
  }
  const timestamp = Date.parse(`${date}T${time}:00+06:00`);
  if (!Number.isFinite(timestamp)) throw createHttpError(400, 'Enter a valid required date and time.');
  if (timestamp < Date.now() - 5 * 60 * 1000) {
    throw createHttpError(400, 'Required date and time cannot be in the past.');
  }
  return timestamp;
}

function validateSubmission(raw) {
  const bloodGroup = cleanText(raw.bloodGroup, 3, { required: true }).toUpperCase();
  const urgency = cleanText(raw.urgency, 24, { required: true });
  const requiredUnits = Number(raw.requiredUnits);
  const requiredDate = cleanText(raw.requiredDate, 10, { required: true });
  const requiredTime = cleanText(raw.requiredTime, 5, { required: true });
  if (!BLOOD_GROUPS.has(bloodGroup)) throw createHttpError(400, 'Select a valid blood group.');
  if (!URGENCY_LEVELS.has(urgency)) throw createHttpError(400, 'Select a valid urgency level.');
  if (!Number.isInteger(requiredUnits) || requiredUnits < 1 || requiredUnits > 20) {
    throw createHttpError(400, 'Required RBC units must be a whole number between 1 and 20.');
  }
  const requiredAt = parseDateTime(requiredDate, requiredTime);
  const patientAge = raw.patientAge === '' || raw.patientAge == null ? null : Number(raw.patientAge);
  if (patientAge != null && (!Number.isInteger(patientAge) || patientAge < 0 || patientAge > 120)) {
    throw createHttpError(400, 'Patient age must be between 0 and 120.');
  }
  if (raw.consent !== true) throw createHttpError(400, 'Consent is required before submitting.');

  const primaryContact = normalizePhone(raw.primaryContact, { required: true });
  const alternativeContact = normalizePhone(raw.alternativeContact);
  const hasMiddleman = raw.hasMiddleman === true;
  const middlemanContact = hasMiddleman
    ? normalizePhone(raw.middlemanContact, { required: true })
    : '';
  if (alternativeContact && alternativeContact === primaryContact) {
    throw createHttpError(400, 'Alternative contact number must be different.');
  }
  if (middlemanContact && middlemanContact === primaryContact) {
    throw createHttpError(400, 'Middleman contact number must be different from the primary contact number.');
  }

  return {
    bloodComponent: 'RBC',
    bloodGroup,
    requiredUnits,
    requiredDate,
    requiredTime,
    requiredAt,
    urgency,
    patientInformation: {
      name: cleanText(raw.patientName, 100),
      age: patientAge,
      gender: cleanText(raw.patientGender, 20)
    },
    reason: cleanText(raw.reason, 500, { required: true }),
    hospitalInformation: {
      name: cleanText(raw.hospitalName, 160, { required: true }),
      address: cleanText(raw.hospitalAddress, 300, { required: true }),
      district: cleanText(raw.district, 64, { required: true }),
      wardCabinBed: cleanText(raw.wardCabinBed, 80)
    },
    requesterInformation: {
      name: cleanText(raw.requesterName, 100, { required: true }),
      relationship: cleanText(raw.relationship, 80, { required: true }),
      primaryContact,
      alternativeContact,
      publicContactConsent: raw.publicContactConsent === true
    },
    middlemanInformation: hasMiddleman ? {
      name: cleanText(raw.middlemanName, 100, { required: true }),
      contact: middlemanContact,
      role: cleanText(raw.middlemanRole, 120),
      note: cleanText(raw.middlemanNote, 200)
    } : null,
    additionalNotes: cleanText(raw.additionalNotes, 1000),
    consent: true
  };
}

function parseUpload(rawUpload) {
  if (!rawUpload) return null;
  const name = cleanText(rawUpload.name, 120, { required: true });
  const mimeType = cleanText(rawUpload.type, 64, { required: true }).toLowerCase();
  const encoded = typeof rawUpload.data === 'string' ? rawUpload.data : '';
  const allowed = ALLOWED_UPLOADS[mimeType];
  if (!allowed || !encoded) throw createHttpError(400, 'Upload a PDF, JPG, or PNG requisition slip.');
  const base64 = encoded.includes(',') ? encoded.slice(encoded.indexOf(',') + 1) : encoded;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw createHttpError(400, 'Requisition slip must be no larger than 5 MB.');
  }
  if (!allowed.signature(buffer)) throw createHttpError(400, 'The uploaded file content does not match its type.');
  return { name, mimeType, extension: allowed.extension, buffer };
}

function requestIdFor() {
  return `BAUET BDC-${crypto.randomInt(1000, 10000)}`;
}

async function reserveUniqueRequestId(db, requestKey) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const requestId = requestIdFor();
    const result = await db.ref(`bloodRequestLookup/${requestId}`).transaction(current => {
      if (current) return;
      return requestKey;
    }, undefined, false);
    if (result.committed) return requestId;
  }
  throw createHttpError(503, 'Could not allocate a unique request ID. Please retry.');
}

function validateRequestId(value) {
  const requestId = cleanText(value, 40, { required: true }).toUpperCase();
  const isCurrentId = /^BAUET BDC-\d{4}$/.test(requestId);
  const isLegacyId = /^BAUET BDC-\d{12}$/.test(requestId) || /^BR-\d{8}-[A-F0-9]{10}$/.test(requestId);
  if (!isCurrentId && !isLegacyId) throw createHttpError(400, 'Invalid blood request ID.');
  return requestId;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeFileStem(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'requisition';
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function enforceRateLimit(req) {
  const now = Date.now();
  const key = sha256(clientIp(req));
  const existing = rateBuckets.get(key);
  const bucket = !existing || now - existing.startedAt >= RATE_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : existing;
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > RATE_MAX_SUBMISSIONS) {
    throw createHttpError(429, 'Too many requests. Please wait before trying again.');
  }
  if (rateBuckets.size > 2000) {
    for (const [bucketKey, value] of rateBuckets) {
      if (now - value.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(bucketKey);
    }
  }
}

function enforceLookupRateLimit(req) {
  const now = Date.now();
  const key = sha256(`lookup|${clientIp(req)}`);
  const existing = lookupRateBuckets.get(key);
  const bucket = !existing || now - existing.startedAt >= RATE_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : existing;
  bucket.count += 1;
  lookupRateBuckets.set(key, bucket);
  if (bucket.count > LOOKUP_RATE_MAX) {
    throw createHttpError(429, 'Too many status checks. Please wait before trying again.');
  }
  if (lookupRateBuckets.size > 2000) {
    for (const [bucketKey, value] of lookupRateBuckets) {
      if (now - value.startedAt >= RATE_WINDOW_MS) lookupRateBuckets.delete(bucketKey);
    }
  }
}

async function enforceDistributedRateLimit(db, req, now) {
  const ipHash = sha256(`bauet-bdc-blood-request|${clientIp(req)}`);
  const result = await db.ref(`bloodRequestRateLimits/${ipHash}`).transaction(current => {
    const windowStartedAt = Number(current?.windowStartedAt || 0);
    if (!current || now - windowStartedAt >= RATE_WINDOW_MS) {
      return { windowStartedAt: now, count: 1, expiresAt: now + RATE_WINDOW_MS };
    }
    if (Number(current.count || 0) >= RATE_MAX_SUBMISSIONS) return;
    return { ...current, count: Number(current.count || 0) + 1 };
  }, undefined, false);
  if (!result.committed) throw createHttpError(429, 'Too many requests. Please wait before trying again.');
}

async function verifyAppCheck(req) {
  if (process.env.FIREBASE_APP_CHECK_ENFORCED !== 'true') return;
  const token = req.headers['x-firebase-appcheck'];
  if (!token) throw createHttpError(401, 'App verification failed. Please refresh and try again.');
  try {
    await getAppCheck(getAdminApp()).verifyToken(token);
  } catch (_) {
    throw createHttpError(401, 'App verification failed. Please refresh and try again.');
  }
}

async function verifyAdmin(req) {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) throw createHttpError(401, 'Admin sign-in is required.');
  let decoded;
  try {
    decoded = await getAuth(getAdminApp()).verifyIdToken(authHeader.slice(7));
  } catch (_) {
    throw createHttpError(401, 'Your admin session is invalid or expired.');
  }
  const db = getDatabase(getAdminApp());
  const [adminSnapshot, donorSnapshot] = await Promise.all([
    db.ref(`admins/${decoded.uid}`).get(),
    db.ref(`donors/${decoded.uid}/role`).get()
  ]);
  if (adminSnapshot.val() !== true && donorSnapshot.val() !== 'admin') {
    throw createHttpError(403, 'Administrator permission is required.');
  }
  return decoded;
}

function trackingProjection(request) {
  return {
    requestId: request.requestId,
    bloodComponent: 'RBC',
    bloodGroup: request.bloodGroup,
    requiredUnits: request.requiredUnits,
    requiredDate: request.requiredDate,
    requiredTime: request.requiredTime,
    urgency: request.urgency,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    verifiedAt: request.verifiedAt || null
  };
}

function approvedProjection(request) {
  const publicContact = request.requesterInformation?.publicContactConsent
    ? request.requesterInformation.primaryContact
    : '';
  return {
    requestId: request.requestId,
    bloodComponent: 'RBC',
    bloodGroup: request.bloodGroup,
    requiredUnits: request.requiredUnits,
    requiredDate: request.requiredDate,
    requiredTime: request.requiredTime,
    urgency: request.urgency,
    hospitalName: request.hospitalInformation?.name || '',
    district: request.hospitalInformation?.district || '',
    contact: publicContact,
    status: request.status,
    verifiedAt: request.verifiedAt || null,
    disclaimer: 'Blood compatibility and donor eligibility must be confirmed by the hospital or blood bank.'
  };
}

async function storeUpload(requestId, upload) {
  if (!upload) return null;
  const storagePath = `blood-requests/${requestId}/requisition/${Date.now()}-${safeFileStem(upload.name)}.${upload.extension}`;
  const file = getStorage(getAdminApp()).bucket().file(storagePath);
  await file.save(upload.buffer, {
    resumable: false,
    contentType: upload.mimeType,
    metadata: {
      cacheControl: 'private, max-age=0, no-store',
      metadata: { requestId }
    }
  });
  return {
    originalName: upload.name,
    contentType: upload.mimeType,
    size: upload.buffer.length,
    storagePath,
    uploadedAt: Date.now()
  };
}

async function reserveDuplicate(db, fingerprint, idempotencyKey, now) {
  const result = await db.ref(`bloodRequestDedup/${fingerprint}`).transaction(current => {
    if (current && now - Number(current.createdAt || 0) < DUPLICATE_WINDOW_MS && current.idempotencyKey !== idempotencyKey) {
      return;
    }
    return { createdAt: now, idempotencyKey };
  }, undefined, false);
  if (!result.committed) {
    throw createHttpError(409, 'A similar request was submitted recently. Use the tracking details from that submission or wait 10 minutes.');
  }
}

async function submitRequest(req) {
  enforceRateLimit(req);
  await verifyAppCheck(req);
  const data = validateSubmission(req.body || {});
  const upload = parseUpload(req.body?.requisitionSlip);
  const idempotencyKey = cleanText(req.headers['x-idempotency-key'], 100, { required: true });
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) throw createHttpError(400, 'Invalid submission key.');

  const app = getAdminApp();
  const db = getDatabase(app);
  const idempotencyKeyHash = sha256(idempotencyKey);
  const idempotencyRef = db.ref(`bloodRequestIdempotency/${idempotencyKeyHash}`);
  const now = Date.now();
  await enforceDistributedRateLimit(db, req, now);
  const reservationOwner = crypto.randomBytes(12).toString('hex');
  const idempotencyReservation = await idempotencyRef.transaction(current => {
    if (current) return;
    return { state: 'processing', owner: reservationOwner, createdAt: now };
  }, undefined, false);
  if (!idempotencyReservation.committed) {
    const previous = idempotencyReservation.snapshot.val();
    if (previous?.requestId) {
      return { requestId: previous.requestId, status: previous.status || 'Pending', duplicate: true };
    }
    throw createHttpError(409, 'This submission is already being processed. Please wait a moment before retrying.');
  }

  const fingerprint = sha256([
    data.requesterInformation.primaryContact,
    data.bloodGroup,
    data.requiredDate,
    data.requiredTime,
    data.hospitalInformation.name.toLowerCase()
  ].join('|'));
  const requestKey = db.ref('bloodRequests').push().key;
  let requestId = '';
  let requisitionSlip = null;
  let duplicateReserved = false;
  try {
    requestId = await reserveUniqueRequestId(db, requestKey);
    await reserveDuplicate(db, fingerprint, idempotencyKey, now);
    duplicateReserved = true;
    requisitionSlip = await storeUpload(requestId, upload);
    const request = {
      requestId,
      ...data,
      requisitionSlip,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
      verifiedAt: null,
      verifiedBy: null,
      idempotencyKeyHash,
      duplicateFingerprint: fingerprint,
      statusHistory: {
        [db.ref().push().key]: {
          from: null,
          to: 'Pending',
          changedAt: now,
          changedBy: 'requester',
          note: 'Request submitted'
        }
      }
    };
    const notificationId = db.ref('adminNotifications').push().key;
    const updates = {
      [`bloodRequests/${requestKey}`]: request,
      [`bloodRequestLookup/${requestId}`]: requestKey,
      [`bloodRequestTracking/${requestId}`]: trackingProjection(request),
      [`adminNotifications/${notificationId}`]: {
        type: 'bloodRequest',
        title: 'New Blood Request Received',
        requestId,
        bloodGroup: request.bloodGroup,
        requiredUnits: request.requiredUnits,
        urgency: request.urgency,
        hospitalName: request.hospitalInformation.name,
        district: request.hospitalInformation.district,
        status: 'Pending',
        createdAt: now,
        read: false
      },
      [`bloodRequestIdempotency/${idempotencyKeyHash}`]: {
        state: 'complete',
        requestId,
        status: 'Pending',
        createdAt: now
      }
    };
    await db.ref().update(updates);
    return { requestId, status: 'Pending', createdAt: now };
  } catch (error) {
    if (duplicateReserved) await db.ref(`bloodRequestDedup/${fingerprint}`).remove().catch(() => {});
    if (requestId) {
      await db.ref(`bloodRequestLookup/${requestId}`).transaction(current => current === requestKey ? null : current).catch(() => {});
    }
    await idempotencyRef.transaction(current => current?.owner === reservationOwner ? null : current).catch(() => {});
    if (requisitionSlip?.storagePath) {
      await getStorage(app).bucket().file(requisitionSlip.storagePath).delete({ ignoreNotFound: true }).catch(() => {});
    }
    throw error;
  }
}

async function findEligibleDonors(db, request) {
  const snapshot = await db.ref('donors').get();
  const donors = snapshot.val() || {};
  const district = String(request.hospitalInformation?.district || '').toLowerCase();
  return Object.entries(donors).filter(([, donor]) => {
    if (!donor || donor.isActive === false || donor.bloodGroup !== request.bloodGroup) return false;
    const location = [donor.district, donor.location, donor.currentLocation, donor.address]
      .filter(Boolean).join(' ').toLowerCase();
    return !district || location.includes(district);
  });
}

async function changeStatus({ requestId, nextStatus, actorUid, actorLabel = '' }) {
  if (!REQUEST_STATUSES.has(nextStatus)) throw createHttpError(400, 'Select a valid request status.');
  const db = getDatabase(getAdminApp());
  const requestKey = (await db.ref(`bloodRequestLookup/${requestId}`).get()).val() || requestId;
  const requestRef = db.ref(`bloodRequests/${requestKey}`);
  const snapshot = await requestRef.get();
  const request = snapshot.val();
  if (!request) throw createHttpError(404, 'Blood request was not found.');
  if (request.status === nextStatus) return { requestId, status: nextStatus, unchanged: true, matchedDonorCount: 0 };
  if (!STATUS_TRANSITIONS[request.status]?.has(nextStatus)) {
    throw createHttpError(409, `A ${request.status} request cannot be changed to ${nextStatus}.`);
  }
  const now = Date.now();
  const historyKey = db.ref().push().key;
  const updatedRequest = {
    ...request,
    status: nextStatus,
    updatedAt: now,
    verifiedAt: nextStatus === 'Verified' ? now : (request.verifiedAt || null),
    verifiedBy: nextStatus === 'Verified' ? actorUid : (request.verifiedBy || null)
  };
  const updates = {
    [`bloodRequests/${requestKey}/status`]: nextStatus,
    [`bloodRequests/${requestKey}/updatedAt`]: now,
    [`bloodRequests/${requestKey}/statusHistory/${historyKey}`]: {
      from: request.status,
      to: nextStatus,
      changedAt: now,
      changedBy: actorUid,
      changedByLabel: actorLabel || 'Administrator'
    },
    [`bloodRequestTracking/${request.requestId}`]: trackingProjection(updatedRequest)
  };
  if (nextStatus === 'Verified') {
    updates[`bloodRequests/${requestKey}/verifiedAt`] = now;
    updates[`bloodRequests/${requestKey}/verifiedBy`] = actorUid;
  }

  const isPublic = nextStatus === 'Verified' || nextStatus === 'In Progress';
  updates[`approvedBloodRequests/${requestId}`] = isPublic ? approvedProjection(updatedRequest) : null;

  const previousNotificationRefs = request.donorNotificationRefs || {};
  for (const [uid, notificationId] of Object.entries(previousNotificationRefs)) {
    if (!uid || !notificationId) continue;
    updates[`donorNotifications/${uid}/${notificationId}/status`] = nextStatus;
    updates[`donorNotifications/${uid}/${notificationId}/updatedAt`] = now;
  }

  let eligibleDonors = [];
  if (nextStatus === 'Verified') {
    eligibleDonors = await findEligibleDonors(db, request);
    for (const [uid] of eligibleDonors) {
      const notificationId = db.ref(`donorNotifications/${uid}`).push().key;
      updates[`donorNotifications/${uid}/${notificationId}`] = {
        type: 'verifiedBloodRequest',
        requestId,
        bloodGroup: request.bloodGroup,
        requiredUnits: request.requiredUnits,
        requiredDate: request.requiredDate,
        requiredTime: request.requiredTime,
        urgency: request.urgency,
        hospitalName: request.hospitalInformation?.name || '',
        district: request.hospitalInformation?.district || '',
        status: 'Verified',
        createdAt: now,
        read: false
      };
      updates[`bloodRequests/${requestKey}/donorNotificationRefs/${uid}`] = notificationId;
    }
  }
  await db.ref().update(updates);
  return { requestId, status: nextStatus, matchedDonorCount: eligibleDonors.length };
}

async function updateStatus(req) {
  const admin = await verifyAdmin(req);
  const requestId = validateRequestId(req.params.requestId);
  const nextStatus = cleanText(req.body?.status, 24, { required: true });
  return changeStatus({
    requestId,
    nextStatus,
    actorUid: admin.uid,
    actorLabel: admin.email || 'Administrator'
  });
}

async function getRequestForPublicLookup(requestId) {
  const db = getDatabase(getAdminApp());
  const requestKey = (await db.ref(`bloodRequestLookup/${requestId}`).get()).val();
  if (!requestKey) throw createHttpError(404, 'Blood request was not found.');
  const request = (await db.ref(`bloodRequests/${requestKey}`).get()).val();
  if (!request) throw createHttpError(404, 'Blood request was not found.');
  return request;
}

async function trackRequest(req) {
  enforceLookupRateLimit(req);
  const requestId = validateRequestId(req.params.requestId);
  const request = await getRequestForPublicLookup(requestId);
  return trackingProjection(request);
}

async function getApprovedRequest(req) {
  enforceLookupRateLimit(req);
  const requestId = validateRequestId(req.params.requestId);
  const request = await getRequestForPublicLookup(requestId);
  if (!['Verified', 'In Progress'].includes(request.status)) {
    throw createHttpError(404, 'Approved blood request was not found.');
  }
  return approvedProjection(request);
}

async function deleteRequest(req) {
  const admin = await verifyAdmin(req);
  const requestId = validateRequestId(req.params.requestId);
  const app = getAdminApp();
  const db = getDatabase(app);
  const requestKey = (await db.ref(`bloodRequestLookup/${requestId}`).get()).val() || requestId;
  const request = (await db.ref(`bloodRequests/${requestKey}`).get()).val();
  if (!request) throw createHttpError(404, 'Blood request was not found.');
  if (!['Fulfilled', 'Cancelled', 'Expired'].includes(request.status)) {
    throw createHttpError(409, 'Only closed blood requests can be deleted.');
  }

  if (request.requisitionSlip?.storagePath) {
    await getStorage(app).bucket().file(request.requisitionSlip.storagePath).delete({ ignoreNotFound: true });
  }

  const [notificationSnapshot, idempotencySnapshot] = await Promise.all([
    db.ref('adminNotifications').get(),
    db.ref('bloodRequestIdempotency').get()
  ]);
  const updates = {
    [`bloodRequests/${requestKey}`]: null,
    [`bloodRequestLookup/${requestId}`]: null,
    [`bloodRequestTracking/${requestId}`]: null,
    [`approvedBloodRequests/${requestId}`]: null
  };
  if (request.trackingTokenHash) updates[`bloodRequestTracking/${request.trackingTokenHash}`] = null;
  if (request.duplicateFingerprint) updates[`bloodRequestDedup/${request.duplicateFingerprint}`] = null;
  if (request.idempotencyKeyHash) updates[`bloodRequestIdempotency/${request.idempotencyKeyHash}`] = null;

  for (const [notificationId, notification] of Object.entries(notificationSnapshot.val() || {})) {
    if (notification?.requestId === requestId) updates[`adminNotifications/${notificationId}`] = null;
  }
  for (const [key, reservation] of Object.entries(idempotencySnapshot.val() || {})) {
    if (reservation?.requestId === requestId) updates[`bloodRequestIdempotency/${key}`] = null;
  }
  for (const [uid, notificationId] of Object.entries(request.donorNotificationRefs || {})) {
    if (uid && notificationId) updates[`donorNotifications/${uid}/${notificationId}`] = null;
  }

  await db.ref().update(updates);
  return { requestId, deleted: true, deletedBy: admin.uid };
}

async function markExpiredRequests() {
  const db = getDatabase(getAdminApp());
  const snapshot = await db.ref('bloodRequests').get();
  const requests = snapshot.val() || {};
  const now = Date.now();
  const candidates = Object.entries(requests).filter(([, request]) =>
    request && ['Pending', 'Verified', 'In Progress'].includes(request.status) && Number(request.requiredAt || 0) < now
  );
  for (const [, request] of candidates) {
    await changeStatus({ requestId: request.requestId, nextStatus: 'Expired', actorUid: 'system', actorLabel: 'Automatic expiry' });
  }
  return { expired: candidates.length };
}

async function expireRequests(req) {
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const suppliedSecret = Buffer.from(bearer || '');
  const expectedSecret = Buffer.from(process.env.CRON_SECRET || '');
  const isCron = expectedSecret.length > 0
    && suppliedSecret.length === expectedSecret.length
    && crypto.timingSafeEqual(suppliedSecret, expectedSecret);
  if (!isCron) await verifyAdmin(req);
  return markExpiredRequests();
}

async function getRequisitionUrl(req) {
  await verifyAdmin(req);
  const requestId = validateRequestId(req.params.requestId);
  const db = getDatabase(getAdminApp());
  const requestKey = (await db.ref(`bloodRequestLookup/${requestId}`).get()).val() || requestId;
  const snapshot = await db.ref(`bloodRequests/${requestKey}/requisitionSlip`).get();
  const metadata = snapshot.val();
  if (!metadata?.storagePath) throw createHttpError(404, 'No requisition slip is attached.');
  const [url] = await getStorage(getAdminApp()).bucket().file(metadata.storagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 5 * 60 * 1000
  });
  return { url, expiresIn: 300 };
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      const result = await handler(req, res);
      if (!res.headersSent) res.status(200).json(result);
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status >= 500) console.error('Blood request API failed:', error);
      if (!res.headersSent) res.status(status).json({
        error: status === 503
          ? error.message
          : (status >= 500 ? 'The blood request service is temporarily unavailable.' : error.message),
        code: error.code || ''
      });
    }
  };
}

function registerBloodRequestRoutes(app) {
  app.get('/api/blood-requests/config', (_req, res) => {
    res.status(200).json({
      appCheckSiteKey: process.env.FIREBASE_APP_CHECK_SITE_KEY || '',
      appCheckEnforced: process.env.FIREBASE_APP_CHECK_ENFORCED === 'true'
    });
  });
  app.post('/api/blood-requests', asyncRoute(submitRequest));
  app.post('/api/blood-requests/expire', asyncRoute(expireRequests));
  app.get('/api/blood-requests/:requestId/track', asyncRoute(trackRequest));
  app.get('/api/blood-requests/:requestId/approved', asyncRoute(getApprovedRequest));
  app.post('/api/blood-requests/:requestId/status', asyncRoute(updateStatus));
  app.delete('/api/blood-requests/:requestId', asyncRoute(deleteRequest));
  app.get('/api/blood-requests/:requestId/requisition', asyncRoute(getRequisitionUrl));
}

module.exports = {
  registerBloodRequestRoutes,
  validateSubmission,
  normalizePhone,
  trackingProjection,
  approvedProjection,
  sha256
};
