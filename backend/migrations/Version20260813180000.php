<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add type column to faq_question table to distinguish general FAQ questions
 * from exercise session issues, course complaints, and exam feedback.
 */
final class Version20260813180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add type column to faq_question for category classification';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE faq_question ADD type VARCHAR(30) DEFAULT 'general_faq' NOT NULL");
        $this->addSql('CREATE INDEX IDX_faq_question_type ON faq_question (type)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS IDX_faq_question_type');
        $this->addSql('ALTER TABLE faq_question DROP COLUMN IF EXISTS type');
    }
}
