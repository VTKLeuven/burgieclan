
import type { Metadata } from "next";
import { ApiSeed } from "@/components/ApiSeed";
import PageContent from "@/components/page/PageContent";
import { seedApi } from "@/lib/seedApi.server";
import { apiEndpoints } from "@/utils/apiEndpoints";

export const metadata: Metadata = {
    title: 'Page | Burgieclan'
}

/**
 * Displays pages from page management system.
 *
 * Each page is identified with a unique url_key. When visiting /[url_key], the page with that url_key is fetched
 * from the backend if it exists.
 */
type Params = Promise<{ locale: string; url_key: string }>;

export default async function Page({ params }: { params: Params }) {
    const { locale, url_key } = await params;
    const seed = await seedApi([/^[\w-]+$/.test(url_key) && apiEndpoints.page(url_key, locale)]);

    return <ApiSeed seed={seed}><PageContent url_key={url_key} /></ApiSeed>;
}
