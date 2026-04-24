import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        recovery_code: '',
    });

    const [useRecoveryCode, setUseRecoveryCode] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post('/two-factor-challenge', {
            onFinish: () => reset('code', 'recovery_code'),
        });
    };

    return (
        <AuthLayout title="Authentification à deux facteurs">
            <form onSubmit={submit} className="space-y-6">
                {!useRecoveryCode ? (
                    <div>
                        <p className="text-sm text-slate-600 mb-4">
                            Veuillez entrer le code à 6 chiffres de votre application d'authentification.
                        </p>
                        <input
                            id="code"
                            type="text"
                            name="code"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-center text-2xl tracking-widest"
                            placeholder="000000"
                            maxLength={6}
                            autoComplete="one-time-code"
                        />
                        {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-slate-600 mb-4">
                            Veuillez entrer un code de récupération parmi ceux qui vous ont été fournis lors de la configuration.
                        </p>
                        <input
                            id="recovery_code"
                            type="text"
                            name="recovery_code"
                            value={data.recovery_code}
                            onChange={(e) => setData('recovery_code', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            placeholder="ABCD-1234"
                            autoComplete="one-time-code"
                        />
                        {errors.recovery_code && (
                            <p className="mt-1 text-sm text-red-500">{errors.recovery_code}</p>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Vérification...
                        </span>
                    ) : (
                        'Vérifier'
                    )}
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setUseRecoveryCode(!useRecoveryCode);
                            setData('code', '');
                            setData('recovery_code', '');
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                        {useRecoveryCode ? 'Utiliser un code TOTP' : 'Utiliser un code de récupération'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}

TwoFactorChallenge.layout = (page) => page;