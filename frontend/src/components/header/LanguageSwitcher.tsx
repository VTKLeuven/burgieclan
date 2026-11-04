import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18nConfig } from "../../../i18nConfig";
import { persistLocale } from '@/actions/locale';

/**
 * Small NL / EN toggle at the right end of the white header: muted text, the
 * active locale in solid ink.
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
            className="flex items-center gap-0.5 font-display text-[13px] text-vtk-muted"
        >
            {i18nConfig.locales.map((locale, index) => (
                <span key={locale} className="flex items-center">
                    {index > 0 && <span className="text-vtk-line-2" aria-hidden="true">/</span>}
                    <button
                        type="button"
                        onClick={() => !isTransitioning && switchLanguage(locale)}
                        aria-pressed={currentLocale === locale}
                        aria-label={locale === 'nl' ? 'Nederlands' : 'English'}
                        disabled={isTransitioning}
                        className={`p-1 uppercase transition-colors rounded-xs focus-visible:ring-2 focus-visible:ring-vtk-navy focus-visible:outline-hidden ${currentLocale === locale
                            ? 'font-semibold text-vtk-ink'
                            : 'hover:text-vtk-ink'
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
