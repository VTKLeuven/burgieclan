'use client';

import API, {ApiClientError} from "@/utils/api";
import {useEffect, useState} from "react";
import Loading from "@/app/loading";
import ErrorPage from "@/components/error/ErrorPage";

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
export default function Page({params}: { params: any }) {
    const {url_key} = params;

    const [page, setPage] = useState<any>(null);
    const [error, setError] = useState<ApiClientError | null>(null);

    useEffect(() => {
        const FetchData = async () => {
            try {
                // const result = await ApiClient('GET', `/api/pages/${url_key}`);
                const result = await new API().page.apiPagesUrlKeyGet({urlKey: url_key});
                setPage(result);
            } catch (err: any) {
                console.log({err});
                setError(err);
            }
        };

        FetchData();
    }, [url_key]);

    if (error) {
        return <ErrorPage status={error.response.status}/>;
    }

    if (!page) {
        return <Loading/>;
    }

    // the page content is expected to be in html
    const content = {__html: page.content};

    return (
        <div className="bg-white px-6 py-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
                <h1>{page.name}</h1>
                <div dangerouslySetInnerHTML={content}/>
            </div>
        </div>
    );
}
