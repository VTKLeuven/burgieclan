'use client';

import { ApiClient } from "@/utils/api";
import { useEffect, useState } from "react";
import { ApiClientError } from "@/utils/api";
import ErrorPage from "@/components/error/ErrorPage";
import LoadingPage from "@/components/loading/LoadingPage";

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
export default function Page({ params }: { params: any }) {
    const { url_key } = params;

    const [page, setPage] = useState<any>(null);
    const [error, setError] = useState<ApiClientError | null>(null);

    useEffect(() => {
        const FetchData = async () => {
            try {
                const result = await ApiClient('GET', `/api/pages/${url_key}`);
                setPage(result);
            } catch (err: any) {
                setError(err);
            }
        };

        FetchData();
    }, [url_key]);

    if (error) {
        return <ErrorPage status={error.status} />;
    }

    if (!page) {
        return <LoadingPage />;
    }

    // the page content is expected to be in html
    const content = { __html: page.content };

    return (
        <div>
            <div className="bg-white px-6 py-32 lg:px-8">
                <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
                    <h1>{page.name}</h1>
                    <div dangerouslySetInnerHTML={content} />
                </div>
            </div>
        </div>
    );
}
