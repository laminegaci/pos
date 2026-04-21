import { Head } from '@inertiajs/react';

export default function Welcome({ appName }) {
    return (
        <>
            <Head title="Welcome" />
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-3xl font-semibold text-gray-900">{appName}</h1>
                    <p className="mt-2 text-gray-600">Inertia + React is wired up.</p>
                </div>
            </main>
        </>
    );
}
