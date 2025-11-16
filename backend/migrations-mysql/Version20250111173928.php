<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250111173928 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE page ADD name_en VARCHAR(255) DEFAULT NULL, ADD content_en LONGTEXT DEFAULT NULL, CHANGE name name_nl VARCHAR(255) NOT NULL, CHANGE content content_nl LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE page ADD content LONGTEXT DEFAULT NULL, DROP content_nl, DROP name_en, DROP content_en, CHANGE name_nl name VARCHAR(255) NOT NULL');
    }
}
