import type { Course } from '@/types/entities';

type NamedCourse = Pick<Course, 'name' | 'nameNl' | 'nameEn' | 'language'>;

/**
 * The course title, as the KU Leuven onderwijsaanbod lists it.
 *
 * A course has its own language of instruction (`language`, KU Leuven's `originalLangu`), apart
 * from the programme it sits in and from the reader's language: the English master Computer
 * Science lists "Bedrijfskunde en ondernemen" in Dutch next to "Distributed Systems". So every
 * reader sees the title in the course's own language. The backend already stores `name` that way;
 * the per-language titles only win when `language` is known and that title exists.
 */
export function courseTitle(course: NamedCourse | undefined | null): string {
    if (!course) {
        return '';
    }
    const own = course.language === 'en' ? course.nameEn : course.language === 'nl' ? course.nameNl : undefined;

    return own?.trim() || course.name || '';
}

/**
 * `courses` in alphabetical order of their title, ignoring case and accents (collated for a reader
 * of `locale`), so "Écologie" sits with the E's. Courses without a title sort by their code.
 */
export function sortCoursesByName<T extends NamedCourse & Pick<Course, 'code'>>(
    courses: readonly T[],
    locale: string | undefined,
): T[] {
    const title = (course: T) => courseTitle(course) || course.code || '';
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

    return [...courses].sort((a, b) => collator.compare(title(a), title(b)));
}
