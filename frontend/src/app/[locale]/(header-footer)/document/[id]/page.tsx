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

    return (
        <>
            <DocumentPreview id={id}/>
        </>
    );
}
