
import type { Metadata } from "next";
import PageContent from "@/components/page/PageContent";

export const metadata: Metadata = {
    title: 'Page | Burgieclan'
}

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
type Params = Promise<{ url_key: string }>;

export default async function Page({ params }: { params: Params }) {
    const { url_key } = await params;

    return <PageContent url_key={url_key} />;
}
