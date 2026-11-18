<?php

namespace App\Service\StudyPlanner;

use App\Entity\Course;
use App\Entity\StudyPlannerEvent;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Groups the sessions of a timetable into subjects (courses), and links them to Burgieclan's
 * courses where it can.
 *
 * The timetable names teaching activities, not courses: "H04A9a Power System Calculations:
 * Lecture" and "H04B0a Power System Calculations: Exercises and Practica" belong to one course.
 * A session belongs to a Burgieclan course when its code is that course's code (any case), or when
 * its name (without the ": Lecture" part) is the name of exactly one course. A session that does
 * not match itself joins the course its siblings with the same name matched; otherwise its name is
 * a subject of its own.
 */
class StudyPlannerSubjects
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /** "H04S7a Combustion Engines: Lectures" -> "Combustion Engines: Lectures". */
    public static function courseName(StudyPlannerEvent $event): string
    {
        $code = $event->getCourseCode();
        $course = $event->getCourse();
        $name = null !== $code && str_starts_with($course, $code) ? substr($course, strlen($code)) : $course;
        $name = trim($name);

        return '' === $name ? $course : $name;
    }

    /**
     * The course a teaching activity belongs to: "Combustion Engines: Lectures" -> "Combustion
     * Engines", "Vermogenelektronica: oefeningen en practica" -> "Vermogenelektronica". Only a
     * kind of session is cut off, so "Nuclear Energy: Basic Aspects" stays a course of its own.
     */
    public static function baseName(StudyPlannerEvent $event): string
    {
        $name = self::courseName($event);
        $colon = strrpos($name, ': ');
        if (false !== $colon && preg_match(self::ACTIVITY, substr($name, $colon + 2))) {
            return trim(substr($name, 0, $colon));
        }

        return $name;
    }

    private const ACTIVITY = '/^(lectures?|theory|exercises?|exercise|seminars?|practica|practicum|practicals?|labs?|laboratory'
        . '|tutorials?|sessions?|workshops?|hoorcolleges?|theorie|oefening(en)?|oefenzitting(en)?|werkcolleges?|labo\'s?'
        . '|zelfstudie|project)\b/iu';

    /**
     * @param list<StudyPlannerEvent> $events
     *
     * @return array{subjects: list<array{key: string, label: string, courseId: ?int, courseCode: ?string, nameNl: ?string, nameEn: ?string}>, of: array<string, string>, courses: array<int, Course>}
     *         `of` maps an event UID to its subject key
     */
    public function resolve(array $events): array
    {
        $codes = [];
        $names = [];
        foreach ($events as $event) {
            if (null !== $event->getCourseCode()) {
                $codes[strtoupper($event->getCourseCode())] = true;
            }
            $names[mb_strtolower(self::courseName($event))] = true;
            $names[mb_strtolower(self::baseName($event))] = true;
        }

        [$byCode, $byName] = $this->findCourses(array_keys($codes), array_keys($names));

        // A course for every session that matches one by itself.
        $direct = [];
        $byBase = [];
        foreach ($events as $event) {
            $code = null === $event->getCourseCode() ? null : strtoupper($event->getCourseCode());
            $course = (null !== $code ? ($byCode[$code] ?? null) : null)
                ?? $this->unique($byName[mb_strtolower(self::courseName($event))] ?? [])
                ?? $this->unique($byName[mb_strtolower(self::baseName($event))] ?? []);
            if (null !== $course) {
                $direct[$event->getUid()] = $course;
                $byBase[self::baseName($event)][(int) $course->getId()] = $course;
            }
        }

        $subjects = [];
        $of = [];
        $courses = [];
        foreach ($events as $event) {
            $base = self::baseName($event);
            $course = $direct[$event->getUid()] ?? (1 === count($byBase[$base] ?? []) ? reset($byBase[$base]) : null);
            if ($course instanceof Course) {
                $key = 'course:' . $course->getId();
                $courses[(int) $course->getId()] = $course;
                $subjects[$key] ??= [
                    'key' => $key,
                    'label' => $course->getNameEn() ?: $course->getName(),
                    'courseId' => $course->getId(),
                    'courseCode' => $course->getCode(),
                    'nameNl' => $course->getNameNl() ?: $course->getName(),
                    'nameEn' => $course->getNameEn() ?: null,
                ];
            } else {
                $key = 'name:' . $base;
                $subjects[$key] ??= [
                    'key' => $key,
                    'label' => $base,
                    'courseId' => null,
                    'courseCode' => null,
                    'nameNl' => null,
                    'nameEn' => null,
                ];
            }
            $of[$event->getUid()] = $key;
        }

        $list = array_values($subjects);
        usort($list, static fn (array $a, array $b): int => strcasecmp($a['label'], $b['label']));

        return ['subjects' => $list, 'of' => $of, 'courses' => $courses];
    }

    /**
     * @param list<Course> $courses
     */
    private function unique(array $courses): ?Course
    {
        return 1 === count($courses) ? $courses[0] : null;
    }

    /**
     * @param list<string> $codes uppercase
     * @param list<string> $names lowercase
     *
     * @return array{0: array<string, Course>, 1: array<string, list<Course>>}
     */
    private function findCourses(array $codes, array $names): array
    {
        if ([] === $codes && [] === $names) {
            return [[], []];
        }
        /** @var list<Course> $courses */
        $courses = $this->entityManager->createQueryBuilder()
            ->select('c')
            ->from(Course::class, 'c')
            ->where('UPPER(c.code) IN (:codes)')
            ->orWhere('LOWER(c.name) IN (:names)')
            ->orWhere('LOWER(c.nameEn) IN (:names)')
            ->orWhere('LOWER(c.nameNl) IN (:names)')
            ->setParameter('codes', [] === $codes ? [''] : $codes)
            ->setParameter('names', [] === $names ? [''] : $names)
            ->getQuery()
            ->getResult();

        $byCode = [];
        $byName = [];
        foreach ($courses as $course) {
            $byCode[strtoupper($course->getCode())] ??= $course;
            $seen = [];
            foreach ([$course->getName(), $course->getNameEn(), $course->getNameNl()] as $name) {
                if (null === $name || '' === $name) {
                    continue;
                }
                $lower = mb_strtolower($name);
                if (isset($seen[$lower])) {
                    continue;
                }
                $seen[$lower] = true;
                $byName[$lower][] = $course;
            }
        }

        return [$byCode, $byName];
    }
}
