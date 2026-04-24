export default function AuthLayout({ title, children }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">POS</h1>
                    <p className="text-slate-500 mt-2">{title}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}