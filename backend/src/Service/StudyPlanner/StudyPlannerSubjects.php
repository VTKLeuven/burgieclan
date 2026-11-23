<?php

namespace App\Service\StudyPlanner;

use App\Entity\Course;
use App\Entity\StudyPlannerEvent;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Groups the sessions of a timetable into subjects (courses), and links them to Burgieclan's
 * courses where it can.
 *
 * The timetable names teaching activities, not courses, and often more than one per session:
 *
 *  - "H04A9a Power System Calculations: Lecture" and "H04B0a Power System Calculations: Exercises
 *    and Practica" belong to one course: the kind of session after the last ": " is cut off
 *    (baseName()).
 *  - A session given to two programmes at once lists both activities in its summary, often once
 *    in Dutch and once in English: "H00T2a Eindige elementen voor elektromagnetische velden:
 *    oefeningen, H04C0a Finite Elements for Electromagnetic Fields: Exercises, Ruth Vazquez
 *    Sabariego". Everything named together in one session is one course (activities()), unless
 *    two of those names also have sessions of their own: then it is a session several courses
 *    share, like an exam review that names every course of the year.
 *
 * The names that end up together form one subject, labelled with the name the timetable uses
 * most. A subject is linked to a Burgieclan course when one of its codes is that course's code
 * (any case), or one of its names that course's name; it then takes the course's key, so two
 * groups that match the same course become one.
 */
class StudyPlannerSubjects
{
    private const ACTIVITY = '/^(lectures?|theory|exercises?|seminars?|practica|practicum|practicals?|labs?|laboratory'
        . '|tutorials?|sessions?|workshops?|hoorcolleges?|theorie|oefening(en)?|oefenzitting(en)?|werkcolleges?'
        . '|labo\'s?|zelfstudie|project)\b/iu';

