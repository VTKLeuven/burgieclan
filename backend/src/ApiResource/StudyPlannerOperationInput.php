<?php

namespace App\ApiResource;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Body of POST /api/study_planner/operations: one change to the planner.
 *
 * - {"op": "done", "uid", "value"}: tick a session off, or undo that.
 * - {"op": "hide", "uid", "value"} / {"op": "mandatory", "uid", "value"}: hide one session, or
 *   mark it as mandatory.
 * - {"op": "keepOnly", "uid"}: "I attend this one": hide the other sessions of the same course in
 *   the same week (a practical offered in several groups), and show this one.
 * - {"op": "addRule", "uid", "action": "hide"|"mandatory"}: the same for every session at that
 *   weekday, time and room; {"op": "removeRule", "id"} takes such a rule away.
 * - {"op": "addItem", "item"}, {"op": "updateItem", "id", "item"}, {"op": "deleteItem", "id"},
 *   {"op": "itemDone", "id", "value"}: deadlines and mandatory sessions entered by hand, where
 *   item = {"subject", "kind": "deadline"|"mandatory", "title", "date", "time", "end", "note"}.
 * - {"op": "addVtkEvent", "vtkEventId"} / {"op": "removeVtkEvent", "vtkEventId"}: put a VTK event
 *   in the planner, or take it out again. Both do nothing when it is already so.
 *
 * The "Blok" calendar (StudyPlannerBlok), which needs no timetable. A course is "course:{id}" (a
 * Burgieclan course) or "name:{name}" (any course, by name):
 *
 * - {"op": "addExam", "exam"}, {"op": "updateExam", "id", "exam"}, {"op": "deleteExam", "id"},
 *   where exam = {"subject", "date", "time"}.
 * - {"op": "addTask", "task"}, {"op": "updateTask", "id", "task"}, {"op": "deleteTask", "id"},
 *   {"op": "taskDone", "id", "value"}: what to study on a day, where task = {"date", "subject"
 *   (or null), "title"}.
 * - {"op": "catchUp", "date"}: move every task that is past and not ticked off to that date.
 * - {"op": "freeDay", "date", "value"}: keep a day free, or not.
 * - {"op": "timerStart"} / {"op": "timerPause"}: start (or resume) the study timer, pause it;
 *   {"op": "deleteSession", "id"} forgets one timed stretch.
 */
class StudyPlannerOperationInput
{
    public const OPS = [
        'done', 'hide', 'mandatory', 'keepOnly', 'addRule', 'removeRule', 'addItem', 'updateItem', 'deleteItem', 'itemDone', 'addVtkEvent', 'removeVtkEvent',
        'addExam', 'updateExam', 'deleteExam', 'addTask', 'updateTask', 'deleteTask', 'taskDone', 'catchUp',
        'freeDay', 'timerStart', 'timerPause', 'deleteSession',
    ];

    #[Assert\NotBlank]
    #[Assert\Choice(choices: self::OPS)]
    public ?string $op = null;

    #[Assert\Length(max: 255)]
    public ?string $uid = null;

    public ?bool $value = null;

    #[Assert\Choice(choices: ['hide', 'mandatory'])]
    public ?string $action = null;

    #[Assert\Length(max: 32)]
    public ?string $id = null;

    /**
     * @var array<string, mixed>|null
     */
    public ?array $item = null;

    /** The id of an event on the VTK website. */
    #[Assert\Length(max: 64)]
    public ?string $vtkEventId = null;

    /**
     * @var array<string, mixed>|null
     */
    public ?array $exam = null;

    /**
     * @var array<string, mixed>|null
     */
    public ?array $task = null;

    /** "YYYY-MM-DD" */
    #[Assert\Length(max: 10)]
    public ?string $date = null;
}
