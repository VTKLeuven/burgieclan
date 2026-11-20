import { ApiSeed } from '@/components/ApiSeed';
import ModulePage from '@/components/curriculum/ModulePage';
import { curriculumTreeEndpoints, curriculumTreeOpen, mergeSeeds, seedApi } from '@/lib/seedApi.server';
import { convertToModulePath } from '@/utils/convertToEntity';
import { apiEndpoints, numericId } from '@/utils/apiEndpoints';

export const metadata = {
    title: 'Module | Burgieclan',
    description: 'Browse the groups and courses of a module on Burgieclan.',
};

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
    const { id } = await params;

    const moduleId = numericId(id);
    const [page, treeOpen] = await Promise.all([
        seedApi(moduleId ? [apiEndpoints.module(moduleId), apiEndpoints.modulePath(moduleId)] : []),
        curriculumTreeOpen(),
    ]);
    // The folder tree beside the page, opened down to this module, when it is showing.
    let treeEndpoints: string[] = [];
    try {
        const raw = moduleId ? page.values[apiEndpoints.modulePath(moduleId)] : undefined;
        const path = raw ? convertToModulePath(raw) : null;
        treeEndpoints = treeOpen && path ? curriculumTreeEndpoints([path]) : [];
    } catch {
        // No readable trail: the tree finds its own way, as before.
    }
    const seed = mergeSeeds(page, await seedApi(treeEndpoints));

    return <ApiSeed seed={seed}><ModulePage id={Number(id)} /></ApiSeed>;
}
