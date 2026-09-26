import { captureException } from "@sentry/nextjs";
import { fetchDocumentFileUrl } from '@/hooks/useDocumentFileUrl';
import { useToast } from '@/components/ui/Toast';
import type { Document } from '@/types/entities';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface DownloadOptions {
    documents?: Document[];
    programIds?: number[];
    moduleIds?: number[];
    courseIds?: number[];
}

/**
 * Hand a signed link to the browser's own download handling.
 *
 * The link answers with Content-Disposition: attachment, so following it saves the file
 * under the name the backend chose and leaves the current page where it is. The file
 * streams straight from storage to disk instead of through this page's memory.
 */
const startBrowserDownload = (url: string): void => {
    const link = window.document.createElement('a');
    link.href = url;
    link.rel = 'noopener';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
};

/**
 * A general hook for downloading different types of content (documents, programs, modules, courses)
 * either individually or as a ZIP archive
 */
const useDownloadContent = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const { t } = useTranslation();
    const router = useRouter();

    // Handle download error notifications
    useEffect(() => {
        if (error) {
            captureException(
                new Error(error),
                {
                    extra: { context: "Download error" },
                }
            );
            showToast(t('download.download-error', { error }), 'error');
        }
    }, [error, showToast, t]);

    /**
     * Check if a response indicates JWT expiration and redirect to login if needed
     * @param response The fetch response to check
     * @returns true if the JWT is expired and the user was redirected, false otherwise
     */
    const handleJwtExpiration = async (response: Response): Promise<boolean> => {
        if (response.status === 401) {
            try {
                const errorData = await response.json();
                if (errorData.detail?.includes('Expired JWT') || errorData.title?.includes('Expired JWT')) {
                    // Capture the current URL to redirect back after login
                    const currentPath = window.location.pathname + window.location.search;
                    router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
                    return true;
                }
            } catch {
                // If we can't parse the JSON (e.g., not a JSON response), still handle as 401
                const currentPath = window.location.pathname + window.location.search;
                router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
                return true;
            }
        }
        return false;
    };

    /**
     * Download a single document.
     *
     * Asks the backend for a short-lived link first, which also answers "not found" or "no
     * access" as a normal error for the toast. The browser then downloads from that link by
     * itself, so the file streams straight from storage to disk instead of through memory.
     */
    const downloadSingleDocument = async (document: Document) => {
        try {
            setLoading(true);
            setError(null);

            const result = await fetchDocumentFileUrl(document.id, false);
            if (result === null) {
                return; // The session expired; ApiClient is redirecting to the login page.
            }
            if ('error' in result) {
                throw new Error(result.error.detail ?? result.error.message ?? 'Download failed');
            }

            startBrowserDownload(result.url);

            showToast(t('download.download-success'), 'success');
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unknown download error');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Download content as a ZIP archive
     * @param options Object containing arrays of documents, programs, modules, and courses to download
     */
    const downloadContent = async (options: DownloadOptions) => {
        const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendBaseUrl) {
            setError('Missing environment variable for backend base URL');
            return;
        }

        const totalItems =
            (options.documents?.length || 0) +
            (options.programIds?.length || 0) +
            (options.moduleIds?.length || 0) +
            (options.courseIds?.length || 0);

        if (totalItems === 0) {
            setError('No content selected for download');
            return;
        }

        // A single document goes straight to its file; only several need a ZIP.
        if (totalItems === 1 && options.documents?.length === 1) {
            const document = options.documents[0];

            await downloadSingleDocument(document);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Prepare API payload with resource IDs
            const payload = {
                documents: options.documents?.map(doc => `/api/documents/${doc.id}`) || [],
                programs: options.programIds?.map(id => `/api/programs/${id}`) || [],
                modules: options.moduleIds?.map(id => `/api/modules/${id}`) || [],
                courses: options.courseIds?.map(id => `/api/courses/${id}`) || [],
            };

            // The backend builds (or reuses) the zip and answers with a short-lived link to it.
            const response = await fetch(`${backendBaseUrl}/api/zip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ld+json',
                },
                body: JSON.stringify(payload),
                credentials: 'include', // This ensures cookies (including JWT) are sent with the request
            });

            // Check for JWT expiration
            if (await handleJwtExpiration(response)) {
                return; // Do nothing because handleJwtExpiration already redirected to login
            }

            if (!response.ok) {
                throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
            }

            if (response.status === 204) {
                throw new Error('Nothing to download');
            }

            const { url } = await response.json() as { url?: unknown };
            if (typeof url !== 'string') {
                throw new Error('Unexpected response from the server');
            }

            // Local storage answers with a path on the backend; S3 with an absolute bucket URL.
            startBrowserDownload(new URL(url, backendBaseUrl).toString());

            showToast(t('download.download-success'), 'success');

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unknown download error');
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        downloadSingleDocument,
        downloadContent,
        loading,
        error,
        clearError: () => setError(null)
    };
};

export default useDownloadContent;
