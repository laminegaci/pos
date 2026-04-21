import './bootstrap';
import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

createInertiaApp({
    title: (title) => (title ? `${title} - ${import.meta.env.VITE_APP_NAME ?? 'Laravel'}` : (import.meta.env.VITE_APP_NAME ?? 'Laravel')),
    resolve: { pages: './Pages' },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
