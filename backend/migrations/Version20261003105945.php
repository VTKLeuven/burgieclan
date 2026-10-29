<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Exam reconstructions (phase 2c): a trigram index for searching the text of exam questions.
 *
 * Search matches LOWER(text) LIKE '%term%', which a plain index cannot serve; a GIN trigram index
 * on that same expression can. Written here by hand, inside a skeleton from migrations:generate:
 * Doctrine's mapping has no way to express such an index, so migrations:diff can neither create
 * it nor, it turns out, see it, and does not propose dropping it either.
 *
 * pg_trgm is a trusted extension (PostgreSQL 13+), so the database owner can create it.
 */
final class Version20261003105945 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Trigram index for searching exam questions';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        $this->addSql('CREATE INDEX idx_exam_question_text_trgm ON exam_question USING gin (lower(text) gin_trgm_ops)');
    }

    public function down(Schema $schema): void
    {
        // The extension stays: dropping it would break anything else that came to rely on it.
        $this->addSql('DROP INDEX idx_exam_question_text_trgm');
    }
}
