<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240217212146 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE burgieclan_course (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, modules LONGTEXT DEFAULT NULL COMMENT \'(DC2Type:array)\', professors LONGTEXT DEFAULT NULL COMMENT \'(DC2Type:array)\', semesters LONGTEXT DEFAULT NULL COMMENT \'(DC2Type:array)\', code VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_4B01B9EC77153098 (code), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE course_course (course_source INT NOT NULL, course_target INT NOT NULL, INDEX IDX_B8A6AEF4F1B2BE3E (course_source), INDEX IDX_B8A6AEF4E857EEB1 (course_target), PRIMARY KEY(course_source, course_target)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4F1B2BE3E FOREIGN KEY (course_source) REFERENCES burgieclan_course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4E857EEB1 FOREIGN KEY (course_target) REFERENCES burgieclan_course (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4F1B2BE3E');
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4E857EEB1');
        $this->addSql('DROP TABLE burgieclan_course');
        $this->addSql('DROP TABLE course_course');
    }
}
