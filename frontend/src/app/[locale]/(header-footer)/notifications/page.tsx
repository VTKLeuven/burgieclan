import { ApiSeed } from '@/components/ApiSeed';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints } from '@/utils/apiEndpoints';

export const metadata = {
    title: 'Notifications | Burgieclan',
    description: 'What is new in the courses you follow.',
};

export default async function Page() {
    const seed = await seedApi([apiEndpoints.notifications()]);

    return <ApiSeed seed={seed}><NotificationsPage /></ApiSeed>;
}