    /** "H04C0a Finite Elements for Electromagnetic Fields: Exercises" among the people of a session. */
    private const ACTIVITY_ENTRY = '/^([A-Z][A-Z0-9]{4,6}[a-z]?)\s+(\S.*)$/u';

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
        return self::base(self::courseName($event));
    }

    private static function base(string $name): string
    {
        $colon = strrpos($name, ': ');
        if (false !== $colon && preg_match(self::ACTIVITY, substr($name, $colon + 2))) {
            return trim(substr($name, 0, $colon));
        }

        return trim($name);
    }

    /**
     * Every teaching activity a session names: its own first, then the ones listed among its
     * people.
     *
     * @return list<array{code: ?string, name: string, base: string}>
     */
    public static function activities(StudyPlannerEvent $event): array
    {
        $name = self::courseName($event);
        $activities = [['code' => $event->getCourseCode(), 'name' => $name, 'base' => self::base($name)]];
        foreach (self::peopleParts($event) as $part) {
            if (preg_match(self::ACTIVITY_ENTRY, $part, $m) && preg_match('/\d/', $m[1])) {
                $activities[] = ['code' => $m[1], 'name' => trim($m[2]), 'base' => self::base($m[2])];
            }
        }

        return $activities;
    }

    /**
     * The teaching staff of a session, without the other activities it lists:
     * "H04C0a Finite Elements …: Exercises, Ruth Vazquez Sabariego" -> "Ruth Vazquez Sabariego".
     */
    public static function people(StudyPlannerEvent $event): ?string
    {
        $people = array_filter(
            self::peopleParts($event),
            static fn (string $part): bool => !(preg_match(self::ACTIVITY_ENTRY, $part, $m) && preg_match('/\d/', $m[1])),
        );

        return [] === $people ? null : implode(', ', $people);
    }

    /**
     * @return list<string>
     */
    private static function peopleParts(StudyPlannerEvent $event): array
    {
        $parts = array_map('trim', explode(',', (string) $event->getPeople()));

        return array_values(array_filter($parts, static fn (string $part): bool => '' !== $part));
    }

    /**
     * @param list<StudyPlannerEvent> $events
     *
     * @return array{subjects: list<array{key: string, label: string, courseId: ?int, courseCode: ?string, nameNl: ?string, nameEn: ?string}>, of: array<string, string>}
     *         `of` maps an event UID to its subject key
     */
    public function resolve(array $events): array
    {
        // Union-find over the (lowercase) names: the names one session lists are one course.
        $parent = [];
        $find = static function (string $x) use (&$parent): string {
            while ($parent[$x] !== $x) {
                $parent[$x] = $parent[$parent[$x]];
                $x = $parent[$x];
            }

            return $x;
        };
        $union = static function (string $a, string $b) use (&$parent, $find): void {
            $ra = $find($a);
            $rb = $find($b);
            if ($ra !== $rb) {
                $parent[max($ra, $rb)] = min($ra, $rb);
            }
        };

        // How many sessions name each course on its own.
        $activitiesOf = [];
        $alone = [];
        foreach ($events as $event) {
            $activities = self::activities($event);
            $activitiesOf[$event->getUid()] = $activities;
            $bases = array_unique(array_map(static fn (array $a): string => mb_strtolower($a['base']), $activities));
            if (1 === count($bases)) {
                $alone[$bases[0]] = ($alone[$bases[0]] ?? 0) + 1;
            }
        }

        // A session naming two courses that each also have sessions of their own is not one course
        // under two names but a session they share, such as an exam review for a whole year. It
        // goes with the first of them, and the others it names are left out.
        foreach ($activitiesOf as $uid => $activities) {
            $own = array_values(
                array_filter(
                    $activities,
                    static fn (array $a): bool => isset($alone[mb_strtolower($a['base'])]),
                )
            );
            $distinct = array_unique(array_map(static fn (array $a): string => mb_strtolower($a['base']), $own));
            if (count($distinct) > 1) {
                $activitiesOf[$uid] = [$own[0]];
            }
        }

        $mentions = [];
        $display = [];
        $codes = [];
        $names = [];
        foreach ($activitiesOf as $activities) {
            foreach ($activities as $activity) {
                $key = mb_strtolower($activity['base']);
                $parent[$key] ??= $key;
                $mentions[$key] = ($mentions[$key] ?? 0) + 1;
                $display[$key] ??= $activity['base'];
                $union($key, mb_strtolower($activities[0]['base']));
                if (null !== $activity['code']) {
                    $codes[strtoupper($activity['code'])] = true;
                }
                $names[mb_strtolower($activity['name'])] = true;
                $names[$key] = true;
            }
        }

        [$byCode, $byName] = $this->findCourses(array_keys($codes), array_keys($names));

        // Per group of names: how often each name is used, and which Burgieclan courses match.
        $groups = [];
        foreach ($activitiesOf as $activities) {
            $root = $find(mb_strtolower($activities[0]['base']));
            foreach ($activities as $activity) {
                $course = (null !== $activity['code'] ? ($byCode[strtoupper($activity['code'])] ?? null) : null)
                    ?? $this->unique($byName[mb_strtolower($activity['name'])] ?? [])
                    ?? $this->unique($byName[mb_strtolower($activity['base'])] ?? []);
                if (null !== $course) {
                    $id = (int) $course->getId();
                    $groups[$root]['courses'][$id] = ($groups[$root]['courses'][$id] ?? 0) + 1;
                    $groups[$root]['course'][$id] = $course;
                }
            }
        }
        foreach ($mentions as $key => $count) {
            $root = $find($key);
            $best = $groups[$root]['label'] ?? null;
            if (null === $best || $count > $mentions[$best] || ($count === $mentions[$best] && strcmp($key, $best) < 0)) {
                $groups[$root]['label'] = $key;
            }
        }

        $subjects = [];
        $keyOf = [];
        foreach ($groups as $root => $group) {
            $course = null;
            if (isset($group['courses'])) {
                arsort($group['courses']);
                $course = $group['course'][array_key_first($group['courses'])];
            }
            if ($course instanceof Course) {
                $key = 'course:' . $course->getId();
                $subjects[$key] ??= [
                    'key' => $key,
                    'label' => $course->getCatalogName(),
                    'courseId' => $course->getId(),
                    'courseCode' => $course->getCode(),
                    'nameNl' => $course->getNameNl() ?: $course->getName(),
                    'nameEn' => $course->getNameEn() ?: null,
                ];
            } else {
                $label = $display[$group['label']];
                $key = 'name:' . $label;
                $subjects[$key] ??= [
                    'key' => $key,
                    'label' => $label,
                    'courseId' => null,
                    'courseCode' => null,
                    'nameNl' => null,
                    'nameEn' => null,
                ];
            }
            $keyOf[$root] = $key;
        }

        $of = [];
        foreach ($activitiesOf as $uid => $activities) {
            $of[$uid] = $keyOf[$find(mb_strtolower($activities[0]['base']))];
        }

        $list = array_values($subjects);
        usort($list, static fn (array $a, array $b): int => strcasecmp($a['label'], $b['label']));

        return ['subjects' => $list, 'of' => $of];
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
