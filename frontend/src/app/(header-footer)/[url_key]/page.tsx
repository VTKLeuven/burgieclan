'use client';

import {ApiClient} from "@/actions/api";
import { useEffect, useState } from "react";
import Loading from "@/app/loading";
import ErrorPage from "@/components/error/ErrorPage";
import {ApiError} from "@/utils/error/apiError";

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
export default function Page({ params }: { params: any }) {
    const { url_key } = params;

    const [page, setPage] = useState<any>(null);
    const [error, setError] = useState<ApiError | null>(null);

    useEffect(() => {
        const FetchData = async () => {
            const result = await ApiClient('GET', `/api/pages/${url_key}`);
            if (result.error) {
                setError(new ApiError(result.error.message, result.error.status));
            }
            setPage(result);
        };

        FetchData();
    }, [url_key]);

    if (error) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    if (!page) {
        return <Loading />;
    }

    // the page content is expected to be in html
    const content = { __html: page.content };

    return (
        <div className="bg-white px-6 py-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
                <h1>{page.name}</h1>
                <div dangerouslySetInnerHTML={content}/>
            </div>
        </div>
    );
}
