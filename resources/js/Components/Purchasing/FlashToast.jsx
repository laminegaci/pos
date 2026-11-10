import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Toast from '../Toast';

/** Shows the `success` flash message (set by the purchasing controllers) as a toast. */
export default function FlashToast() {
    const { flash } = usePage().props;
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (flash?.success) setMessage(flash.success);
    }, [flash?.success]);

    return <Toast message={message} type="success" onClose={() => setMessage(null)} />;
}

export const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export const primaryBtn =
    'inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 disabled:opacity-60';

export const ghostBtn =
    'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60';

export const statusTone = {
    draft: 'bg-amber-50 text-amber-700 ring-amber-200',
    ordered: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    partial: 'bg-sky-50 text-sky-700 ring-sky-200',
    received: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Totals (HT / VAT / TTC) of lines shaped { quantity, unit_cost, vat_rate }. */
export function totalsOf(lines) {
    let ht = 0;
    let vat = 0;
    lines.forEach((l) => {
        const line = round2((Number(l.quantity) || 0) * (Number(l.unit_cost) || 0));
        ht += line;
        vat += round2((line * (Number(l.vat_rate) || 0)) / 100);
    });
    return { ht: round2(ht), vat: round2(vat), ttc: round2(ht + vat) };
}
