import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { i18nConfig } from "../../../i18nConfig";

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentLocale = i18n.language;
    const [isTransitioning, setIsTransitioning] = useState(false);

    const locales = i18nConfig.locales.join('|');
    const regex = new RegExp(`^/(${locales})(/|$)`);
    const pathnameNoLocale = pathname.replace(regex, '/');

    const switchLanguage = async (newLocale: string) => {
        if (newLocale === currentLocale) return;

        setIsTransitioning(true);

        // Always include the locale prefix, even for Dutch
        const newPathname = `/${newLocale}${pathnameNoLocale}`;
        const newUrl = `${newPathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

        await i18n.changeLanguage(newLocale);
        window.history.replaceState(null, '', newUrl);

        // Reset transition state after a short delay
        setTimeout(() => {
            setIsTransitioning(false);
        }, 300);
    };

    return (
        <div className="relative flex items-center bg-gray-100 rounded-full p-0.5 w-20 h-6">
            {/* Background slider */}
            <div
                className={`absolute h-5 w-10 bg-orange-500 rounded-full transition-all duration-300 ease-in-out ${
                    currentLocale === 'nl' ? 'left-0' : 'left-10'
                }`}
            />

            {/* Buttons */}
            <button
                onClick={() => !isTransitioning && switchLanguage('nl')}
                className={`relative flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${
                    currentLocale === 'nl'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900'
                } ${isTransitioning ? 'cursor-wait' : 'cursor-pointer'}`}
                disabled={isTransitioning}
            >
                <span className={`px-2 text-sm transition-transform duration-300 ${
                    isTransitioning ? 'transform scale-95' : ''
                }`}>
                    NL
                </span>
            </button>
            <button
                onClick={() => !isTransitioning && switchLanguage('en')}
                className={`relative flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${
                    currentLocale === 'en'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900'
                } ${isTransitioning ? 'cursor-wait' : 'cursor-pointer'}`}
                disabled={isTransitioning}
            >
                <span className={`px-2 text-sm transition-transform duration-300 ${
                    isTransitioning ? 'transform scale-95' : ''
                }`}>
                    EN
                </span>
            </button>
        </div>
    );
};

export default LanguageSwitcher;