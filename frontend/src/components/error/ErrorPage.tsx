import { useRouter } from "next/navigation";
import { STATUS_CODES } from 'http';
import {getHttpStatusDescription} from "@/utils/httpStatusDescriptions";

export default function ErrorPage(status: string, detail?: string) {
    const router = useRouter();

    const statusDescription = STATUS_CODES[status] || 'Unexpected error';  // short standard description
    const customDescription = detail || getHttpStatusDescription(Number(status));  // longer custom description

    const redirectHome = () => {
        router.push('/');
    };

    return (
        <>
            <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
                <div className="text-center">
                    <p className="text-base font-semibold text-amber-700">{status}</p>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">{statusDescription}</h1>
                    <p className="mt-6 text-base leading-7 text-gray-600">{customDescription}</p>

                    <div className="mt-10 flex items-center justify-center space-x-6">
                        <button
                            type="button"
                            onClick={redirectHome}
                            className="primary-button flex-1">
                            Go back home
                        </button>
                        <button
                            type="button"
                            onClick={redirectHome}
                            className="white-button flex-1 min-w-max">
                            Contact support <span aria-hidden="true">&rarr;</span>
                        </button>
                    </div>
                </div>
            </main>
        </>

    )
}