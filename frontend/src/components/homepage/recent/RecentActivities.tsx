import Loading from '@/app/[locale]/loading';
import { Activity } from '@/components/homepage/recent/Activity';
import { useApi } from '@/hooks/useApi';
import type { DocumentView } from '@/types/entities';
import { convertToDocumentView } from '@/utils/convertToEntity';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';


export const RecentActivities = () => {
    const { t } = useTranslation();
    const { request, loading, error } = useApi();
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
            return <div className="p-10 text-center text-gray-400">
                {t('home.no_recent_activities')}
            </div>
        }

        return (
            <div className="divide-y divide-gray-200">
                {documentViews.map(documentView => (
                    <Activity
                        key={documentView.id}
                        documentName={documentView.document?.name || ''}
                        courseName={documentView.document?.course?.name || ''}
                        timestamp={documentView.lastViewed?.toISOString() || ''}
                        link={`document/${documentView.document?.id}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="rounded-lg border border-gray-200 h-full">
            <div className="px-4 pt-2">
                <h3 className="text-xl text-gray-900">{t('home.recent_activities')}</h3>
            </div>
            {renderContent()}
        </div>
    );
};