<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Give Program its own language column.
 *
 * The language was previously only readable out of the import_settings JSON blob, which is the
 * import *parameter* (which language to fetch from KU Leuven). It is now also a property of the
 * programme itself, because the curriculum navigator renders course titles in it on every page
 * load and that should not depend on parsing a settings blob.
 */
final class Version20260814000228 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add program.language, backfilled from import_settings->>lang';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE program ADD language VARCHAR(2) DEFAULT \'nl\' NOT NULL');

        // Backfill: everything already imported as English keeps its English titles. Anything else
        // (including manually created programmes with no import settings) takes the 'nl' default.
        $this->addSql('UPDATE program SET language = \'en\' WHERE import_settings->>\'lang\' = \'en\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE program DROP language');
    }
}
