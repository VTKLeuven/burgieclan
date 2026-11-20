import Loading from '@/components/loading/LoadingPage';
import { Activity } from '@/components/homepage/recent/Activity';
import { HydraCollection, useApi } from '@/hooks/useApi';
import { usePreloadedApi } from '@/components/ApiSeed';
import type { DocumentView } from '@/types/entities';
import { convertToDocumentView } from '@/utils/convertToEntity';
import { courseTitle } from '@/utils/courseName';
import { useEffect, useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiEndpoints } from '@/utils/apiEndpoints';

/** The panel is a nudge back into recent work, not a history page: four rows is enough. */
const MAX_ACTIVITIES = 6;

export const RecentActivities = () => {
    const readPreloadedApi = usePreloadedApi();
    const { t } = useTranslation();
    const { request, loading, error } = useApi<HydraCollection<unknown>>();
    const [documentViews, setDocumentViews] = useState<DocumentView[]>(() => {
        const preloaded = readPreloadedApi(apiEndpoints.documentViews()) as HydraCollection<unknown> | undefined;
        return preloaded?.['hydra:member']?.map(convertToDocumentView) || [];
    });

    useEffect(() => {
        const fetchActivities = async () => {
            const response = await request('GET', apiEndpoints.documentViews());

            if (!response) {
                return;
            }

            const views: DocumentView[] = response['hydra:member']?.map(convertToDocumentView) || [];
            setDocumentViews(views);
        };

        fetchActivities();
    }, [request]);

    const renderContent = () => {
        if (loading && documentViews.length === 0) {
            return <Loading compact />;
        }

        if ((error || documentViews.length === 0) && !loading) {
            return (
                <div className="vtk-panel vtk-empty">
                    {t('home.no_recent_activities')}
                </div>
            );
        }

        return (
            <div className="vtk-list">
                {documentViews.slice(0, MAX_ACTIVITIES).map(documentView => (
                    <Activity
                        key={documentView.id}
                        documentId={documentView.document?.id}
                        documentName={documentView.document?.name || ''}
                        courseName={courseTitle(documentView.document?.course)}
                        timestamp={documentView.lastViewed?.toISOString() || ''}
                        link={`/document/${documentView.document?.id}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <section aria-labelledby="recent-heading">
            <SectionHeader id="recent-heading" icon={<History />} title={t('home.recent_activities')} />
            {renderContent()}
        </section>
    );
};
