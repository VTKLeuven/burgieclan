<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20241003142150 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE document_category ADD parent_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE document_category ADD CONSTRAINT FK_898DE898727ACA70 FOREIGN KEY (parent_id) REFERENCES document_category (id)');
        $this->addSql('CREATE INDEX IDX_898DE898727ACA70 ON document_category (parent_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE document_category DROP FOREIGN KEY FK_898DE898727ACA70');
        $this->addSql('DROP INDEX IDX_898DE898727ACA70 ON document_category');
        $this->addSql('ALTER TABLE document_category DROP parent_id');
    }
}
