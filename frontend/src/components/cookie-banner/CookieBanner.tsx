"use client"
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function cookieConsentGiven() {
    return localStorage.getItem('cookie_consent') ?? 'undecided';
}

const CookieBanner = () => {
    const [consentGiven, setConsentGiven] = useState('');

    const { t } = useTranslation();

    useEffect(() => {
        // We want this to only run once the client loads
        // or else it causes a hydration error
        setConsentGiven(cookieConsentGiven());
    }, []);

    const handleAcceptCookies = () => {
        localStorage.setItem('cookie_consent', 'true');
        setConsentGiven('true');
    };

    return (
        consentGiven !== 'undecided' ? <></> :
            <div className="pointer-events-none fixed inset-x-0 bottom-0 px-6 pb-6">
                <div
                    className="pointer-events-auto ml-auto max-w-xl rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-900/10">
                    <p className="text-sm leading-6 text-gray-900">
                        {t('cookie_banner_text')}
                    </p>
                    <div className="mt-4 flex items-center gap-x-5">
                        <button
                            type="button"
                            onClick={handleAcceptCookies}
                            className="primary-button w-full">
                            {t('cookie_banner_accept')}
                        </button>
                    </div>
                </div>
            </div>
    )
}

export default CookieBanner;