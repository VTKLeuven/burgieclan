import { useRouter } from "next/navigation";
import { STATUS_CODES } from 'http';
import { getHttpStatusDescription } from "@/utils/error/httpStatusDescriptions";
import { useTranslation } from "react-i18next";

/**
 * Displays an error page with a status code, brief standard description and a longer custom description (which is
 * either given by `detail`, retrieved from the httpStatusDescriptions.ts file or left empty).
 */
export default function ErrorPage({ status, detail }: { status?: number; detail?: string }) {
    const router = useRouter();
    const { t } = useTranslation();

    if (!status) {
        status = 500;
    }

    const statusDescription = STATUS_CODES[status] || t('unexpected_error')  // short standard description
    const customDescription = detail || getHttpStatusDescription(status) || "";  // longer custom description

    const redirectHome = () => {
        router.push('/');
    };

    const redirectSupport = () => {
        router.push('/support');
    };

    return (
        <>
            <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
                <div className="text-center">
                    <p className="text-base font-semibold text-amber-700">{status}</p>
                    <h1 className="mt-4">{statusDescription}</h1>
                    <p className="mt-6 text-gray-600">{customDescription}</p>
                    <div className="mt-10 flex items-center justify-center space-x-6">
                        <button
                            type="button"
                            onClick={redirectHome}
                            className="primary-button w-full flex-1">
                            {t('go_home')}
                        </button>
                        <button
                            type="button"
                            onClick={redirectSupport}
                            className="white-button w-full flex-1 min-w-max">
                            {t('contact_support')} <span aria-hidden="true">&rarr;</span>
                        </button>
                    </div>
                </div>
            </main>
        </>
    )
}