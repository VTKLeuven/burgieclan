'use server'

import { ApiClient } from "@/actions/api";
import { revalidatePath } from "next/cache";

export async function logDocumentView(id: string) {
    try {
        await ApiClient('POST', '/api/document_views/batch', {
                "userDocumentViews": [{
                    "document": `/api/documents/${id}`,
                    "lastViewed": new Date().toISOString()
                }]
            },
            new Headers({
                'accept': 'application/ld+json',
                'Content-Type': 'application/ld+json'
            }));

        // Revalidate both the document page and homepage
        revalidatePath('/');
        revalidatePath(`/document/${id}`);
    } catch (error) {
        console.error('Failed to log document view:', error);
    }
}

export async function getDocument(id: string) {
    return await ApiClient('GET', `/api/documents/${id}`);
}