'use client';

import { useEffect, useState } from "react";
import Loading from "@/app/[locale]/loading";
import ErrorPage from "@/components/error/ErrorPage";
import { useApi } from "@/hooks/useApi";
import { type Page } from "@/types/entities";
import { convertToPage } from "@/utils/convertToEntity";
import { useTranslation } from "react-i18next";

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
export default function Page({ params: { url_key } }: { params: { url_key: string } }) {
    const { request, loading, error } = useApi();
    const [page, setPage] = useState<Page | null>(null);
    const { i18n } = useTranslation();
    const currentLocale = i18n.language;

    useEffect(() => {
        const fetchPage = async () => {
            const response = await request('GET', `/api/pages/${url_key}?lang=${currentLocale}`);

            if (!response) {
                return null;
            }

            setPage(convertToPage(response));
        };

        fetchPage();
    }, [currentLocale, url_key, request]);

    // Show loading state
    if (loading || !page && !error) {
        return <Loading />;
    }

    // Show error state
    if (error && error.status != 404) {
        return <ErrorPage status={error.status} detail={error.message} />;
    }

    // Show not found state
    if (!page) {
        return <ErrorPage status={404} detail={`Page with URL '${url_key}' not found`} />;
    }

    // The page content is expected to be in HTML
    const content = { __html: page.content || "" };

    return (
        <div className="bg-white px-6 py-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
                <h1>{page.name}</h1>
                <div dangerouslySetInnerHTML={content} />
            </div>
        </div>
    );
}
