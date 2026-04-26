import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!message) return;
        setVisible(true);
        const t = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onClose?.(), 200);
        }, duration);
        return () => clearTimeout(t);
    }, [message, duration, onClose]);

    if (!message) return null;

    const isSuccess = type === 'success';
    const Icon = isSuccess ? CheckCircle2 : XCircle;
    const ring = isSuccess ? 'ring-emerald-200/60' : 'ring-red-200/60';
    const iconColor = isSuccess ? 'text-emerald-500' : 'text-red-500';

    return (
        <div
            className={`pointer-events-none fixed top-6 right-6 z-50 transition-all duration-200 ${
                visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
            }`}
        >
            <div
                className={`pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl ring-1 backdrop-blur ${ring}`}
            >
                <Icon size={20} className={iconColor} />
                <span className="text-sm font-medium text-slate-800">{message}</span>
                <button
                    onClick={() => {
                        setVisible(false);
                        setTimeout(() => onClose?.(), 200);
                    }}
                    className="ml-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
