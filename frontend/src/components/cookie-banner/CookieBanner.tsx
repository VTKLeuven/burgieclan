"use client"

import { STORAGE_KEYS } from "@/utils/cookieNames";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function cookieConsentGiven() {
    return localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT) ?? 'undecided';
}

const CookieBanner = () => {
    const [consentGiven, setConsentGiven] = useState('');

    const { t } = useTranslation();

    useEffect(() => {
        // We want this to only run once the client loads
        // or else it causes a hydration error
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConsentGiven(cookieConsentGiven());
    }, []);

    const handleAcceptCookies = () => {
        localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'true');
        setConsentGiven('true');
    };

    return (
        consentGiven !== 'undecided' ? <></> :
            // A small white card bottom-right, like a Dopl toast that waits for an answer.
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-end px-4">
                <div className="pointer-events-auto flex w-full max-w-[440px] items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-popover">
                    <p className="m-0 flex-1 text-small text-fg-secondary">
                        {t('cookie_banner_text')}
                    </p>
                    <div className="shrink-0">
                        <button
                            type="button"
                            onClick={handleAcceptCookies}
                            className="vtk-button vtk-button-primary vtk-button-sm">
                            {t('cookie_banner_accept')}
                        </button>
                    </div>
                </div>
            </div>
    )
}

export default CookieBanner;