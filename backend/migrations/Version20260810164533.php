<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Store the Dutch and English course titles side by side.
 *
 * KU Leuven publishes both for essentially every course (86 of 86 in Master of Materials
 * Engineering, 79 of them differing), but Course had a single `name` column filled from whichever
 * language the programme was imported in. Because 66 courses belong to more than one programme,
 * importing a Dutch programme silently renamed the same course inside an English-taught one.
 *
 * Deliberately not backfilled: the stored `name` came from an import language this migration cannot
 * recover per course, and guessing would write a Dutch title into name_en. They stay NULL and
 * Course::getLocalizedName() falls back to `name`, so nothing regresses — re-import each programme
 * to populate them.
 */
final class Version20260810164533 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add course.name_nl and course.name_en so a shared course keeps both titles';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE course ADD COLUMN IF NOT EXISTS name_nl VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE course ADD COLUMN IF NOT EXISTS name_en VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE course DROP COLUMN IF EXISTS name_nl');
        $this->addSql('ALTER TABLE course DROP COLUMN IF EXISTS name_en');
    }
}
