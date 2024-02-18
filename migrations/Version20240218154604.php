<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240218154604 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE burgieclan_course CHANGE modules modules JSON DEFAULT NULL, CHANGE professors professors JSON DEFAULT NULL, CHANGE semesters semesters JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE burgieclan_course CHANGE modules modules LONGTEXT DEFAULT NULL COMMENT \'(DC2Type:array)\', CHANGE professors professors LONGTEXT DEFAULT NULL COMMENT \'(DC2Type:array)\', CHANGE semesters semesters LONGTEXT DEFAULT NULL COMMENT \'(DC2Type:array)\'');
    }
}
