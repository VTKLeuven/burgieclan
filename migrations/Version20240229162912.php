<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240229162912 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_comment CHANGE id id INT NOT NULL');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780BF396750 FOREIGN KEY (id) REFERENCES node (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE node ADD discr VARCHAR(255) NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB75780BF396750');
        $this->addSql('ALTER TABLE course_comment CHANGE id id INT AUTO_INCREMENT NOT NULL');
        $this->addSql('ALTER TABLE node DROP discr');
    }
}
