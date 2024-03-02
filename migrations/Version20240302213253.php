<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240302213253 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE course_comment (id INT AUTO_INCREMENT NOT NULL, user_id INT DEFAULT NULL, course_id INT NOT NULL, category_id INT NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, content LONGTEXT NOT NULL, INDEX IDX_9CB75780A76ED395 (user_id), INDEX IDX_9CB75780591CC992 (course_id), INDEX IDX_9CB7578012469DE2 (category_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id)');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780591CC992 FOREIGN KEY (course_id) REFERENCES burgieclan_course (id)');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578012469DE2 FOREIGN KEY (category_id) REFERENCES comment_category (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB75780A76ED395');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB75780591CC992');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578012469DE2');
        $this->addSql('DROP TABLE course_comment');
    }
}
