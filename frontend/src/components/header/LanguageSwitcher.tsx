import React, { useState } from "react";
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
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const showDropdown = () => {
        setDropdownOpen(true);
    };

    const hideDropdown = () => {
        setDropdownOpen(false);
    };


    return (
        <div className="relative inline-block text-left" onMouseLeave={hideDropdown}>
            <button
                type="button"
                className="text-sm font-semibold leading-6 text-gray-900 flex"
                onMouseEnter={showDropdown}
            >
                {selectedLanguage === 'nl' ? 'Nederlands' : 'English'}
            </button>

            {dropdownOpen && (
                <div className="origin-top-right absolute right-0 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5" onMouseEnter={showDropdown} onMouseLeave={hideDropdown}>
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <Link href={`/nl${pathnameNoLocale}?${query}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer" onClick={() => { selectedLanguage === 'nl' ? hideDropdown() : null }}>
                            Nederlands
                        </Link>
                        <Link href={`/en${pathnameNoLocale}?${query}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer" onClick={() => { selectedLanguage === 'en' ? hideDropdown() : null }}>
                            English
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;