'use client'

import { storeTokensInCookies } from "@/actions/auth";
import Logo from "@/components/common/Logo";
import LitusOAuthButton from "@/components/login/LitusOAuthButton";
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

    const redirectTo = searchParams.get('redirectTo') || '/';

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
        // Single white panel on the cool paper ground, mirroring `.vtk-auth`.
        <div className="flex flex-1 items-center justify-center bg-vtk-paper px-5 py-12 sm:px-9 sm:py-20">
            <div className="w-full max-w-[430px] rounded-[18px] border border-vtk-line bg-vtk-surface p-7 shadow-[0_18px_50px_rgba(10,15,31,0.06)] sm:p-10">
                <Link href="/" className="inline-block">
                    <span className="sr-only">Burgieclan</span>
                    <Logo width={56} height={56} />
                </Link>

                <p className="mt-6 text-[13px] text-vtk-muted">Burgieclan</p>
                <h1 className="m-0 mt-2.5 text-[clamp(30px,4vw,42px)] font-semibold leading-none tracking-[-0.03em] text-vtk-ink">
                    {t('sign_in')}
                </h1>

                {/* Handles OAuth login via Litus */}
                <div className="mt-7">
                    <LitusOAuthButton loginHandler={handleOAuthLogin} />
                </div>

                <button
                    type="button"
                    className="mt-3.5 flex w-full items-center justify-center gap-1 text-sm font-medium text-vtk-muted transition-colors hover:text-vtk-ink"
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
                    <form onSubmit={handleCredentialsLogin} className="mt-6 flex flex-col gap-4.5 border-t border-vtk-line pt-6">
                        <div className="vtk-field">
                            <label htmlFor="username" className="vtk-field-label uppercase tracking-[0.08em]">
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
                            <label htmlFor="password" className="vtk-field-label uppercase tracking-[0.08em]">
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
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-vtk-muted transition-colors hover:text-vtk-ink"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                            <p className="vtk-error-text m-0">{credentialsError}</p>
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