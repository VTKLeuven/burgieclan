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
        <>
            <div className="min-h-screen px-6 py-10 lg:px-8">
                <div className="flex flex-col items-center justify-center mt-[10vh]">
                    <div className="w-full max-w-sm">
                        <Link href="/">
                            <span className="sr-only">Burgieclan</span>
                            <Logo width={100} height={100} />
                        </Link>
                        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-vtk-blue-500">
                            {t('sign_in')}
                        </h2>
                    </div>

                    {/* Handles OAuth login via Litus */}
                    <LitusOAuthButton loginHandler={handleOAuthLogin} />

                    <div
                        className="mt-4 w-full max-w-sm font-semibold text-center text-sm leading-6 text-vtk-blue-500 hover:text-vtk-blue-400 cursor-pointer flex items-center justify-center"
                        onClick={toggleCollapse}>
                        <p>{t('or_log_in_manually')}</p>
                        <ChevronDown
                            className={`mt-0.5 h-4 w-4 transform transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'
                                }`}
                            aria-hidden="true"
                        />
                    </div>
                </div>
                <div
                    className={`flex flex-col items-center justify-center ${isOpen ? 'h-3/7 pb-2' : 'h-0'} overflow-hidden`}>
                    <form onSubmit={handleCredentialsLogin} className="w-full max-w-sm mt-10">
                        <div>
                            <label htmlFor="username">
                                <p className="mt-2 text-sm font-medium">{t('username')}</p>
                            </label>
                            <div className="mt-2">
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    placeholder=""
                                    autoComplete={t('username')}
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password">
                                <p className="mt-2 text-sm font-medium">{t('password')}</p>
                            </label>
                            <div className="mt-2 relative">
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
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-vtk-blue-500"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                                    ) : (
                                        <Eye className="h-5 w-5" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {credentialsError && (
                            <p className="mt-4 text-sm text-red-600">{credentialsError}</p>
                        )}

                        <div className="mt-5 w-full max-w-sm">
                            <button
                                type="submit"
                                className="primary-button flex w-full items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? <LoaderCircle className="animate-spin" /> : t('login')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}