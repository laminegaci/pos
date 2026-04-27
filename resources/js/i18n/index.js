import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';

const resources = {
    en: { translation: en },
    fr: { translation: fr },
};

export function initI18n(initialLocale = 'fr') {
    if (i18n.isInitialized) {
        return i18n;
    }

    i18n.use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources,
            fallbackLng: 'fr',
            supportedLngs: ['en', 'fr'],
            defaultNS: 'translation',
            ns: ['translation'],
            debug: false,
            interpolation: {
                escapeValue: false,
            },
            detection: {
                order: ['localStorage', 'navigator'],
                caches: ['localStorage'],
                lookupLocalStorage: 'locale',
                excludeCacheFor: ['cimode'],
            },
            react: {
                useSuspense: false,
            },
        });

    if (initialLocale && !i18n.resolvedLanguage) {
        i18n.changeLanguage(initialLocale);
    }

    return i18n;
}

export function changeLanguage(locale) {
    if (!i18n.resolvedLanguage || i18n.resolvedLanguage !== locale) {
        i18n.changeLanguage(locale);
        localStorage.setItem('locale', locale);
    }
}

export function getCurrentLocale() {
    return i18n.resolvedLanguage || 'fr';
}

export default i18n;