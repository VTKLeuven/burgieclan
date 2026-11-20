import { ApiSeed } from '@/components/ApiSeed';
import StudyPlannerPage from '@/components/study-planner/StudyPlannerPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints } from '@/utils/apiEndpoints';

export const metadata = {
    title: 'Planner | Burgieclan',
    description: 'Your KU Leuven timetable: tick off sessions, hide what you skip, mark what is mandatory and export it to your calendar.',
};

export default async function Page() {
    const seed = await seedApi([apiEndpoints.studyPlanner()]);

    return <ApiSeed seed={seed}><StudyPlannerPage /></ApiSeed>;
}
