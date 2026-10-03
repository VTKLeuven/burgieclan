<?php

namespace App\Service\Collab;

use RuntimeException;

/**
 * COLLAB_SECRET is missing or too short, so live editing is switched off.
 */
class CollabNotConfiguredException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Live editing is not configured: COLLAB_SECRET must be at least 32 bytes long.');
    }
}
