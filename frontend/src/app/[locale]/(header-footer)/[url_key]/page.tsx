
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
export default function Page({ params: { url_key } }: { params: { url_key: string } }) {
    return <PageContent url_key={url_key} />;
}
