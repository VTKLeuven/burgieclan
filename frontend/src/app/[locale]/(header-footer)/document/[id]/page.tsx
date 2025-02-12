'use client'

import {useEffect, useState} from "react";
import ErrorPage from "@/components/error/ErrorPage";
import {ApiError} from "@/utils/error/apiError";
import {ApiClient} from "@/actions/api";
import DocumentCommentSection from "@/components/document/DocumentCommentSection";
import DocumentPreview from "@/components/document/DocumentPreview";
import LoadingPage from "@/components/loading/LoadingPage";

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
        return <LoadingPage />;
    }

    return (
        <>
            <DocumentPreview />
        </>
    );
}
