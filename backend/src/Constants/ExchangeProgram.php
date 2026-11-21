<?php

namespace App\Constants;

/**
 * The faculty's master's programmes, as students name them, for exchange destinations and reports.
 *
 * Only the code is stored; the frontend translates it. The labels here are for the admin.
 */
enum ExchangeProgram: string
{
    case ARCH = 'ARCH';
    case AI = 'AI';
    case BMT = 'BMT';
    case BWK = 'BWK';
    case CIT = 'CIT';
    case CW = 'CW';
    case ELT = 'ELT';
    case ENE = 'ENE';
    case MTK = 'MTK';
    case MSCE = 'MSCE';
    case NANO = 'NANO';
    case WIT = 'WIT';
    case WTK = 'WTK';

    public function label(): string
    {
        return match ($this) {
            self::ARCH => 'Architectuur',
            self::AI => 'Artificiële intelligentie',
            self::BMT => 'Biomedische technologie',
            self::BWK => 'Bouwkunde',
            self::CIT => 'Chemische technologie',
            self::CW => 'Computerwetenschappen',
            self::ELT => 'Elektrotechniek',
            self::ENE => 'Energie',
            self::MTK => 'Materiaalkunde',
            self::MSCE => 'Mobility and Supply Chain Engineering',
            self::NANO => 'Nanotechnologie',
            self::WIT => 'Wiskundige ingenieurstechnieken',
            self::WTK => 'Werktuigkunde',
        };
    }

    /**
     * label => code, for an EasyAdmin ChoiceField.
     *
     * @return array<string, string>
     */
    public static function choices(): array
    {
        $choices = [];
        foreach (self::cases() as $case) {
            $choices[sprintf('%s (%s)', $case->label(), $case->value)] = $case->value;
        }

        return $choices;
    }
}
