import DocumentPreview from "@/components/document/DocumentPreview";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Document | Burgieclan",
};

export default function DocumentPage({ params }: { params: { id: string } }) {
    const { id } = params;

    return (
        <>
            <DocumentPreview id={id} />
        </>
    );
}