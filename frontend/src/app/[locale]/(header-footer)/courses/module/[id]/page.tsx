import ModulePage from '@/components/curriculum/ModulePage';

export const metadata = {
    title: 'Module | Burgieclan',
    description: 'Browse the groups and courses of a module on Burgieclan.',
};

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
    const { id } = await params;

    return <ModulePage id={Number(id)} />;
}
