<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240305092054 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE document_comment (id INT AUTO_INCREMENT NOT NULL, user_id INT DEFAULT NULL, document_id INT NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, content LONGTEXT NOT NULL, INDEX IDX_301BF4B0A76ED395 (user_id), INDEX IDX_301BF4B0C33F7837 (document_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B0A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id)');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B0C33F7837 FOREIGN KEY (document_id) REFERENCES document (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B0A76ED395');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B0C33F7837');
        $this->addSql('DROP TABLE document_comment');
    }
}
