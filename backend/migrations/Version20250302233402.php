<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250302233402 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE course_identical_courses (course_source INT NOT NULL, course_target INT NOT NULL, INDEX IDX_9A81ADB8F1B2BE3E (course_source), INDEX IDX_9A81ADB8E857EEB1 (course_target), PRIMARY KEY(course_source, course_target)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE course_identical_courses ADD CONSTRAINT FK_9A81ADB8F1B2BE3E FOREIGN KEY (course_source) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_identical_courses ADD CONSTRAINT FK_9A81ADB8E857EEB1 FOREIGN KEY (course_target) REFERENCES course (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_identical_courses DROP FOREIGN KEY FK_9A81ADB8F1B2BE3E');
        $this->addSql('ALTER TABLE course_identical_courses DROP FOREIGN KEY FK_9A81ADB8E857EEB1');
        $this->addSql('DROP TABLE course_identical_courses');
    }
}
