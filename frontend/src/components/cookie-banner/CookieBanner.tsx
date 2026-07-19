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
            // Navy glass panel pinned bottom-right, matching `.vtk-cookie-consent`.
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-1000 flex justify-end px-4 sm:bottom-8 sm:px-8">
                <div className="pointer-events-auto w-full max-w-[560px] rounded-[18px] border border-white/15 bg-vtk-navy p-5.5 text-vtk-paper shadow-[0_24px_70px_rgba(10,15,31,0.3)]">
                    <p className="m-0 text-sm leading-relaxed text-vtk-on-dark-muted">
                        {t('cookie_banner_text')}
                    </p>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={handleAcceptCookies}
                            className="vtk-button vtk-button-accent vtk-button-sm">
                            {t('cookie_banner_accept')}
                        </button>
                    </div>
                </div>
            </div>
    )
}

export default CookieBanner;