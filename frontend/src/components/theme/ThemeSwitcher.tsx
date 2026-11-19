'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { THEME_PREFERENCES, type ThemePreference } from '@/components/theme/themePreference';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ICONS: Record<ThemePreference, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/** Light / dark / system as a small segmented control, the same shape as the language switcher beside it. */
export default function ThemeSwitcher() {
    const { t } = useTranslation();
    const { preference, setPreference } = useTheme();

    return (
        <div role="group" aria-label={t('shell.theme')} className="inline-flex h-7 items-center gap-0.5 rounded-[9px] bg-neutral-150 p-0.5">
            {THEME_PREFERENCES.map((option) => {
                const Icon = ICONS[option];
                const label = t(`shell.theme_${option}`);
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setPreference(option)}
                        aria-pressed={preference === option}
                        aria-label={label}
                        title={label}
                        className={`inline-flex h-6 min-w-8 items-center justify-center rounded-[7px] px-1.5 transition-colors ${preference === option
                            ? 'bg-surface text-fg shadow-xs dark:bg-neutral-300'
                            : 'text-fg-muted hover:text-fg'
                            }`}
                    >
                        <Icon className="size-3.5" aria-hidden="true" />
                    </button>
                );
            })}
        </div>
    );
}
