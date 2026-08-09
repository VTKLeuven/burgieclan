<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260809111922 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE refresh_tokens ADD family VARCHAR(32) DEFAULT NULL');
        $this->addSql('ALTER TABLE refresh_tokens ADD family_valid TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_9BACE7E1A5E6215B ON refresh_tokens (family)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP INDEX IDX_9BACE7E1A5E6215B');
        $this->addSql('ALTER TABLE refresh_tokens DROP family');
        $this->addSql('ALTER TABLE refresh_tokens DROP family_valid');
    }
}
