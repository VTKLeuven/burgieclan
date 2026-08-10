import type { Course } from '@/types/entities';

type NamedCourse = Pick<Course, 'name' | 'nameNl' | 'nameEn'>;

/**
 * The course title to show a reader of `locale`.
 *
 * KU Leuven publishes a Dutch and an English title for essentially every course and they normally
 * differ — "Gedistribueerde systemen" vs "Distributed Systems" for H0N08A. `name` holds whichever
 * language the programme happened to be imported in, so it is only a fallback: prefer the title
 * matching the reader, and fall back to `name` when that translation is missing.
 */
export function localizedCourseName(
    course: NamedCourse | undefined | null,
    locale: string | undefined,
): string {
    if (!course) {
        return '';
    }
    const translated = locale?.toLowerCase().startsWith('en') ? course.nameEn : course.nameNl;

    return translated?.trim() || course.name || '';
}

/**
 * Every title a course is known by, for search: a student typing "distributed" should find a course
 * stored under its Dutch name, and vice versa, whichever language they are browsing in.
 */
export function courseNameVariants(course: NamedCourse | undefined | null): string[] {
    if (!course) {
        return [];
    }

    return [course.name, course.nameNl, course.nameEn].filter(
        (name): name is string => typeof name === 'string' && name.trim() !== '',
    );
}
