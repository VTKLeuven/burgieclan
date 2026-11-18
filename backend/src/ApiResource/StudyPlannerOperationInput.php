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
 */
class StudyPlannerOperationInput
{
    public const OPS = ['done', 'hide', 'mandatory', 'keepOnly', 'addRule', 'removeRule', 'addItem', 'updateItem', 'deleteItem', 'itemDone'];

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
}
