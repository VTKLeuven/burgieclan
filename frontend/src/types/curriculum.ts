/**
 * A node the curriculum navigator should open on load, and the branches it has to expand on the
 * way there. Built from the `?program=` / `?module=` query parameters, so a link from elsewhere
 * in the app can point at one place in a tree that is otherwise loaded a level at a time.
 */
export interface CurriculumFocus {
    programId: number;
    /** The program's top level down to the target; empty when the target is the program itself. */
    moduleIds: number[];
    targetType: 'program' | 'module';
    targetId: number;
}
