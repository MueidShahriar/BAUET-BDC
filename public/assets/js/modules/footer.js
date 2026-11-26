const siteUrl = new URL('../../../', import.meta.url);
const homeUrl = new URL('index.html', siteUrl);
const pagesUrl = new URL('pages/', siteUrl);

const FOOTER_HTML = () => {
    const isHomePage = [siteUrl.pathname, homeUrl.pathname].includes(window.location.pathname);
    const homeHref = isHomePage ? '#' : homeUrl.href;
    const contactHref = isHomePage ? '#contact' : `${homeUrl.href}#contact`;
    const feedbackText = `
        <i class="fa-solid fa-comment-dots" aria-hidden="true"></i>
        <span data-i18n="footerFeedback">Share Feedback</span>`;
    const feedback = document.getElementById('feedback-modal')
        ? `<button id="feedback-btn" class="footer-feedback" type="button">${feedbackText}</button>`
        : `<a class="footer-feedback" href="${homeUrl.href}#feedback-btn">${feedbackText}</a>`;
    const year = new Date().getFullYear();

    return `
    <div class="footer-top-rule" aria-hidden="true"></div>
    <div class="footer-glow" aria-hidden="true"></div>
    <div class="footer-inner">
        <div class="footer-grid">
            <div class="footer-brand">
                <div class="footer-brand-title">
                    <img src="${new URL('image/blood-drop.png', siteUrl).href}" width="40" height="40" alt="" loading="lazy" decoding="async" />
                    <span data-i18n="siteTitle">BAUET BDC</span>
                </div>
                <p data-i18n="footerBrandDesc">A passionate, volunteer-driven organization dedicated to saving lives through the power of blood
                    donation. We connect donors with patients in urgent need.</p>
                <div class="footer-socials">
                    <a href="https://www.facebook.com/share/1CLTZN8DmU/?mibextid=wwXIfr" class="social-facebook" aria-label="Facebook"
                        target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <a href="https://www.linkedin.com/company/bauet-blood-donation-club/" class="social-linkedin" aria-label="LinkedIn"
                        target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-linkedin-in"></i>
                    </a>
                    <a href="https://wa.me/8801712460423" class="social-whatsapp" aria-label="WhatsApp"
                        target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                </div>
            </div>
            <div>
                <h4 class="footer-col-title" data-i18n="footerQuickLinks">QUICK LINKS</h4>
                <ul class="footer-links">
                    <li><a href="${pagesUrl}about.html"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i> <span
                                data-i18n="navAbout">About</span></a></li>
                    <li><a href="${pagesUrl}donationGuide.html"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i> <span
                                data-i18n="navHow">Donation Guide</span></a></li>
                    <li><a href="${pagesUrl}events.html"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i> <span
                                data-i18n="navEvents">Events</span></a></li>
                    <li><a href="${pagesUrl}join.html"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i> <span
                                data-i18n="navJoin">Join</span></a></li>
                    <li><a href="${pagesUrl}search.html"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i> <span
                                data-i18n="navSearch">Search</span></a></li>
                    <li><a href="${pagesUrl}request-blood.html"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i> <span>Request Blood</span></a></li>
                </ul>
            </div>
            <div>
                <h4 class="footer-col-title" data-i18n="footerContactInfo">Contact Info</h4>
                <ul class="footer-links">
                    <li><a href="mailto:bauet.bdc@gmail.com"><i class="fa-solid fa-envelope" aria-hidden="true"></i>
                            <span data-i18n="contactEmail">bauet.bdc@gmail.com</span></a></li>
                    <li><a href="tel:+8801712460423"><i class="fa-solid fa-phone" aria-hidden="true"></i>
                            <span data-i18n="contactPhone">01712460423</span></a></li>
                    <li><a href="${contactHref}"><i class="fa-solid fa-message" aria-hidden="true"></i> <span
                                data-i18n="navContact">Contact</span></a></li>
                </ul>
            </div>
        </div>
        <div class="footer-feedback-wrap">${feedback}</div>
        <hr class="footer-divider" />
        <div class="footer-bottom">
            <p class="footer-copy">
                &copy; ${year} <a href="${homeHref}">BAUET BDC</a> All rights reserved.
            </p>
            <p class="footer-copy">
                <span data-i18n="footerDeveloper">Developed by Md. Mueid Shahriar</span>, CSE-16th, BAUET
            </p>
            <div class="footer-developer-socials" aria-label="Developer social links">
                <a href="https://www.linkedin.com/in/mueid16/" class="social-linkedin" aria-label="Md. Mueid Shahriar on LinkedIn"
                    target="_blank" rel="noopener noreferrer">
                    <i class="fab fa-linkedin-in"></i>
                </a>
                <a href="https://wa.me/8801712460423" class="social-whatsapp" aria-label="Contact Md. Mueid Shahriar on WhatsApp"
                    target="_blank" rel="noopener noreferrer">
                    <i class="fab fa-whatsapp"></i>
                </a>
            </div>
        </div>
    </div>`;
};

export function initFooter() {
    const footerEl = document.getElementById('app-footer');
    if (!footerEl || footerEl.querySelector('.footer-inner')) return;
    footerEl.innerHTML = FOOTER_HTML();
    window.updatePageLanguage?.();
}

initFooter();
