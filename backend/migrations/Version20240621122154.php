<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240621122154 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE module_module (module_source INT NOT NULL, module_target INT NOT NULL, INDEX IDX_A6276607F5893F5C (module_source), INDEX IDX_A6276607EC6C6FD3 (module_target), PRIMARY KEY(module_source, module_target)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE module_module ADD CONSTRAINT FK_A6276607F5893F5C FOREIGN KEY (module_source) REFERENCES module (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module_module ADD CONSTRAINT FK_A6276607EC6C6FD3 FOREIGN KEY (module_target) REFERENCES module (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE module_module DROP FOREIGN KEY FK_A6276607F5893F5C');
        $this->addSql('ALTER TABLE module_module DROP FOREIGN KEY FK_A6276607EC6C6FD3');
        $this->addSql('DROP TABLE module_module');
    }
}
