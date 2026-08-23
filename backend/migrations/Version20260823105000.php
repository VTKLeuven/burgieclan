<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Adds document.author to store verified student author / creator names.
 */
final class Version20260823105000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add document.author to preserve student author credits';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE document ADD author VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE document DROP author');
    }
}
