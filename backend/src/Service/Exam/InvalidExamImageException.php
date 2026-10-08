<?php

namespace App\Service\Exam;

use RuntimeException;

/**
 * An upload that is not an image we accept. The message is meant for whoever uploaded it, and
 * `reason` lets the page say it in their language: "size", "type", "unreadable" or "pixels".
 */
class InvalidExamImageException extends RuntimeException
{
    public function __construct(string $message, public readonly string $reason)
    {
        parent::__construct($message);
    }
}
