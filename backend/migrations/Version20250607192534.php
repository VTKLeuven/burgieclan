<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250607192534 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE tag (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_389B7835E237E06 (name), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE tag_document (tag_id INT NOT NULL, document_id INT NOT NULL, INDEX IDX_EE58F1ADBAD26311 (tag_id), INDEX IDX_EE58F1ADC33F7837 (document_id), PRIMARY KEY(tag_id, document_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE tag_document ADD CONSTRAINT FK_EE58F1ADBAD26311 FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE tag_document ADD CONSTRAINT FK_EE58F1ADC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE tag_document DROP FOREIGN KEY FK_EE58F1ADBAD26311');
        $this->addSql('ALTER TABLE tag_document DROP FOREIGN KEY FK_EE58F1ADC33F7837');
        $this->addSql('DROP TABLE tag');
        $this->addSql('DROP TABLE tag_document');
    }
}
