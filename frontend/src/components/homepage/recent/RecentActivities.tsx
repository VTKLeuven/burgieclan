import Loading from '@/components/loading/LoadingPage';
import { Activity } from '@/components/homepage/recent/Activity';
import { HydraCollection, useApi } from '@/hooks/useApi';
import type { DocumentView } from '@/types/entities';
import { convertToDocumentView } from '@/utils/convertToEntity';
import { localizedCourseName } from '@/utils/courseName';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';


/** The panel is a nudge back into recent work, not a history page: four rows is enough. */
const MAX_ACTIVITIES = 4;

export const RecentActivities = () => {
    const { t, i18n } = useTranslation();
    const { request, loading, error } = useApi<HydraCollection<unknown>>();
    const [documentViews, setDocumentViews] = useState<DocumentView[]>([]);

    useEffect(() => {
        const fetchActivities = async () => {
            const response = await request('GET', '/api/document_views');

            if (!response) {
                return;
            }

            const documentViews: DocumentView[] = response['hydra:member']?.map(convertToDocumentView) || [];
            setDocumentViews(documentViews);
        };

        fetchActivities();
    }, [request]);

    const renderContent = () => {
        if (loading) {
            return <Loading />;
        }

        if (error || documentViews.length === 0) {
            return <div className="vtk-empty py-10">
                {t('home.no_recent_activities')}
            </div>
        }

        return (
            <div className="divide-y divide-vtk-line">
                {documentViews.slice(0, MAX_ACTIVITIES).map(documentView => (
                    <Activity
                        key={documentView.id}
                        documentName={documentView.document?.name || ''}
                        courseName={localizedCourseName(documentView.document?.course, i18n.language)}
                        timestamp={documentView.lastViewed?.toISOString() || ''}
                        link={`document/${documentView.document?.id}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="vtk-panel overflow-hidden">
            <div className="border-b border-vtk-line px-5 py-3.5">
                <h2 className="m-0 text-base font-semibold tracking-tight text-vtk-ink">
                    {t('home.recent_activities')}
                </h2>
            </div>
            {renderContent()}
        </div>
    );
};
