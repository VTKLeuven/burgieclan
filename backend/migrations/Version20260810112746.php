<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260810112746 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Move the mandatory flag from course onto module.courses_mandatory';
    }

    public function up(Schema $schema): void
    {
        // Whether the courses of a module are compulsory belongs on the module, not on Course.
        //
        // KU Leuven flags each course entry, but the value never varies inside a group (0 of 193
        // course-holding groups in ten engineering programmes had mixed values), while the same
        // course *does* differ between programmes (67 of 172 shared courses). Course is a single
        // shared row, so storing it there let the last import win; Module is programme-scoped since
        // its kul_id carries the programId.
        //
        // Distinct from is_elective: a type=01 "Optie" group can hold compulsory courses and a
        // type=02 "Groep" can hold optional ones.
        $this->addSql('ALTER TABLE course DROP COLUMN IF EXISTS mandatory');
        $this->addSql('ALTER TABLE module ADD COLUMN IF NOT EXISTS courses_mandatory BOOLEAN DEFAULT true NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE module DROP COLUMN IF EXISTS courses_mandatory');
        $this->addSql('ALTER TABLE course ADD COLUMN IF NOT EXISTS mandatory BOOLEAN DEFAULT true NOT NULL');
    }
}
