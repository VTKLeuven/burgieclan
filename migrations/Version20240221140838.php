<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240221140838 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE module (id INT AUTO_INCREMENT NOT NULL, program_id INT NOT NULL, name VARCHAR(255) NOT NULL, INDEX IDX_C2426283EB8070A (program_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE module_course (module_id INT NOT NULL, course_id INT NOT NULL, INDEX IDX_BC9D2F96AFC2B591 (module_id), INDEX IDX_BC9D2F96591CC992 (course_id), PRIMARY KEY(module_id, course_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE program (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE module ADD CONSTRAINT FK_C2426283EB8070A FOREIGN KEY (program_id) REFERENCES program (id)');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96AFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96591CC992 FOREIGN KEY (course_id) REFERENCES burgieclan_course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE burgieclan_course DROP modules');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE module DROP FOREIGN KEY FK_C2426283EB8070A');
        $this->addSql('ALTER TABLE module_course DROP FOREIGN KEY FK_BC9D2F96AFC2B591');
        $this->addSql('ALTER TABLE module_course DROP FOREIGN KEY FK_BC9D2F96591CC992');
        $this->addSql('DROP TABLE module');
        $this->addSql('DROP TABLE module_course');
        $this->addSql('DROP TABLE program');
        $this->addSql('ALTER TABLE burgieclan_course ADD modules JSON DEFAULT NULL');
    }
}
