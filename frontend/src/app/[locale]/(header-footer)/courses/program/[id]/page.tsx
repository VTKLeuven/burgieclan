import ProgramPage from '@/components/curriculum/ProgramPage';

export const metadata = {
    title: 'Program | Burgieclan',
    description: 'Browse the modules and courses of a program on Burgieclan.',
};

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
    const { id } = await params;

    return <ProgramPage id={Number(id)} />;
}
