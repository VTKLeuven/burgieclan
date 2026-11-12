"use client";

import Loading from "@/components/loading/LoadingPage";
import ErrorPage from "@/components/error/ErrorPage";
import PageHeader from '@/components/layout/PageHeader';
import { FileText } from 'lucide-react';
import PageHead from "@/components/ui/PageHead";
import { readPreloadedApi, useApi } from "@/hooks/useApi";
import { type Page } from "@/types/entities";
import { convertToPage } from "@/utils/convertToEntity";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface PageContentProps {
    url_key: string;
}

export default function PageContent({ url_key }: PageContentProps) {
    const { i18n } = useTranslation();
    const currentLocale = i18n.language;
    const endpoint = `/api/pages/${url_key}?lang=${currentLocale}`;
    const [page, setPage] = useState<Page | null>(() => {
        const preloaded = readPreloadedApi(endpoint);
        return preloaded ? convertToPage(preloaded) : null;
    });
    const { request, loading, error } = useApi();

    useEffect(() => {
        if (page) return;

        const fetchPage = async () => {
            const response = await request('GET', endpoint);

            if (!response) {
                return null;
            }

            setPage(convertToPage(response));
        };

        fetchPage();
    }, [endpoint, page, request]);

    useEffect(() => {
        if (page?.name) {
            document.title = `${page.name} | Burgieclan`;
        }
    }, [page?.name]);

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
        <>
            <PageHeader crumbs={[{ label: page.name ?? '', icon: <FileText /> }]} />
            <div className="vtk-shell vtk-shell-narrow">
                <PageHead title={page.name} />
                <div className="vtk-prose mt-6" dangerouslySetInnerHTML={content} />
            </div>
        </>
    );
}
