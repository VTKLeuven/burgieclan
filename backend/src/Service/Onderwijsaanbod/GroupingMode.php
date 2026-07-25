<?php

namespace App\Service\Onderwijsaanbod;

/**
 * How the KU Leuven programme tree is turned into our Module hierarchy on import.
 */
enum GroupingMode: string
{
    /** Mirror KU Leuven's named module groups (e.g. "Wiskunde", "Informatie"). */
    case Named = 'named';

    /** Group courses by study stage / year ("Fase 1", "Fase 2", "Fase 3"). */
    case Stage = 'stage';
}
