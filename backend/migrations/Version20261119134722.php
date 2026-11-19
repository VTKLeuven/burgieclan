<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261119134722 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Course names in the course\'s own language of instruction, as the onderwijsaanbod lists them';
    }

    public function up(Schema $schema): void
    {
        // `name` used to hold the title in the language the programme was imported in. Courses
        // with a stored title in their own language get that one; the rest keep what they had.
        $this->addSql("UPDATE course SET name = name_en WHERE language = 'en' AND COALESCE(name_en, '') <> ''");
        $this->addSql("UPDATE course SET name = name_nl WHERE language = 'nl' AND COALESCE(name_nl, '') <> ''");
    }

    public function down(Schema $schema): void
    {
        // Data only: the previous names depended on import order and cannot be reconstructed.
    }
}
