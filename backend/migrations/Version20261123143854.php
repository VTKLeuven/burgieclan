<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use App\Service\StudyPlanner\StudyPlannerSubjects;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Timetable sessions were split on the first comma of their summary, so "H01A0a Analyse, deel 1:
 * hoorcollege" was stored as course "H01A0a Analyse" with "deel 1: hoorcollege" among the people.
 * A sync puts this right for the sessions still in the feed, but the feed only reaches back a few
 * weeks: this splits every stored session again, the way the parser now does.
 *
 * What pointed at the old name follows it: a rule (hide or mandatory) on that course, and the
 * deadlines, marks, exams and Blok tasks of a course known only by its name ("name:Analyse"). Only
 * where the old name leads to one new name in that planner, and no session keeps the old one.
 */
final class Version20261123143854 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Study planner sessions keep a comma inside their course name';
    }

    public function up(Schema $schema): void
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT e.id, e.planner_id, e.course, e.course_code, e.people, p.user_id
            FROM study_planner_event e JOIN study_planner p ON p.id = e.planner_id'
        );

        /** @var array<int, array{user: int, courses: array<string, array<string, true>>, bases: array<string, array<string, true>>, kept: array<string, true>}> $planners */
        $planners = [];
        foreach ($rows as $row) {
            $planner = (int) $row['planner_id'];
            $planners[$planner] ??= ['user' => (int) $row['user_id'], 'courses' => [], 'bases' => [], 'kept' => []];
            $old = (string) $row['course'];
            $code = null === $row['course_code'] ? null : (string) $row['course_code'];
            $oldBase = StudyPlannerSubjects::base(StudyPlannerSubjects::nameOf($code, $old));

            $parts = null === $row['people'] ? [] : StudyPlannerSubjects::split($old . ', ' . $row['people'], true);
            if ([] === $parts || $parts[0] === $old) {
                $planners[$planner]['kept'][$oldBase] = true;
                continue;
            }
            $new = $parts[0];
            $people = implode(', ', array_slice($parts, 1));
            $this->addSql(
                'UPDATE study_planner_event SET course = ?, people = ? WHERE id = ?',
                [$new, '' === $people ? null : $people, $row['id']]
            );
            $planners[$planner]['courses'][$old][$new] = true;
            $newBase = StudyPlannerSubjects::base(StudyPlannerSubjects::nameOf($code, $new));
            if ($newBase !== $oldBase) {
                $planners[$planner]['bases'][$oldBase][$newBase] = true;
            }
        }

        foreach ($planners as $planner => $changes) {
            foreach ($changes['courses'] as $old => $new) {
                if (1 === count($new)) {
                    $this->addSql(
                        'UPDATE study_planner_rule SET course = ? WHERE planner_id = ? AND course = ?',
                        [array_key_first($new), $planner, $old]
                    );
                }
            }
            foreach ($changes['bases'] as $oldBase => $new) {
                if (1 !== count($new) || isset($changes['kept'][$oldBase])) {
                    continue;
                }
                $newBase = (string) array_key_first($new);
                $params = ['name:' . $newBase, mb_substr($newBase, 0, 255), 'name:' . $oldBase];
                $this->addSql(
                    'UPDATE study_planner_item SET subject = ?, subject_label = ? WHERE subject = ? AND planner_id = ?',
                    [...$params, $planner]
                );
                foreach (['study_planner_exam', 'study_planner_task'] as $table) {
                    $this->addSql(
                        sprintf('UPDATE %s SET subject = ?, subject_label = ? WHERE subject = ? AND user_id = ?', $table),
                        [...$params, $changes['user']]
                    );
                }
            }
        }
    }

    public function down(Schema $schema): void
    {
        // Data only: splitting on the first comma again would only bring the mistake back.
    }
}
