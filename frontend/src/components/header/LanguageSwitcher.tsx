import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18nConfig } from "../../../i18nConfig";
import { persistLocale } from '@/actions/locale';

/** NL / EN as a small segmented control, used in the account menu and next to "Inloggen". */
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
            className="inline-flex h-7 items-center gap-0.5 rounded-[9px] bg-neutral-150 p-0.5"
        >
            {i18nConfig.locales.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    onClick={() => !isTransitioning && switchLanguage(locale)}
                    aria-pressed={currentLocale === locale}
                    aria-label={locale === 'nl' ? 'Nederlands' : 'English'}
                    disabled={isTransitioning}
                    className={`inline-flex h-6 min-w-8 items-center justify-center rounded-[7px] px-1.5 text-caption font-medium uppercase transition-colors ${currentLocale === locale
                        ? 'bg-surface text-fg shadow-xs'
                        : 'text-fg-muted hover:text-fg'
                        }`}
                >
                    {locale}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
