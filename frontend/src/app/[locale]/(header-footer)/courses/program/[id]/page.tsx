import { ApiSeed } from '@/components/ApiSeed';
import ProgramPage from '@/components/curriculum/ProgramPage';
import { seedApi } from '@/lib/seedApi.server';
import { apiEndpoints, numericId } from '@/utils/apiEndpoints';

export const metadata = {
    title: 'Program | Burgieclan',
    description: 'Browse the modules and courses of a program on Burgieclan.',
};

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
    const { id } = await params;

    const programId = numericId(id);
    const seed = await seedApi([programId && apiEndpoints.program(programId)]);

    return <ApiSeed seed={seed}><ProgramPage id={Number(id)} /></ApiSeed>;
}
