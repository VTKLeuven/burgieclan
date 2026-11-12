'use client'

import { storeTokensInCookies } from "@/actions/auth";
import Logo from "@/components/common/Logo";
import FluxusOAuthButton from "@/components/login/FluxusOAuthButton";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useUser } from "@/components/UserContext";
import { useApi } from "@/hooks/useApi";
import { ChevronDown, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from 'next/link';
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type LoginResponse = {
    token: string;
    refresh_token: string;
    refresh_token_expiration: number;
};

/**
 * Login form component, displays initial login form with VTK login option and expands
 * when user chooses to log in manually.
 *
 * Should be rendered as full page.
 */
export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isOpen, setIsOpen] = useState(false);
    const { showToast } = useToast();
    const { request, loading, error: apiError } = useApi<LoginResponse>();

    const getSafeRedirect = (raw: string | null): string => {
        if (!raw) return '/';
        let path = decodeURIComponent(raw);
        if (path.startsWith('http://') || path.startsWith('https://')) {
            try {
                const url = new URL(path);
                path = url.pathname + url.search + url.hash;
            } catch {
                return '/';
            }
        }
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        const cleanPathname = path.split('?')[0].split('#')[0];
        if (cleanPathname.endsWith('/login') || cleanPathname.includes('/auth/callback')) {
            return '/';
        }
        return path;
    };

    const redirectTo = getSafeRedirect(searchParams.get('redirectTo'));

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [credentialsError, setCredentialsError] = useState('');

    const { t } = useTranslation();

    const toggleCollapse = (): void => {
        setIsOpen(!isOpen);
    };

    const handleOAuthLogin = () => {
        // Redirect to backend OAuth initiation endpoint
        const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendBaseUrl) {
            throw new Error(`Missing environment variable for backend base URL`)
        }

        window.location.href = `${backendBaseUrl}/api/auth/oauth/initiate?redirect_to=${encodeURIComponent(redirectTo)}`;
    };

    const handleCredentialsLogin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setCredentialsError('');

        const response = await request('POST', `/api/auth/login`, {
            username: username,
            password: password,
        });

        if (!response || !response.token || !response.refresh_token || response.refresh_token_expiration === undefined) {
            setCredentialsError(t('unexpected'));
            return;
        }

        const refreshExpiration = Number(response.refresh_token_expiration);
        if (Number.isNaN(refreshExpiration)) {
            setCredentialsError(t('unexpected'));
            return;
        }

        await storeTokensInCookies(
            response.token,
            response.refresh_token,
            refreshExpiration
        );
        showToast(t('login_success'), 'success');
        router.push(redirectTo);
    };

    useEffect(() => {
        if (apiError) {
            if (apiError.status == 401) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setCredentialsError(t('login_invalid_credentials'));
            } else {
                setCredentialsError(t('unexpected'));
            }
        }
    }, [apiError, t]);

    const { user } = useUser();
    if (user) {
        router.push(redirectTo);
    }

    return (
        // Dopl's sign-in: one centred white card on the grey canvas, the mark and name small on top.
        <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-12">
            <div className="w-full max-w-[400px] rounded-panel border border-border bg-surface p-6 shadow-card sm:p-8">
                <Link href="/" className="inline-flex items-center gap-2 rounded-control">
                    <Logo width={32} height={32} />
                    <span className="text-title font-semibold text-fg">Burgieclan</span>
                </Link>

                <h1 className="m-0 mt-6 text-display font-semibold text-fg">
                    {t('sign_in')}
                </h1>

                {/* Handles OAuth login via the VTK authorization server */}
                <div className="mt-6">
                    <FluxusOAuthButton loginHandler={handleOAuthLogin} />
                </div>

                <button
                    type="button"
                    className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-control text-small font-medium text-fg-muted transition-colors hover:text-fg"
                    onClick={toggleCollapse}
                    aria-expanded={isOpen}
                >
                    {t('or_log_in_manually')}
                    <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                        aria-hidden="true"
                    />
                </button>

                {isOpen && (
                    <form onSubmit={handleCredentialsLogin} className="mt-4 flex flex-col gap-4 border-t border-border pt-5">
                        <div className="vtk-field">
                            <label htmlFor="username" className="vtk-field-label">
                                {t('username')}
                            </label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                placeholder=""
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="vtk-field">
                            <label htmlFor="password" className="vtk-field-label">
                                {t('password')}
                            </label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder=""
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center rounded-control pr-3 text-icon transition-colors hover:text-fg"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? t('hide_password', { defaultValue: 'Hide password' }) : t('show_password', { defaultValue: 'Show password' })}
                                    aria-controls="password"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="h-4 w-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {credentialsError && (
                            <p role="alert" aria-live="polite" className="vtk-error-text m-0">{credentialsError}</p>
                        )}

                        <button
                            type="submit"
                            className="vtk-button vtk-button-primary w-full"
                            disabled={loading}
                        >
                            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : t('login')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}