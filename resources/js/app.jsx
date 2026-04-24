import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot, hydrateRoot } from 'react-dom/client';

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
        // ✅ SSR
        if (import.meta.env.SSR) {
            return; // ⚠️ NE RIEN FAIRE ici
        }

        // ✅ CLIENT
        if (el.hasChildNodes()) {
            hydrateRoot(el, <App {...props} />);
        } else {
            createRoot(el).render(<App {...props} />);
        }
    },

    progress: {
        color: '#4B5563',
    },
});