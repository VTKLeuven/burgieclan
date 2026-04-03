import DocumentPreview from "@/components/document/DocumentPreview";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Document | Burgieclan",
};

type Params = Promise<{ id: string }>;

export default async function DocumentPage({ params }: { params: Params }) {
    const { id } = await params;

    return <DocumentPreview id={id} />;
}
