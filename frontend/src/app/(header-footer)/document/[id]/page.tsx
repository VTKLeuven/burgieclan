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
        <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:px-6">
                <h1 className="text-xl">pdfname.pdf</h1>
                {/* Content goes here */}
                {/* We use less vertical padding on card headers on desktop than on body sections */}
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:p-6">
                {/* Content goes here */}
            </div>
        </div>
    );
}
