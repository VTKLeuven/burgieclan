'use client';

import { storeTokensInCookies } from '@/actions/auth';
import LoadingPage from '@/components/loading/LoadingPage';
import { useToast } from '@/components/ui/Toast';
import { captureException } from '@sentry/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function AuthCallbackPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showToast } = useToast();
    const { t } = useTranslation();

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token');
            const refreshToken = searchParams.get('refresh_token');
            const refreshTokenExpiration = searchParams.get('refresh_token_expiration');
            const error = searchParams.get('error');
            const redirectTo = searchParams.get('redirect_to') || '/';

            if (error) {
                captureException(
                    new Error(String(error)),
                    { extra: { context: "Login error during OAuth callback" } }
                );
                showToast(t('login_failed') + ': ' + error, 'error');
                router.push('/login');
                return;
            }

            if (token) {
                try {
                    // Parse expiration if provided
                    const expiration = refreshTokenExpiration
                        ? parseInt(refreshTokenExpiration)
                        : undefined;

                    await storeTokensInCookies(token, refreshToken || undefined, expiration);

                    showToast(t('login_success'), 'success');
                    router.push(decodeURIComponent(redirectTo));
                } catch (err) {
                    captureException(
                        err instanceof Error ? err : new Error(String(err)),
                        { extra: { context: "Error storing tokens after OAuth callback" } }
                    );
                    showToast(t('token_store_failed'), 'error');
                    router.push('/login');
                }
            } else {
                captureException(
                    new Error('No token received'),
                    { extra: { context: "No token received in OAuth callback" } }
                );
                showToast(t('no_token_received'), 'error');
                router.push('/login');
            }
        };

        handleCallback();
    }, [searchParams, router, showToast, t]);

    return (
        <LoadingPage />
    );
}