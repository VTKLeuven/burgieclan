<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add nullable kul_id columns to program and module so structures imported from the
 * KU Leuven onderwijsaanbod data services can be matched on re-import without duplicating.
 * program.kul_id is unique (one program per KU Leuven programId); module.kul_id is indexed
 * but not unique and matching is scoped per-program in application code.
 */
final class Version20260725120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add kul_id to program and module for onderwijsaanbod import matching';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE program ADD kul_id VARCHAR(255) DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_program_kul_id ON program (kul_id)');

        $this->addSql('ALTER TABLE module ADD kul_id VARCHAR(255) DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_module_kul_id ON module (kul_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_program_kul_id');
        $this->addSql('ALTER TABLE program DROP kul_id');

        $this->addSql('DROP INDEX idx_module_kul_id');
        $this->addSql('ALTER TABLE module DROP kul_id');
    }
}
