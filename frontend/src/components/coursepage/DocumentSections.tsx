'use client'
import Loading, { RowsSkeleton } from '@/components/loading/LoadingPage';
import CodeTabs, { codeTabs, defaultTabId, RelatedTabError, RelatedTabNote, tabIdFor, useCourseById } from '@/components/coursepage/CodeTabs';
import DocumentCategoryRow from "@/components/coursepage/DocumentCategory";
import SectionHeader from '@/components/ui/SectionHeader';
import { HydraCollection, useApi } from "@/hooks/useApi";
import { usePreloadedApi } from '@/components/ApiSeed';
import type { Course, DocumentCategory } from "@/types/entities";
import { convertToDocumentCategory } from "@/utils/convertToEntity";
import { FolderOpen } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiEndpoints } from '@/utils/apiEndpoints';

interface DocumentSectionsProps {
    course: Course;
    documentCounts?: Record<number, number>;
}

export default function DocumentSections({ course, documentCounts }: DocumentSectionsProps) {
    const readPreloadedApi = usePreloadedApi();
    const { t, i18n } = useTranslation();
    const panelId = useId();
    const categoriesEndpoint = apiEndpoints.documentCategories(i18n.language);
    const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>(() => {
        const preloaded = readPreloadedApi(categoriesEndpoint) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member'].map(convertToDocumentCategory) ?? [];
    });
    const [showEmpty, setShowEmpty] = useState(false);
    // Keyed by course and folder, so every tab remembers which of its folders were open.
    const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
    const [selectedTabId, setSelectedTabId] = useState<number | null>(null);

    const { request, loading } = useApi<HydraCollection<unknown>>();

    useEffect(() => {
        if (documentCategories.length > 0) return;

        async function fetchDocumentCategories() {
            const result = await request('GET', categoriesEndpoint);
            if (!result) {
                return null;
            }
            setDocumentCategories(result['hydra:member'].map(convertToDocumentCategory));
        }

        fetchDocumentCategories();
    }, [categoriesEndpoint, documentCategories.length, request]);

    const ownTotal = documentCategories.reduce((sum, category) => sum + (documentCounts?.[category.id] ?? 0), 0);
    const tabs = codeTabs(course, 'documents', ownTotal);
    const tabbed = tabs.length > 1;
    const activeTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs.find((tab) => tab.id === defaultTabId(tabs))!;
    const onRelatedTab = activeTab.id !== course.id;
    const related = useCourseById(onRelatedTab ? activeTab.id : null);

    // The course whose folders are listed, and their counts. Null while a related course loads.
    const listedCourse = onRelatedTab ? related.course : course;
    const counts = onRelatedTab ? related.course?.documentCounts : documentCounts;

    const countFor = (category: DocumentCategory) => counts?.[category.id] ?? 0;
    // Without tabs, an opened folder also lists the files of identical and older courses under
    // this course's own, so a folder counts as empty only when both are zero: after a reform the
    // new course often has nothing yet while its predecessor holds years of exams in that folder.
    // With tabs those files have a tab of their own and are left out here.
    const relatedCountFor = (category: DocumentCategory) =>
        tabbed ? 0 : course.relatedDocumentCounts?.[category.id] ?? 0;
    const totalFor = (category: DocumentCategory) => countFor(category) + relatedCountFor(category);

    // The counts exclude documents still under review, so a category holding nothing but
    // pending uploads reads as empty here. That is why hiding is reversible rather than
    // absolute: whoever just uploaded can still reach the folder through the toggle.
    // convertToCourse leaves documentCounts undefined when the payload has no counts at
    // all. Every category would read as empty then, so fall back to showing the full grid
    // rather than blanking the section on a shape we did not expect.
    const hasCounts = counts !== undefined;
    const emptyCategories = hasCounts
        ? documentCategories.filter((category) => totalFor(category) === 0)
        : [];
    const visibleCategories = showEmpty || !hasCounts
        ? documentCategories
        : documentCategories.filter((category) => totalFor(category) > 0);

    const toggleCategory = (key: string) => {
        setOpenKeys((previous) => {
            const next = new Set(previous);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    let body;
    if (loading) {
        body = <Loading compact />;
    } else if (onRelatedTab && related.failed) {
        body = <RelatedTabError tab={activeTab} />;
    } else if (!listedCourse) {
        body = <RowsSkeleton rows={Math.min(Math.max(activeTab.count, 2), 5)} className="skeleton-in" />;
    } else if (visibleCategories.length === 0) {
        body = <div className="vtk-panel vtk-empty">{t('course-page.no-documents-yet')}</div>;
    } else {
        body = (
            <div className="vtk-list">
                {visibleCategories.map((category) => {
                    const key = `${listedCourse.id}:${category.id}`;
                    return (
                        <DocumentCategoryRow
                            key={key}
                            category={category}
                            course={listedCourse}
                            count={countFor(category)}
                            relatedCount={relatedCountFor(category)}
                            onlyThisCourse={tabbed}
                            open={openKeys.has(key)}
                            onToggle={() => toggleCategory(key)}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <section aria-labelledby="documents-heading">
            <SectionHeader
                id="documents-heading"
                icon={<FolderOpen />}
                title={t('course-page.files')}
                count={documentCounts !== undefined ? ownTotal : undefined}
                action={listedCourse && emptyCategories.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowEmpty((previous) => !previous)}
                        aria-expanded={showEmpty}
                        className="vtk-button vtk-button-sm vtk-button-ghost"
                    >
                        {showEmpty
                            ? t('course-page.hide-empty-categories')
                            : t('course-page.show-empty-categories', { count: emptyCategories.length })}
                    </button>
                )}
            />
            {tabbed ? (
                <>
                    <CodeTabs tabs={tabs} activeId={activeTab.id} onSelect={setSelectedTabId} kind="documents" panelId={panelId} />
                    <div
                        key={activeTab.id}
                        id={panelId}
                        role="tabpanel"
                        aria-labelledby={tabIdFor(panelId, activeTab.id)}
                        className="page-in"
                    >
                        <RelatedTabNote tab={activeTab} />
                        {body}
                    </div>
                </>
            ) : body}
        </section>
    );
}
