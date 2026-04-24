import { useForm } from '@inertiajs/react';
import AuthLayout from '../../Layouts/AuthLayout';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();
        post('/email/verification-notification');
    };

    return (
        <AuthLayout title="Vérifier mon email">
            {status === 'verification-link-sent' ? (
                <div className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 mb-6">
                        Un nouveau lien de vérification a été envoyé à votre adresse email.
                    </div>
                </div>
            ) : status === 'already-verified' ? (
                <div className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 mb-6">
                        Votre email est déjà vérifié.
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-slate-600">
                        Merci de vous être inscrit ! Avant de continuer, pourriez-vous vérifier votre adresse email en cliquant sur le lien que nous venons de vous envoyer ?
                    </p>

                    <p className="text-sm text-slate-600">
                        Si vous n'avez pas reçu l'email, nous vous en enverrons un autre avec plaisir.
                    </p>

                    <form onSubmit={submit}>
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
                                'Renvoyer l\'email de vérification'
                            )}
                        </button>
                    </form>
                </div>
            )}
        </AuthLayout>
    );
}

VerifyEmail.layout = (page) => page;