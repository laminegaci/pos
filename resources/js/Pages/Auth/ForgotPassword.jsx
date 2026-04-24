import { useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function ForgotPassword() {
    const { data, setData, post, processing, errors, flash } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/forgot-password');
    };

    return (
        <AuthLayout title="Réinitialiser mon mot de passe">
            {flash?.status ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-center">
                    {flash.status}
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-6">
                    <p className="text-sm text-slate-600">
                        Mot de passe oublié ? Pas de problème. Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
                    </p>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            placeholder="vous@exemple.com"
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                    </div>

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
                                Envoi en cours...
                            </span>
                        ) : (
                            'Envoyer le lien de réinitialisation'
                        )}
                    </button>

                    <p className="text-center text-sm text-slate-600">
                        <a href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
                            Retour à la connexion
                        </a>
                    </p>
                </form>
            )}
        </AuthLayout>
    );
}

ForgotPassword.layout = (page) => page;