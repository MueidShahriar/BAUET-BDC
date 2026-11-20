
import { t } from './language-ui.js?v=7';
import { formatPhoneForDisplay } from './utils.js';

const logoUrl = new URL('../../../image/bauet-bdc-logo.webp', import.meta.url).href;
const signatureUrl = new URL('../../../image/sign.png', import.meta.url).href;
const donorCardMotto = 'Donate Blood, Save Lives';

function loadArtwork(src) {
    return new Promise(resolve => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

function formatDocumentDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB');
}

function prepareSignature(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Turn paper brightness into transparency while keeping the antialiased ink edges.
    for (let index = 0; index < pixels.data.length; index += 4) {
        const brightness = 0.2126 * pixels.data[index] + 0.7152 * pixels.data[index + 1] + 0.0722 * pixels.data[index + 2];
        const inkOpacity = Math.min(1, Math.max(0, (247 - brightness) / 210));
        pixels.data[index] = 38;
        pixels.data[index + 1] = 28;
        pixels.data[index + 2] = 26;
        pixels.data[index + 3] *= inkOpacity;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
}

export async function generateCertificate(donorData) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const [logo, signature] = await Promise.all([loadArtwork(logoUrl), loadArtwork(signatureUrl)]);
    drawCertificate(canvas, donorData, logo, signature ? prepareSignature(signature) : null);
    return canvas;
}

function drawCertificate(canvas, donorData, logo, signature) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const center = width / 2;
    const accent = '#842146';
    const ink = '#33232c';
    const muted = '#69515b';
    ctx.fillStyle = '#fffaf3';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(26, 26, width - 52, height - 52);
    ctx.strokeStyle = '#ba9761';
    ctx.lineWidth = 2;
    ctx.strokeRect(45, 45, width - 90, height - 90);

    if (logo) ctx.drawImage(logo, center - 36, 76, 72, 72);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('BAUET BLOOD DONATION CLUB', center, 182);

    ctx.fillStyle = ink;
    ctx.font = 'bold 60px Georgia, serif';
    ctx.fillText('Certificate of Appreciation', center, 265, 1040);
    ctx.fillStyle = '#ba9761';
    ctx.fillRect(center - 110, 292, 220, 2);

    ctx.fillStyle = muted;
    ctx.font = '24px Georgia, serif';
    ctx.fillText('Presented to', center, 347);
    ctx.fillStyle = accent;
    ctx.font = 'bold 65px Georgia, serif';
    ctx.fillText(donorData.fullName || 'Donor', center, 427, 1020);

    ctx.fillStyle = ink;
    ctx.font = '25px Georgia, serif';
    ctx.fillText('In appreciation of your voluntary blood donation.', center, 484);

    const date = donorData.lastDonateDate ? formatDocumentDate(donorData.lastDonateDate + 'T00:00:00') : '—';
    const group = donorData.bloodGroup || '—';
    [['Donation date', date, 398], ['Blood group', group, 624]].forEach(([label, value, left]) => {
        ctx.fillStyle = '#f6eaf0';
        ctx.beginPath();
        ctx.roundRect(left, 527, 178, 78, 12);
        ctx.fill();
        ctx.fillStyle = muted;
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText(label, left + 89, 553);
        ctx.fillStyle = accent;
        ctx.font = 'bold 27px Arial, sans-serif';
        ctx.fillText(value, left + 89, 583, 154);
    });

    ctx.fillStyle = muted;
    ctx.font = '17px Arial, sans-serif';
    ctx.fillText('Certificate ID', center, 714);
    ctx.fillStyle = ink;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(generateCertificateId(donorData), center, 744, 316);

    if (signature) {
        const height = 74;
        const width = height * signature.width / signature.height;
        ctx.drawImage(signature, 294 - width / 2, 652, width, height);
    }
    ctx.fillStyle = '#ba9761';
    ctx.fillRect(178, 731, 232, 1);
    ctx.fillRect(790, 731, 232, 1);
    ctx.fillStyle = ink;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(formatDocumentDate(new Date()), 906, 712);
    ctx.fillStyle = muted;
    ctx.font = '17px Arial, sans-serif';
    ctx.fillText('Authorized signature', 294, 756);
    ctx.fillText('Date issued', 906, 756);
}

