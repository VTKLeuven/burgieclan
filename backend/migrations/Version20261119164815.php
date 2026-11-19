<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261119164815 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course ADD parts JSON DEFAULT \'[]\' NOT NULL');
        $this->addSql('ALTER TABLE document ADD parts JSON DEFAULT \'[]\' NOT NULL');
        $this->addSql('ALTER TABLE tag ADD hidden BOOLEAN DEFAULT false NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course DROP parts');
        $this->addSql('ALTER TABLE document DROP parts');
        $this->addSql('ALTER TABLE tag DROP hidden');
    }
}
