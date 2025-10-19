'use server'

import { ApiClient } from "@/actions/api";
import { revalidatePath } from "next/cache";

export async function logDocumentView(id: string) {

    const result = await ApiClient('POST', '/api/document_views/batch', {
        "userDocumentViews": [{
            "document": `/api/documents/${id}`,
            "lastViewed": new Date().toISOString()
        }]
    },
        new Headers({
            'accept': 'application/ld+json',
            'Content-Type': 'application/ld+json'
        }));

    // Check if the request was successful
    if (result && !('error' in result)) {
        // Revalidate both the document page and homepage
        revalidatePath('/');
        revalidatePath(`/document/${id}`);
    }
}

export async function getDocument(id: string) {
    return await ApiClient('GET', `/api/documents/${id}`);
}