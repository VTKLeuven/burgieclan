import { ApiSeed } from '@/components/ApiSeed';
import VtkPollsPage from '@/components/polls/VtkPollsPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints } from '@/utils/apiEndpoints';

export const metadata = {
    title: 'Polls | Burgieclan',
    description: 'The questions your student representatives ask your study programme before they meet the professors.',
};

type Params = Promise<{ locale: string }>;

export default async function Page({ params }: { params: Params }) {
    const { locale } = await params;
    const seed = await seedApi([apiEndpoints.vtkPolls(locale)]);

    return <ApiSeed seed={seed}><VtkPollsPage /></ApiSeed>;
}
