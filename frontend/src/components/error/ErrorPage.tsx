import { useRouter } from "next/navigation";
import { STATUS_CODES } from 'http';
import {getHttpStatusDescription} from "@/utils/httpStatusDescriptions";

/**
 * Displays an error page with a status code, brief standard description and a longer custom description (which is
 * either given by `detail`, retrieved from the httpStatusDescriptions.ts file or left empty).
 */
export default function ErrorPage({ status, detail }: { status?: string; detail?: string }) {
    const router = useRouter();

    const statusDescription = status ? STATUS_CODES[status] || 'Unexpected error' : 'Unexpected error';  // short standard description
    const customDescription = detail || getHttpStatusDescription(Number(status)) || "";  // longer custom description

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
                            className="primary-button flex-1">
                            Go back home
                        </button>
                        <button
                            type="button"
                            onClick={redirectSupport}
                            className="white-button flex-1 min-w-max">
                            Contact support <span aria-hidden="true">&rarr;</span>
                        </button>
                    </div>
                </div>
            </main>
        </>
    )
}