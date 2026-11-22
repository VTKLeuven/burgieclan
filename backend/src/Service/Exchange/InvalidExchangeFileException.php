<?php

namespace App\Service\Exchange;

use RuntimeException;

/**
 * A file that cannot be attached to an exchange report. The message is meant for whoever uploaded
 * it; `reason` ("size", "type", "count" or "failed") lets the page say it in their language.
 */
class InvalidExchangeFileException extends RuntimeException
{
    public function __construct(string $message, public readonly string $reason)
    {
        parent::__construct($message);
    }
}
