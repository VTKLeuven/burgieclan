<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Adds document.seafile_file_id, the resume key for the Seafile import.
 *
 * Unique per (file, course) rather than per file: the same Seafile file can
 * legitimately belong to two courses, and 170 of the migrated files do, so a
 * global unique index would reject the second copy mid-import.
 *
 * Nullable, because documents uploaded through the app have no Seafile origin;
 * Postgres permits many nulls in a unique index.
 */
final class Version20260823101440 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add document.seafile_file_id as the Seafile import resume key';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE document ADD seafile_file_id VARCHAR(40) DEFAULT NULL');
        $this->addSql(
            'CREATE UNIQUE INDEX uniq_document_seafile_file_id_course ON document (seafile_file_id, course_id)'
        );
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP INDEX uniq_document_seafile_file_id_course');
        $this->addSql('ALTER TABLE document DROP seafile_file_id');
    }
}
