<?php

namespace App\Validator;

use Attribute;
use Symfony\Component\Validator\Constraint;

/**
 * Checks what a new exam reconstruction needs beyond the shape of its fields: its exam period has
 * started, there is not one for that exam yet, and a copy comes from the same course.
 */
#[Attribute(Attribute::TARGET_CLASS)]
class NewExam extends Constraint
{
    public const NOT_STARTED = 'b2f1c1d4-5b1e-4a53-9c1f-7e0f7a0d3a01';
    public const ALREADY_EXISTS = 'b2f1c1d4-5b1e-4a53-9c1f-7e0f7a0d3a02';
    public const OTHER_COURSE = 'b2f1c1d4-5b1e-4a53-9c1f-7e0f7a0d3a03';

    public string $notStartedMessage = 'This exam period has not started yet.';
    public string $alreadyExistsMessage = 'There already is a reconstruction of this exam.';
    public string $otherCourseMessage = 'You can only copy a reconstruction of the same course.';

    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}
