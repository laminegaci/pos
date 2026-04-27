import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { initI18n } from './i18n';

createInertiaApp({
    title: (title) =>
        title
            ? `${title} - ${import.meta.env.VITE_APP_NAME ?? 'Laravel'}`
            : import.meta.env.VITE_APP_NAME ?? 'Laravel',

    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        return pages[`./Pages/${name}.jsx`];
    },

    setup({ el, App, props }) {
        if (import.meta.env.SSR) {
            const initialLocale = props.initialPage.props?.locale || 'fr';
            initI18n(initialLocale);
            hydrateRoot(el, <App {...props} />);
        } else {
            const storedLocale = localStorage.getItem('locale') || 'fr';
            initI18n(storedLocale);
            createRoot(el).render(<App {...props} />);
        }
    },

    progress: {
        color: '#4B5563',
    },
});