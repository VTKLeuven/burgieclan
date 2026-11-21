<?php

namespace App\Constants;

/**
 * The parts of an exchange report. A report fills in any of them; the destination page shows
 * what everyone wrote about one topic together.
 */
enum ExchangeTopic: string
{
    case GENERAL = 'general';
    case EDUCATION = 'education';
    case HOUSING = 'housing';
    case LIFE = 'life';
    case TRANSPORT = 'transport';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::GENERAL => 'Algemeen',
            self::EDUCATION => 'Onderwijs',
            self::HOUSING => 'Wonen',
            self::LIFE => 'Leven',
            self::TRANSPORT => 'Transport',
            self::OTHER => 'Andere',
        };
    }
}
