import type { Course } from '@/types/entities';

type NamedCourse = Pick<Course, 'name' | 'nameNl' | 'nameEn' | 'language'>;
type SearchableCourse = NamedCourse & Pick<Course, 'code'>;

function normalizeForMatch(value: string | undefined): string {
    return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

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
 * The KU Leuven translation of the course title — Dutch for an English-taught course and English
 * for a Dutch-taught course — when non-empty and different from the displayed title.
 */
export function alternateCourseTitle(course: NamedCourse | undefined | null): string | null {
    if (!course) {
        return null;
    }

    const own = courseTitle(course).trim();
    let alt: string | undefined;
    if (course.language === 'en') {
        alt = course.nameNl;
    } else if (course.language === 'nl') {
        alt = course.nameEn;
    } else {
        alt = [course.nameNl, course.nameEn].find(
            (candidate) => candidate?.trim() && candidate.trim().toLowerCase() !== own.toLowerCase(),
        );
    }

    const trimmed = alt?.trim();
    if (!trimmed || trimmed.toLowerCase() === own.toLowerCase()) {
        return null;
    }

    return trimmed;
}

/**
 * Returns the alternate course title only when `query` is non-empty, matches the alternate title
 * case-insensitively, and does NOT match the displayed title (`courseTitle(course)`) or code.
 * Used to show a quiet hint explaining why a search hit matched.
 */
export function matchedAlternateTitle(
    course: SearchableCourse | undefined | null,
    query: string | undefined | null,
): string | null {
    if (!course || !query) {
        return null;
    }

    const needle = normalizeForMatch(query.trim());
    if (!needle) {
        return null;
    }

    const alt = alternateCourseTitle(course);
    if (!alt) {
        return null;
    }

    const terms = needle.split(/\s+/).filter(Boolean);
    const ownTitle = normalizeForMatch(courseTitle(course));
    const code = normalizeForMatch(course.code);
    const altNorm = normalizeForMatch(alt);

    if (terms.every((term) => ownTitle.includes(term) || code.includes(term))) {
        return null;
    }

    if (terms.some((term) => !ownTitle.includes(term) && !code.includes(term) && altNorm.includes(term))) {
        return alt;
    }

    return null;
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
