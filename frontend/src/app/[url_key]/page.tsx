'use client'

import {ApiClient} from "@/utils/api";
import {useEffect, useState} from "react";

export default function Page({params}: { params: { url_key: string; } }) {
    const {url_key} = params

    const [page, setPage] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await ApiClient('GET', `/api/pages/${url_key}`);
                setPage(result);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchData();
    }, []);

    if (error) {
        return <div>{error}</div>;
    }

    if (!page) {
        return <div>Loading...</div>;
    }

    const content = { __html: page.content };

    return (
        <div>
            <div className="bg-white px-6 py-32 lg:px-8">
                <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
                    <h1>{page.name}</h1>
                    <div dangerouslySetInnerHTML={content}/>
                </div>
            </div>
        </div>
    );
}