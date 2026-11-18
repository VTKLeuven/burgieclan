import StudyPlannerPage from '@/components/study-planner/StudyPlannerPage';

export const metadata = {
    title: 'Planner | Burgieclan',
    description: 'Your KU Leuven timetable: tick off sessions, hide what you skip, mark what is mandatory and export it to your calendar.',
};

export default function Page() {
    return <StudyPlannerPage />;
}