function generateCertificateId(donorData) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bloodGroup = (donorData.bloodGroup || 'XX').replace(/[+-]/g, '');
    return `BDC-${bloodGroup}-${timestamp}-${random}`;
}

export function downloadCertificate(canvas, donorName) {
    import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        .then((module) => {
            const { jsPDF } = window.jspdf;
            
            const scale = 2;
            const highResCanvas = document.createElement('canvas');
            highResCanvas.width = canvas.width * scale;
            highResCanvas.height = canvas.height * scale;
            const highResCtx = highResCanvas.getContext('2d');
            
            highResCtx.imageSmoothingEnabled = true;
            highResCtx.imageSmoothingQuality = 'high';
            
            highResCtx.scale(scale, scale);
            highResCtx.drawImage(canvas, 0, 0);
            
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.height, canvas.width],
                compress: false,
                precision: 16
            });
            
            const imgData = highResCanvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
            
            const fileName = `Blood_Donation_Certificate_${donorName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            pdf.save(fileName);
        })
        .catch((error) => {
            console.error('Error loading jsPDF:', error);
            const link = document.createElement('a');
            const fileName = `Blood_Donation_Certificate_${donorName.replace(/\s+/g, '_')}_${Date.now()}.png`;
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
}

export function shareCertificate(canvas, donorName) {
    canvas.toBlob((blob) => {
        const file = new File([blob], 'certificate.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            navigator.share({
                title: 'Blood Donation Certificate',
                text: `I donated blood and received this certificate from BAUET BDC! 🩸 #BloodDonation #SaveLives`,
                files: [file]
            }).catch((error) => {
                if (error.name === 'AbortError') return;
                console.error('Error sharing:', error);
                fallbackShare(canvas, donorName);
            });
        } else {
            fallbackShare(canvas, donorName);
        }
    });
}

function fallbackShare(canvas, donorName) {
    const content = showModal(t('certShare'), `
        <div class="document-sheet">
            <p>${t('certShareDownload')}</p>
            <div class="document-actions">
                <button type="button" class="document-action document-action--primary">
                    <i class="fa-solid fa-download" aria-hidden="true"></i> ${t('certDownload')}
                </button>
            </div>
        </div>
    `);
    content.querySelector('button').addEventListener('click', () => downloadCertificate(canvas, donorName));
}

export async function showCertificateModal(donorData) {
    try {
        const canvas = await generateCertificate(donorData);
        const name = donorData.fullName || 'Donor';
        const content = showModal(t('certTitle'), `
            <div class="document-sheet">
                <div class="document-preview">
                    <img src="${canvas.toDataURL('image/png')}" alt="${t('certTitle')}" width="1200" height="850">
                </div>
                <div class="document-actions">
                    <button type="button" class="document-action" data-document-action="share">
                        <i class="fa-solid fa-share-nodes" aria-hidden="true"></i> ${t('certShare')}
                    </button>
                    <button type="button" class="document-action document-action--primary" data-document-action="download">
                        <i class="fa-solid fa-download" aria-hidden="true"></i> ${t('certPdfDownload')}
                    </button>
                </div>
            </div>
        `);
        content.querySelector('[data-document-action="download"]').addEventListener('click', () => downloadCertificate(canvas, name));
        content.querySelector('[data-document-action="share"]').addEventListener('click', () => shareCertificate(canvas, name));
    } catch (error) {
        console.error('Error generating certificate:', error);
        showModal(t('certTitle'), `<p>${t('certPreviewError')}</p>`);
    }
}

