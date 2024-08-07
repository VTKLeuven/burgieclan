'use client';

import { ApiClient } from "@/utils/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/utils/api";

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
export default function Page({ params }: { params: any }) {
    const router = useRouter();
    const { url_key } = params;

    const [page, setPage] = useState<any>(null);
    const [error, setError] = useState<ApiClientError | null>(null);

    useEffect(() => {
        const FetchData = async () => {
            try {
                const res = await ApiClient('GET', `/api/pages/${url_key}`);

                if (res.error) {
                    setError({ message: res.error.message, status: res.error.code });
                    return;
                }

                setPage(res);
            } catch (err: any) {
                setError({ message: err.message, status: '500' });
            }
        };

        FetchData();
    }, [url_key]);

    // TODO BUR-110: put in generic wrapper that catches errors from lower levels
    useEffect(() => {
        if (error) {
            if (error.status === '401') {
                // the page is not public available
                router.push('/login');
            } else if (error.status === '404') {
                // no page with url_key exists
                router.push('/404');
            }
        }
    }, [error, router]);

    if (error) {
        return (
            <div>
                <h1>Error {error.status}</h1>
                <p>{error.message}</p>
            </div>
        );
    }

    if (!page) {
        // TODO: replace with loading icon
        return <div>Loading...</div>;
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
