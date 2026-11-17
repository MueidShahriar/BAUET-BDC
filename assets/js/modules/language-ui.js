
import { t as translate, getCurrentLanguage, setLanguage } from './language-config.js?v=3';

export const t = translate;

export function updatePageLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            if (el.hasAttribute('placeholder')) {
                el.placeholder = translate(key);
            }
            else if (el.hasAttribute('title')) {
                el.title = translate(key);
            }
            else if (el.hasAttribute('aria-label')) {
                el.setAttribute('aria-label', translate(key));
            }
            else {
                el.textContent = translate(key);
            }
        }
    });

    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            el.placeholder = translate(key);
        }
    });

    const htmlElements = document.querySelectorAll('[data-i18n-html]');
    htmlElements.forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
            el.innerHTML = translate(key);
        }
    });
}

export function toggleLanguage() {
    const currentLang = getCurrentLanguage();
    const newLang = currentLang === 'en' ? 'bn' : 'en';
    
    setLanguage(newLang);
    
    updatePageLanguage();
    
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLang } }));
}

export function initLanguageSystem() {
    const savedLang = getCurrentLanguage();
    setLanguage(savedLang);
    document.getElementById('language-toggle')?.remove();
    updatePageLanguage();
}

export function translateElement(element, key, updateType = 'text') {
    if (!element || !key) return;
    
    const text = translate(key);
    
    switch (updateType) {
        case 'placeholder':
            element.placeholder = text;
            break;
        case 'title':
            element.title = text;
            break;
        case 'aria-label':
            element.setAttribute('aria-label', text);
            break;
        case 'html':
            element.innerHTML = text;
            break;
        default:
            element.textContent = text;
    }
}

window.updatePageLanguage = updatePageLanguage;
window.toggleLanguage = toggleLanguage;
window.t = translate;
