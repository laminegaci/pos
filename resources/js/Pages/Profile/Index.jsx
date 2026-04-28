import { useState } from 'react';
import { useForm, Head } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';

export default function Profile({ user }) {
    const { t } = useTranslation();
    const profileForm = useForm({
        name: user.name,
        email: user.email,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [profileSuccess, setProfileSuccess] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const submitProfile = (e) => {
        e.preventDefault();
        profileForm.patch('/user/profile-information', {
            preserveScroll: true,
            onSuccess: () => {
                setProfileSuccess(true);
                setTimeout(() => setProfileSuccess(false), 3000);
            },
        });
    };

    const submitPassword = (e) => {
        e.preventDefault();
        passwordForm.put('/user/password', {
            preserveScroll: true,
            errorBag: 'updatePassword',
            onSuccess: () => {
                setPasswordSuccess(true);
                passwordForm.reset('current_password', 'password', 'password_confirmation');
                setTimeout(() => setPasswordSuccess(false), 3000);
            },
        });
    };

    const inputClass =
        'w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';

    return (
        <PosLayout>
            <Head title={t('profile.title')} />
            <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <div className="mx-auto w-full max-w-2xl space-y-6">
                    <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t('profile.title')}</h1>

                    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                        <header className="mb-5">
                            <h2 className="text-base font-semibold text-slate-900">{t('profile.info')}</h2>
                            <p className="text-xs text-slate-500">{t('profile.infoDesc')}</p>
                        </header>

                        {profileSuccess && (
                            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                {t('profile.updated')}
                            </div>
                        )}

                        <form onSubmit={submitProfile} className="space-y-5">
                            <div>
                                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                                    {t('profile.fullName')}
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={profileForm.data.name}
                                    onChange={(e) => profileForm.setData('name', e.target.value)}
                                    className={inputClass}
                                />
                                {profileForm.errors.name && (
                                    <p className="mt-1 text-sm text-red-500">{profileForm.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                                    {t('profile.email')}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={profileForm.data.email}
                                    onChange={(e) => profileForm.setData('email', e.target.value)}
                                    className={inputClass}
                                />
                                {profileForm.errors.email && (
                                    <p className="mt-1 text-sm text-red-500">{profileForm.errors.email}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={profileForm.processing}
                                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {profileForm.processing ? t('common.saving') : t('common.save')}
                            </button>
                        </form>
                    </section>

                    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                        <header className="mb-5">
                            <h2 className="text-base font-semibold text-slate-900">{t('profile.password')}</h2>
                            <p className="text-xs text-slate-500">
                                {t('profile.passwordDesc')}
                            </p>
                        </header>

                        {passwordSuccess && (
                            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                {t('profile.passwordUpdated')}
                            </div>
                        )}

                        <form onSubmit={submitPassword} className="space-y-5">
                            <PasswordField
                                id="current_password"
                                label={t('profile.currentPassword')}
                                value={passwordForm.data.current_password}
                                onChange={(v) => passwordForm.setData('current_password', v)}
                                visible={showCurrent}
                                onToggle={() => setShowCurrent((v) => !v)}
                                error={passwordForm.errors.current_password}
                                autoComplete="current-password"
                                showLabel={t('profile.showPassword')}
                                hideLabel={t('profile.hidePassword')}
                            />
                            <PasswordField
                                id="password"
                                label={t('profile.newPassword')}
                                value={passwordForm.data.password}
                                onChange={(v) => passwordForm.setData('password', v)}
                                visible={showNew}
                                onToggle={() => setShowNew((v) => !v)}
                                error={passwordForm.errors.password}
                                autoComplete="new-password"
                                showLabel={t('profile.showPassword')}
                                hideLabel={t('profile.hidePassword')}
                            />
                            <PasswordField
                                id="password_confirmation"
                                label={t('profile.confirmNewPassword')}
                                value={passwordForm.data.password_confirmation}
                                onChange={(v) => passwordForm.setData('password_confirmation', v)}
                                visible={showConfirm}
                                onToggle={() => setShowConfirm((v) => !v)}
                                error={passwordForm.errors.password_confirmation}
                                autoComplete="new-password"
                                showLabel={t('profile.showPassword')}
                                hideLabel={t('profile.hidePassword')}
                            />

                            <button
                                type="submit"
                                disabled={passwordForm.processing}
                                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {passwordForm.processing ? t('profile.updatingPassword') : t('profile.updatePassword')}
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </PosLayout>
    );
}

function PasswordField({ id, label, value, onChange, visible, onToggle, error, autoComplete, showLabel, hideLabel }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={visible ? 'text' : 'password'}
                    required
                    value={value}
                    autoComplete={autoComplete}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={visible ? hideLabel : showLabel}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}
