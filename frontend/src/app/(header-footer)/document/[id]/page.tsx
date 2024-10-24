'use client'

import {useEffect, useState} from "react";
import ErrorPage from "@/components/error/ErrorPage";
import Loading from "@/app/loading";
import {ApiError} from "@/utils/error/apiError";
import {ApiClient} from "@/actions/api";

export default function DocumentPage({ params }: { params: any }) {
    const { id } = params;

    const [document, setDocument] = useState<any>(null);
    const [error, setError] = useState<ApiError | null>(null);

    useEffect(() => {
        const FetchData = async () => {
            try {
                const result = await ApiClient('GET', `/api/documents/${id}`);
                console.log(result);
                setDocument(result);
            } catch (err: any) {
                setError(err);
            }
        };

        FetchData();
    }, [id]);

    if (error) {
        return <ErrorPage status={error.status} />;
    }

    if (!document) {
        return <Loading />;
    }

    return (
        <div className="bg-white px-6 py-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">

            </div>
        </div>
    );
}
