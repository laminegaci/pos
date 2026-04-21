import { Head } from '@inertiajs/react';
import PosLayout from '../Layouts/PosLayout';

export default function Stub({ title, user, caisse }) {
    return (
        <>
            <Head title={title} />
            <PosLayout user={user ?? { name: 'Yacine Demo', role: 'Caissier', initials: 'YD' }}>
                <div className="flex flex-1 items-center justify-center px-8">
                    <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-slate-200/60 bg-white/70 px-10 py-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur">
                        <div className="mb-2 h-1 w-10 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                        <p className="text-sm text-slate-500">Cette section sera bientôt disponible.</p>
                    </div>
                </div>
            </PosLayout>
        </>
    );
}
