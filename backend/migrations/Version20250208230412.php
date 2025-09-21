<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250208230412 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE user_document_view (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, document_id INT NOT NULL, last_viewed DATETIME NOT NULL, INDEX IDX_B7C78A4DA76ED395 (user_id), INDEX IDX_B7C78A4DC33F7837 (document_id), INDEX IDX_B7C78A4D7D8F9BDE (last_viewed), UNIQUE INDEX UNIQ_B7C78A4DA76ED395C33F7837 (user_id, document_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DA76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DC33F7837 FOREIGN KEY (document_id) REFERENCES document (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE user_document_view DROP FOREIGN KEY FK_B7C78A4DA76ED395');
        $this->addSql('ALTER TABLE user_document_view DROP FOREIGN KEY FK_B7C78A4DC33F7837');
        $this->addSql('DROP TABLE user_document_view');
    }
}
