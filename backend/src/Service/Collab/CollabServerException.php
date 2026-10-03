<?php

namespace App\Service\Collab;

use RuntimeException;

/**
 * The collab server could not be reached or refused a request from Symfony.
 */
class CollabServerException extends RuntimeException
{
}
