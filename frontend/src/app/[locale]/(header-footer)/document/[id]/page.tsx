import { ApiSeed } from "@/components/ApiSeed";
import DocumentPreview from "@/components/document/DocumentPreview";
import { curriculumTreeOpen, mergeSeeds, seedApi, treeEndpointsForCoursePaths } from "@/lib/seedApi.server";
import { apiEndpoints, numericId } from "@/utils/apiEndpoints";
import { convertToDocument } from "@/utils/convertToEntity";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Document | Burgieclan",
};

type Params = Promise<{ locale: string; id: string }>;

/**
 * The document first, then what hangs off its course: the trail to it and its neighbours in the
 * folder, which decide the breadcrumb and whether "2 of 11" sits beside the title. Fetched before
 * the page is sent, so neither arrives a moment late and shifts the title.
 */
export default async function DocumentPage({ params }: { params: Params }) {
    const { locale, id } = await params;
    const documentId = numericId(id);

    const [first, treeOpen] = await Promise.all([
        seedApi(documentId ? [
            apiEndpoints.document(documentId, locale),
            apiEndpoints.documentComments(documentId),
        ] : []),
        curriculumTreeOpen(),
    ]);

    const raw = documentId ? first.values[apiEndpoints.document(documentId, locale)] : undefined;
    let courseId: number | undefined;
    let categoryId: number | undefined;
    try {
        const document = raw ? convertToDocument(raw) : undefined;
        courseId = document?.course?.id;
        categoryId = document?.category?.id;
    } catch {
        // An answer that does not read as a document: the page fetches it again and says so.
    }

    const second = await seedApi([
        courseId !== undefined && apiEndpoints.coursePaths(courseId),
        courseId !== undefined && categoryId !== undefined && apiEndpoints.siblingDocuments(courseId, categoryId),
    ]);
    // The folder tree beside the page, opened along the course's branch, when it is showing.
    const tree = await seedApi(treeOpen && courseId !== undefined ? treeEndpointsForCoursePaths(second, courseId) : []);
    const seed = mergeSeeds(first, second, tree);

    return <ApiSeed seed={seed}><DocumentPreview id={id} /></ApiSeed>;
}
