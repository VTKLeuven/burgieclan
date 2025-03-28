"use client"

import { STATUS_CODES } from 'http';
import { getHttpStatusDescription } from "@/utils/error/httpStatusDescriptions";
import { useTranslation } from "react-i18next";
import type { ErrorResponse } from "@/types/error";
import StackTraceViewer from "@/components/error/StackTraceViewer";

/**
 * Displays an error page with a status code, brief standard description and a longer custom description (which is
 * either given by `detail`, retrieved from the httpStatusDescriptions.ts file or left empty).
 * In development mode, shows detailed error information.
 * In production mode, shows a general error message to avoid exposing sensitive details.
 */
export default function ErrorPage({ error }: { error: ErrorResponse }) {
    // const router = useRouter();
    const { t } = useTranslation();
    const isDevelopment = process.env.NODE_ENV === 'development';

    const statusDescription = STATUS_CODES[error.status] || t('unexpected_error')  // short standard description
    // const customDescription = detail || getHttpStatusDescription(status) || "";  // longer custom description

    return (
        <>
            <main className="grid min-h-full place-items-center bg-white px-6 py-6 lg:px-8">
                <div className="text-center">
                    {isDevelopment ? (
                        // Show detailed error information in development
                        <>
                            <p className="text-base font-semibold text-amber-700">{error.status}</p>
                            <h1 className="mt-4">{statusDescription}</h1>
                            {/* <p className="mt-6 text-gray-600">{customDescription}</p> */}
                            <p className="mt-6 text-gray-600">{error.detailedMessage}</p>
                            <StackTraceViewer stackTrace={error.stackTrace} />
                        </>
                    ) : (
                        // Show general error message in production
                        <>
                            <p className="text-base font-semibold text-amber-700">{error.status}</p>
                            <h1 className="mt-4">{statusDescription}</h1>
                            <p className="mt-6 text-gray-600">{error.generalMessage}</p>
                        </>
                    )}
                    <div className="mt-10 flex items-center justify-center space-x-6">
                        <a
                            href="/"
                            className="primary-button flex-1 inline-block text-center">
                            {t('go_home')}
                        </a>
                        <a
                            href="/support"
                            className="white-button flex-1 min-w-max inline-block text-center">
                            {t('contact_support')} <span aria-hidden="true">&rarr;</span>
                        </a>
                    </div>
                </div>
            </main>
        </>
    );
}