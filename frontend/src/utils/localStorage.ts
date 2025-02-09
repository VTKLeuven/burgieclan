const RECENT_ACTIVITIES_KEY = 'recent_activities';

export const getRecentActivities = () => {
    try {
        const activities = localStorage.getItem(RECENT_ACTIVITIES_KEY);
        return activities ? JSON.parse(activities) : [];
    } catch (error) {
        console.error('Error getting recent activities:', error);
        return [];
    }
};

export const setRecentActivities = (activities: any[]) => {
    try {
        localStorage.setItem(RECENT_ACTIVITIES_KEY, JSON.stringify(activities));
    } catch (error) {
        console.error('Error setting recent activities:', error);
    }
};