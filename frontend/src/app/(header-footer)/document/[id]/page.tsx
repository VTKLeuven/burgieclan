'use client'

import {useEffect, useState} from "react";
import ErrorPage from "@/components/error/ErrorPage";
import Loading from "@/app/loading";
import {ApiClient} from "@/actions/api";
import {ApiError} from "@/utils/error/apiError";

export default function DocumentPage({ params }: { params: any }) {
    const { id } = params;

    const [document, setDocument] = useState<any>(null);
    const [error, setError] = useState<ApiError | null>(null);

    useEffect(() => {
        const FetchData = async () => {
            try {
                const result = await ApiClient('GET', `/api/documents/${id}`, undefined,
                    new Headers({ 'Preload': '/creator', 'Fields': '/creator/username' })
                );
                const creatorUsername = await ApiClient('GET', result.creator, undefined,
                    new Headers({ 'Fields': '/username' })
                );

                console.log(result);
                console.log(creatorUsername);

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