function getDonorDocument(donorData) {
    const name = donorData.fullName || 'Donor';
    const initials = name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    let lastDonation = '—';
    let nextEligible = '—';
    if (donorData.lastDonateDate) {
        const last = new Date(donorData.lastDonateDate + 'T00:00:00');
        lastDonation = formatDocumentDate(last);
        const next = new Date(last.getTime() + 90 * 24 * 60 * 60 * 1000);
        nextEligible = next <= new Date() ? 'Eligible Now' : formatDocumentDate(next);
    }

    let age = '';
    if (donorData.dateOfBirth) {
        const birthday = new Date(donorData.dateOfBirth + 'T00:00:00');
        const today = new Date();
        age = today.getFullYear() - birthday.getFullYear();
        if (today.getMonth() < birthday.getMonth() ||
            (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())) age--;
        age = Number.isNaN(age) ? '' : `${age} years`;
    }

    const joined = donorData.createdAt || donorData.memberSince;
    return {
        name,
        initials,
        blood: donorData.bloodGroup || '—',
        email: donorData.email || '—',
        description: [donorData.gender, age].filter(Boolean).join(' · '),
        details: [
            ['profileLocation', donorData.location || '—'],
            ['profilePhone', formatPhoneForDisplay(donorData.phone || '—')],
            ['profileLastDonationLabel', lastDonation],
            ['profileNextEligible', nextEligible],
            ['profileMemberSince', joined ? formatDocumentDate(joined) : '—'],
        ],
    };
}

