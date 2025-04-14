'use client';

import { ApiClient } from "@/actions/api";
import { useEffect, useState } from "react";
import Loading from "@/app/[locale]/loading";
import ErrorPage from "@/components/error/ErrorPage";
import { ApiError } from "@/utils/error/apiError";
import { useTranslation } from "react-i18next";

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
export default function Page({ params: { url_key } }: { params: { url_key: string } }) {
    const [page, setPage] = useState<any>(null);
    const [error, setError] = useState<ApiError | null>(null);
    const { i18n } = useTranslation();
    const currentLocale = i18n.language;

    useEffect(() => {
        const FetchData = async () => {
            const result = await ApiClient('GET', `/api/pages/${url_key}?lang=${currentLocale}`);
            if (result.error) {
                setError(new ApiError(result.error.message, result.error.status));
            }
            setPage(result);
        };

        FetchData();
    }, [currentLocale, url_key]);

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
                <div dangerouslySetInnerHTML={content} />
            </div>
        </div>
    );
}
