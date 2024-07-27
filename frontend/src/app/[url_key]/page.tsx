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

    return (
        <div>
            <h1>{page.name}</h1>
            {page.content}
        </div>
    );
}