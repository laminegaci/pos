import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLocale } from '../i18n';
import { Globe, ChevronDown } from 'lucide-react';

const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState(getCurrentLocale());
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.right + window.scrollX - 140,
            });
        }
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen(!isOpen);
    };

    const handleLanguageChange = (langCode) => {
        changeLanguage(langCode);
        setCurrentLang(langCode);
        setIsOpen(false);
    };

    const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

    const dropdownContent = isOpen && (
        <div
            ref={dropdownRef}
            className="fixed z-[9999] min-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            style={{ top: position.top, left: position.left }}
        >
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${
                        currentLang === lang.code
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-slate-700'
                    }`}
                >
                    <span className="text-base">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                </button>
            ))}
        </div>
    );

    return (
        <>
            <div className="relative" ref={buttonRef}>
                <button
                    type="button"
                    onClick={toggleDropdown}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                >
                    <Globe size={18} className="text-slate-500" />
                    <span className="hidden sm:inline">{currentLanguage.name}</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
        </>
    );
}