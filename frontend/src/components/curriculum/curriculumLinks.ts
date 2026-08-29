import type { Course, Module, Program } from '@/types/entities';

/** One href builder per node type, so a link never gets hand-assembled at a call site. */
export const curriculumHref = {
    programs: () => '/courses',
    program: (program: Pick<Program, 'id'>) => `/courses/program/${program.id}`,
    module: (module: Pick<Module, 'id'>) => `/courses/module/${module.id}`,
    course: (course: Pick<Course, 'id'>) => `/course/${course.id}`,
};