function escapeMarkup(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function showDonorCardModal(donorData, containerEl) {
    const card = getDonorDocument(donorData);
    const fields = card.details.map(([label, value]) => `
        <div><dt>${t(label)}</dt><dd>${escapeMarkup(value)}</dd></div>
    `).join('');
    const markup = `
        <div class="donor-document">
            <article id="donor-card-preview" class="donor-document__card">
                <div class="donor-document__brand">
                    <img src="${logoUrl}" alt="" width="36" height="36">
                    <div><span>BAUET BDC</span><strong>${t('profileDonorCard')}</strong></div>
                </div>
                <div class="donor-document__identity">
                    <button type="button" id="donor-card-photo-area" class="donor-document__photo" aria-label="${t('profileUploadPhoto')}">
                        <span aria-hidden="true">${escapeMarkup(card.initials)}</span>
                        <img id="donor-card-photo-img" alt="" hidden>
                    </button>
                    <div>
                        <h3>${escapeMarkup(card.name)}</h3>
                        <p>${escapeMarkup(card.email)}</p>
                        ${card.description ? `<p>${escapeMarkup(card.description)}</p>` : ''}
                        <span class="donor-document__blood">${escapeMarkup(card.blood)}</span>
                    </div>
                </div>
                <dl class="donor-document__details">${fields}</dl>
                <div class="donor-document__footer">${donorCardMotto}</div>
            </article>
            <div class="document-actions">
                <label class="document-action" for="donor-card-photo-input">
                    <i class="fa-solid fa-camera" aria-hidden="true"></i>
                    <span id="donor-card-upload-text">${t('profileUploadPhoto')}</span>
                    <input type="file" id="donor-card-photo-input" accept="image/*" class="sr-only">
                </label>
                <button type="button" id="donor-card-download-btn" class="document-action document-action--primary" disabled>
                    <i class="fa-solid fa-download" aria-hidden="true"></i> ${t('certDownload')}
                </button>
            </div>
            <p class="donor-document__status" id="donor-card-photo-hint" role="status">${t('donorCardPhotoRequired')}</p>
        </div>
    `;

    if (containerEl) containerEl.innerHTML = markup;
    const content = containerEl || showModal(t('profileDonorCard'), markup, 'card');
    const photoInput = content.querySelector('#donor-card-photo-input');
    const photoImage = content.querySelector('#donor-card-photo-img');
    const photoHint = content.querySelector('#donor-card-photo-hint');
    const uploadText = content.querySelector('#donor-card-upload-text');
    const download = content.querySelector('#donor-card-download-btn');
    let photo = '';

    function showPhoto(src) {
        photo = src;
        photoImage.src = src;
        photoImage.hidden = false;
        uploadText.textContent = t('donorCardChangePhoto');
        photoHint.textContent = '';
        download.disabled = false;
    }

    if (donorData.profilePhoto) showPhoto(donorData.profilePhoto);
    content.querySelector('#donor-card-photo-area').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', () => {
        const file = photoInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => showPhoto(reader.result);
        reader.readAsDataURL(file);
        photoInput.value = '';
    });
    download.addEventListener('click', async () => {
        download.disabled = true;
        try {
            const canvas = await renderDonorCardCanvas(card, photo);
            const link = document.createElement('a');
            link.download = `Donor_Card_${card.name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error downloading donor card:', error);
            photoHint.textContent = t('donorCardDownloadError');
        } finally {
            download.disabled = false;
        }
    });
}

async function renderDonorCardCanvas(card, photo) {
    const [logo, image] = await Promise.all([loadArtwork(logoUrl), loadArtwork(photo)]);
    if (!image) throw new Error('Photo could not be loaded');
    const width = 540;
    const height = 475;
    const scale = 3;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    const band = ctx.createLinearGradient(0, 0, width, 82);
    band.addColorStop(0, '#301b2c');
    band.addColorStop(1, '#7a2948');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, width, 82);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(23, 19, 45, 45, 8);
    ctx.fill();
    if (logo) ctx.drawImage(logo, 27, 23, 37, 37);
    ctx.fillStyle = '#f8d8e6';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillText('BAUET BDC', 82, 35);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('Donor Card', 82, 60);

    const photoSize = 99;
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(23, 104, photoSize, photoSize, 12);
    ctx.clip();
    ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 23, 104, photoSize, photoSize);
    ctx.restore();

    ctx.fillStyle = '#31202c';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText(card.name, 141, 129, 376);
    ctx.fillStyle = '#6d5866';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText(card.email, 141, 154, 376);
    if (card.description) ctx.fillText(card.description, 141, 176, 376);
    ctx.fillStyle = '#fae8f1';
    ctx.beginPath();
    ctx.roundRect(141, 184, 67, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#78223f';
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.fillText(card.blood, 153, 205, 42);

    const labels = ['Location', 'Phone', 'Last donation', 'Next eligible', 'Member since'];
    card.details.forEach(([, value], index) => {
        const left = 23 + (index % 2) * 253;
        const top = 231 + Math.floor(index / 2) * 60;
        ctx.fillStyle = '#fdf2f7';
        ctx.beginPath();
        ctx.roundRect(left, top, 241, 51, 7);
        ctx.fill();
        ctx.fillStyle = '#6d5866';
        ctx.font = '13px Arial, sans-serif';
        ctx.fillText(labels[index], left + 11, top + 18);
        ctx.fillStyle = '#31202c';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText(String(value), left + 11, top + 39, 219);
    });

    ctx.fillStyle = '#fdf2f7';
    ctx.fillRect(0, 429, width, 46);
    ctx.fillStyle = '#78223f';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(donorCardMotto, width / 2, 457);
    return canvas;
}

function showModal(title, content, variant = '') {
    const modal = document.getElementById('certificate-modal') || createCertificateModal();
    modal.classList.toggle('document-dialog--card', variant === 'card');
    modal.querySelector('#certificate-modal-title').textContent = title;
    const body = modal.querySelector('#certificate-modal-content');
    body.innerHTML = content;
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
    modal.querySelector('[data-document-close]').focus();
    return body;
}

function createCertificateModal() {
    const modal = document.createElement('dialog');
    modal.id = 'certificate-modal';
    modal.className = 'document-dialog';
    modal.setAttribute('aria-labelledby', 'certificate-modal-title');
    modal.innerHTML = `
        <div class="document-dialog__header">
            <h2 id="certificate-modal-title"></h2>
            <button type="button" class="document-dialog__close" data-document-close aria-label="${t('documentClose')}">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
        </div>
        <div id="certificate-modal-content" class="document-dialog__content"></div>
    `;
    modal.querySelector('[data-document-close]').addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => {
        if (event.target !== modal) return;
        const rect = modal.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
    });
    document.body.appendChild(modal);
    return modal;
}

export function initCertificateFeature() {
    if (!document.getElementById('certificate-modal')) createCertificateModal();
}
