import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Activity } from "@/components/homepage/recent/Activity";
import { ApiClient } from "@/actions/api";

const transformToActivityFormat = (apiResponse) => {
    if (!apiResponse || !apiResponse["hydra:member"]) {
        return [];
    }

    return apiResponse["hydra:member"].map(item => ({
        id: parseInt(item['@id'].split('/').pop()),
        documentId: parseInt(item.document['@id'].split('/').pop()),
        documentName: item.document.name,
        courseName: item.document.course.name,
        timestamp: item.lastViewed
    }));
};

export const RecentActivities = () => {
    const { t, i18n } = useTranslation();

    const [activities, setActivities] = useState([]);

    useEffect(() => {
        const fetchActivities = async () => {
            try{
                const storedActivities = await ApiClient('GET', `/api/document_views`);
                const formattedActivities = transformToActivityFormat(storedActivities);
                setActivities(formattedActivities);
            } catch (error) {
                console.error('Failed to fetch recent activities:', error);

            }
        };
        fetchActivities();

    }, []);

    return (
        <div className="rounded-lg border border-gray-200 h-full">
            {/* Header */}
            <div className="p-4">
                <h3 className="text-xl text-gray-900">{t('home.recent_activities')}</h3>
            </div>

            {/* Activities */}
            {activities.length > 0 ? (
                <div className="divide-y divide-gray-200">
                    {activities.map(activity => (
                        <Activity
                            key={activity.id}
                            documentName={activity.documentName}
                            courseName={activity.courseName}
                            timestamp={activity.timestamp}
                            link={`document/${activity.documentId}`}
                        />
                    ))}
                </div>
            ) : (
                <div className="p-10 text-center text-gray-400">
                    {t('home.no_recent_activities')}
                </div>
            )}
        </div>
    )
}