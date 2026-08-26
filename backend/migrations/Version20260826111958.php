<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Make comment_category.name_en actually required.
 *
 * The column was nullable but carried Assert\NotBlank, so a category without an English name
 * was rejected by the validator while the database was happy to hold one. The constraint was
 * the honest half of that pair, so the column follows it.
 *
 * This dev database has no null or empty English names, but production may, so they are
 * backfilled from the Dutch name first - a Dutch label is a far better outcome than a failed
 * deploy, and it is what getName() already falls back to at runtime anyway.
 */
final class Version20260826111958 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make comment_category.name_en non-nullable';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE comment_category SET name_en = name_nl WHERE name_en IS NULL OR name_en = ''");
        $this->addSql('ALTER TABLE comment_category ALTER name_en SET NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE comment_category ALTER name_en DROP NOT NULL');
    }
}
