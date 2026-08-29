import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18nConfig } from "../../../i18nConfig";
import { persistLocale } from '@/actions/locale';

/**
 * Subtle NL / EN toggle for the navy header: light text, the active locale in
 * solid white. Mirrors `.vtk-site-header .lang-toggle` in vtk-website-new.
 */
const LanguageSwitcher = () => {
    const { t, i18n } = useTranslation();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentLocale = i18n.language;
    const [isTransitioning, setIsTransitioning] = useState(false);

    const locales = i18nConfig.locales.join('|');
    const regex = new RegExp(`^/(${locales})(/|$)`);
    const pathnameNoLocale = pathname.replace(regex, '/');

    const switchLanguage = async (newLocale: string) => {
        if (newLocale === currentLocale) return;

        setIsTransitioning(true);

        const newPathname = newLocale === i18nConfig.defaultLocale
            ? pathnameNoLocale
            : `/${newLocale}${pathnameNoLocale}`;
        const newUrl = `${newPathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

        await persistLocale(newLocale);
        await i18n.changeLanguage(newLocale);
        router.replace(newUrl);
        router.refresh();

        setTimeout(() => {
            setIsTransitioning(false);
        }, 300);
    };

    return (
        <div
            role="group"
            aria-label={t('language', { defaultValue: 'Language' })}
            className="flex items-center gap-0.5 text-[13px] text-vtk-paper/75"
        >
            {i18nConfig.locales.map((locale, index) => (
                <span key={locale} className="flex items-center">
                    {index > 0 && <span className="text-vtk-paper/40" aria-hidden="true">/</span>}
                    <button
                        type="button"
                        onClick={() => !isTransitioning && switchLanguage(locale)}
                        aria-pressed={currentLocale === locale}
                        aria-label={locale === 'nl' ? 'Nederlands' : 'English'}
                        disabled={isTransitioning}
                        className={`p-1 uppercase transition-colors rounded-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden ${currentLocale === locale
                            ? 'font-semibold text-white'
                            : 'hover:text-white'
                            }`}
                    >
                        {locale}
                    </button>
                </span>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
