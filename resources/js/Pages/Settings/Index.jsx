import { Head, useForm, usePage  } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Bell,
    Building2,
    CreditCard,
    Database,
    Globe,
    Lock,
    Menu,
    Palette,
    Printer,
    Receipt,
    Save,
    Shield,
    Store,
    User,
    Users,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PosLayout from '../../Layouts/PosLayout';

function Field({ label, hint, children }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
            {children}
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

function Input(props) {
    return (
        <input
            {...props}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        />
    );
}

function Select({ children, ...props }) {
    return (
        <select
            {...props}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        >
            {children}
        </select>
    );
}

function Toggle({ checked, onChange, label, hint }) {
    return (
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800">{label}</div>
                {hint && <div className="text-xs text-slate-400">{hint}</div>}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative ml-4 inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                    checked ? 'bg-gradient-to-br from-indigo-600 to-violet-600' : 'bg-slate-200'
                }`}
            >
                <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </label>
    );
}

function SectionCard({ title, description, children }) {
    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mb-5 border-b border-slate-100 pb-4">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            {children}
        </div>
    );
}

export default function SettingsIndex({ users = [], settings: initialSettings }) {
    const { t } = useTranslation();
    const { props } = usePage();
    const [activeTab, setActiveTab] = useState('general');
    const [saved, setSaved] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settings, setSettings] = useState(initialSettings || {
        shopName: 'POS',
        shopCode: 'POS-01',
        currency: 'DZD',
        language: 'fr',
        timezone: 'Africa/Algiers',
        company: 'Mon Entreprise',
        rc: '',
        nif: '',
        address: '',
        phone: '',
        email: 'contact@pos.local',
        vatRate: 19,
        receiptFooter: 'Merci pour votre achat !',
        showLogo: true,
        printAuto: true,
        cashEnabled: true,
        cardEnabled: true,
        creditEnabled: false,
        printerName: 'Epson TM-T20III',
        paperSize: '80mm',
        theme: 'light',
        accentColor: 'indigo',
        notifLowStock: true,
        notifDailyReport: true,
        notifNewSale: false,
        twoFactor: false,
        sessionTimeout: 30,
        autoBackup: true,
        backupFrequency: 'daily',
    });

    const TABS = useMemo(() => [
        { id: 'general', label: t('settings.tabs.general'), icon: Store },
        { id: 'company', label: t('settings.tabs.company'), icon: Building2 },
        { id: 'billing', label: t('settings.tabs.billing'), icon: Receipt },
        { id: 'payments', label: t('settings.tabs.payments'), icon: CreditCard },
        { id: 'users', label: t('settings.tabs.users'), icon: Users },
        { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
        { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
        { id: 'security', label: t('settings.tabs.security'), icon: Shield },
        { id: 'backup', label: t('settings.tabs.backup'), icon: Database },
    ], [t]);

    function update(patch) {
        setSettings({ ...settings, ...patch });
        setFormData({ ...formData, ...patch });
    }

    const { data: formData, setData: setFormData, put: saveSettings, processing } = useForm(settings);

    function save(e) {
        e.preventDefault();
        saveSettings('/parametres', {
            preserveScroll: true,
            onSuccess: () => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            },
        });
    }

    return (
        <PosLayout>
            <Head title={t('settings.title')} />
            <div className="flex flex-1 overflow-hidden">
                <div
                    className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden ${
                        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                />

                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/60 bg-white/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:flex-shrink-0 lg:p-4 ${
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="mb-4 flex items-center justify-between px-2 lg:hidden">
                        <h1 className="text-lg font-bold text-slate-900">{t('settings.title')}</h1>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="mb-4 px-2 hidden lg:block">
                        <h1 className="text-lg font-bold text-slate-900">{t('settings.title')}</h1>
                        <p className="text-xs text-slate-500">{t('settings.subtitle')}</p>
                    </div>
                    <nav className="space-y-0.5 overflow-y-auto flex-1">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setSidebarOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                                        active
                                            ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon size={16} className={active ? 'text-white' : 'text-slate-400'} />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <form onSubmit={save} className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-4 py-3 sm:px-6">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 lg:hidden"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="text-sm font-semibold text-slate-700">
                            {TABS.find((tab) => tab.id === activeTab)?.label}
                        </div>
                        <div className="flex items-center gap-3">
                            {saved && (
                                <span className="text-xs font-medium text-emerald-600">✓ {t('settings.saved')}</span>
                            )}
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
                            >
                                <Save size={14} /> <span className="hidden sm:inline">{t('common.save')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.general.shop')} description={t('settings.general.shopDesc')}>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label={t('settings.general.shopName')}>
                                            <Input value={settings.shopName} onChange={(e) => update({ shopName: e.target.value })} />
                                        </Field>
                                        <Field label={t('settings.general.shopCode')}>
                                            <Input value={settings.shopCode} onChange={(e) => update({ shopCode: e.target.value })} />
                                        </Field>
                                        <Field label={t('settings.general.currency')}>
                                            <Select value={settings.currency} onChange={(e) => update({ currency: e.target.value })}>
                                                <option value="DZD">Dinar algérien (DA)</option>
                                                <option value="EUR">Euro (€)</option>
                                                <option value="USD">Dollar US ($)</option>
                                            </Select>
                                        </Field>
                                        <Field label={t('settings.general.language')}>
                                            <Select value={settings.language} onChange={(e) => update({ language: e.target.value })}>
                                                <option value="fr">Français</option>
                                                <option value="ar">العربية</option>
                                                <option value="en">English</option>
                                            </Select>
                                        </Field>
                                        <Field label={t('settings.general.timezone')}>
                                            <Select value={settings.timezone} onChange={(e) => update({ timezone: e.target.value })}>
                                                <option value="Africa/Algiers">Africa/Algiers (GMT+1)</option>
                                                <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                                                <option value="UTC">UTC</option>
                                            </Select>
                                        </Field>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'company' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.company.title')} description={t('settings.company.desc')}>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label={t('settings.company.company')}>
                                            <Input value={settings.company} onChange={(e) => update({ company: e.target.value })} />
                                        </Field>
                                        <Field label={t('settings.company.rc')}>
                                            <Input value={settings.rc} onChange={(e) => update({ rc: e.target.value })} />
                                        </Field>
                                        <Field label={t('settings.company.nif')}>
                                            <Input value={settings.nif} onChange={(e) => update({ nif: e.target.value })} />
                                        </Field>
                                        <Field label={t('settings.company.phone')}>
                                            <Input value={settings.phone} onChange={(e) => update({ phone: e.target.value })} />
                                        </Field>
                                        <Field label={t('settings.company.email')}>
                                            <Input type="email" value={settings.email} onChange={(e) => update({ email: e.target.value })} />
                                        </Field>
                                        <Field label={t('settings.company.address')}>
                                            <Input value={settings.address} onChange={(e) => update({ address: e.target.value })} />
                                        </Field>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.billing.title')} description={t('settings.billing.desc')}>
                                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field label={t('settings.billing.vat')} hint={t('settings.billing.vatHint')}>
                                            <Input
                                                type="number"
                                                value={settings.vatRate}
                                                onChange={(e) => update({ vatRate: Number(e.target.value) })}
                                            />
                                        </Field>
                                    </div>
                                    <Field label={t('settings.billing.footer')}>
                                        <textarea
                                            rows={3}
                                            value={settings.receiptFooter}
                                            onChange={(e) => update({ receiptFooter: e.target.value })}
                                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                        />
                                    </Field>
                                    <div className="mt-4 space-y-2">
                                        <Toggle
                                            checked={settings.showLogo}
                                            onChange={(v) => update({ showLogo: v })}
                                            label={t('settings.billing.showLogo')}
                                            hint={t('settings.billing.showLogoHint')}
                                        />
                                        <Toggle
                                            checked={settings.printAuto}
                                            onChange={(v) => update({ printAuto: v })}
                                            label={t('settings.billing.printAuto')}
                                            hint={t('settings.billing.printAutoHint')}
                                        />
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'payments' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.payments.title')} description={t('settings.payments.desc')}>
                                    <div className="space-y-2">
                                        <Toggle
                                            checked={settings.cashEnabled}
                                            onChange={(v) => update({ cashEnabled: v })}
                                            label={t('settings.payments.cash')}
                                            hint={t('settings.payments.cashHint')}
                                        />
                                        <Toggle
                                            checked={settings.cardEnabled}
                                            onChange={(v) => update({ cardEnabled: v })}
                                            label={t('settings.payments.card')}
                                            hint={t('settings.payments.cardHint')}
                                        />
                                        <Toggle
                                            checked={settings.creditEnabled}
                                            onChange={(v) => update({ creditEnabled: v })}
                                            label={t('settings.payments.credit')}
                                            hint={t('settings.payments.creditHint')}
                                        />
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.users.title')} description={t('settings.users.desc')}>
                                    <div className="space-y-2">
                                        {users.map((u) => (
                                            <div key={u.email} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                                                        {u.name.split(' ').map((w) => w[0]).join('').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800">{u.name}</div>
                                                        <div className="text-xs text-slate-400">{u.email}</div>
                                                    </div>
                                                </div>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                    {u.role}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                                    >
                                        <User size={14} /> {t('settings.users.invite')}
                                    </button>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.notifications.title')} description={t('settings.notifications.desc')}>
                                    <div className="space-y-2">
                                        <Toggle
                                            checked={settings.notifLowStock}
                                            onChange={(v) => update({ notifLowStock: v })}
                                            label={t('settings.notifications.lowStock')}
                                            hint={t('settings.notifications.lowStockHint')}
                                        />
                                        <Toggle
                                            checked={settings.notifDailyReport}
                                            onChange={(v) => update({ notifDailyReport: v })}
                                            label={t('settings.notifications.dailyReport')}
                                            hint={t('settings.notifications.dailyReportHint')}
                                        />
                                        <Toggle
                                            checked={settings.notifNewSale}
                                            onChange={(v) => update({ notifNewSale: v })}
                                            label={t('settings.notifications.newSale')}
                                            hint={t('settings.notifications.newSaleHint')}
                                        />
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.appearance.title')} description={t('settings.appearance.desc')}>
                                    <Field label={t('settings.appearance.theme')}>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            {[
                                                { id: 'light', label: t('settings.appearance.light'), bg: 'bg-white' },
                                                { id: 'dark', label: t('settings.appearance.dark'), bg: 'bg-slate-900' },
                                                { id: 'auto', label: t('settings.appearance.system'), bg: 'bg-gradient-to-br from-white to-slate-900' },
                                            ].map((th) => (
                                                <button
                                                    key={th.id}
                                                    type="button"
                                                    onClick={() => update({ theme: th.id })}
                                                    className={`rounded-xl border p-3 text-left transition ${
                                                        settings.theme === th.id
                                                            ? 'border-indigo-500 ring-4 ring-indigo-100'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className={`mb-2 h-12 rounded-lg border border-slate-200 ${th.bg}`} />
                                                    <div className="text-sm font-medium text-slate-800">{th.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <div className="mt-4">
                                        <Field label={t('settings.appearance.accent')}>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'indigo', cls: 'from-indigo-500 to-violet-500' },
                                                    { id: 'emerald', cls: 'from-emerald-500 to-teal-500' },
                                                    { id: 'rose', cls: 'from-rose-500 to-pink-500' },
                                                    { id: 'amber', cls: 'from-amber-500 to-orange-500' },
                                                    { id: 'sky', cls: 'from-sky-500 to-cyan-500' },
                                                ].map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => update({ accentColor: c.id })}
                                                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.cls} transition ${
                                                            settings.accentColor === c.id
                                                                ? 'ring-4 ring-slate-300 ring-offset-2'
                                                                : 'hover:scale-105'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </Field>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.security.title')} description={t('settings.security.desc')}>
                                    <div className="space-y-2">
                                        <Toggle
                                            checked={settings.twoFactor}
                                            onChange={(v) => update({ twoFactor: v })}
                                            label={t('settings.security.twoFactor')}
                                            hint={t('settings.security.twoFactorHint')}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <Field label={t('settings.security.sessionTimeout')} hint={t('settings.security.sessionTimeoutHint')}>
                                            <Input
                                                type="number"
                                                value={settings.sessionTimeout}
                                                onChange={(e) => update({ sessionTimeout: Number(e.target.value) })}
                                            />
                                        </Field>
                                    </div>
                                    <button
                                        type="button"
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <Lock size={14} /> {t('settings.security.changePassword')}
                                    </button>
                                </SectionCard>
                            </div>
                        )}

                        {activeTab === 'backup' && (
                            <div className="space-y-4">
                                <SectionCard title={t('settings.backup.title')} description={t('settings.backup.desc')}>
                                    <div className="mb-4 space-y-2">
                                        <Toggle
                                            checked={settings.autoBackup}
                                            onChange={(v) => update({ autoBackup: v })}
                                            label={t('settings.backup.auto')}
                                            hint={t('settings.backup.autoHint')}
                                        />
                                    </div>
                                    <Field label={t('settings.backup.frequency')}>
                                        <Select value={settings.backupFrequency} onChange={(e) => update({ backupFrequency: e.target.value })}>
                                            <option value="hourly">{t('settings.backup.hourly')}</option>
                                            <option value="daily">{t('settings.backup.daily')}</option>
                                            <option value="weekly">{t('settings.backup.weekly')}</option>
                                        </Select>
                                    </Field>
                                    <div className="mt-5 flex gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
                                        >
                                            <Database size={14} /> {t('settings.backup.now')}
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <Globe size={14} /> {t('settings.backup.restore')}
                                        </button>
                                    </div>
                                </SectionCard>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </PosLayout>
    );
}
