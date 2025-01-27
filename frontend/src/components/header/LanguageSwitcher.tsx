import React from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { i18nConfig } from "../../../i18nConfig";

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const selectedLanguage = i18n.language;
    const pathname = usePathname();
    const query = useSearchParams();
    const locales = i18nConfig.locales.join('|');
    const regex = new RegExp(`^/(${locales})(/|$)`);
    const pathnameNoLocale = pathname.replace(regex, '/');

    return (
        <div className="flex items-center bg-gray-100 rounded-full p-0.5 w-24 h-6 text-sm mr-3">
            <Link
                href={`/nl${pathnameNoLocale}?${query}`}
                className={`flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${
                    selectedLanguage === 'nl'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <span className="px-2">NL</span>
            </Link>
            <Link
                href={`/en${pathnameNoLocale}?${query}`}
                className={`flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${
                    selectedLanguage === 'en'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <span className="px-2">EN</span>
            </Link>
        </div>
    );
};

export default LanguageSwitcher;