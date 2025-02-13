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

        const newPathname = `/${newLocale}${pathnameNoLocale}`;
        const newUrl = `${newPathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

        await i18n.changeLanguage(newLocale);
        window.history.replaceState(null, '', newUrl);

        setTimeout(() => {
            setIsTransitioning(false);
        }, 300);
    };

    return (
        <div className="relative flex items-center bg-gray-100 rounded-full p-0.5 h-6">
            {/* Background slider */}
            <div
                className={`absolute h-5 w-9 bg-amber-600 rounded-full transition-all duration-300 ease-in-out ${
                    currentLocale === 'nl' ? 'left-0.5' : 'left-[48%]'
                }`}
            />

            {/* Buttons */}
            <button
                onClick={() => !isTransitioning && switchLanguage('nl')}
                className={`relative z-10 flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${
                    currentLocale === 'nl'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={isTransitioning}
            >
                <span className="px-2 text-sm font-medium">NL</span>
            </button>
            <button
                onClick={() => !isTransitioning && switchLanguage('en')}
                className={`relative z-10 flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${
                    currentLocale === 'en'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={isTransitioning}
            >
                <span className="px-2 text-sm font-medium">EN</span>
            </button>
        </div>
    );
};

export default LanguageSwitcher;