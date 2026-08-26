<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Give course comments the academic year they describe.
 *
 * Distinct from created_at: a comment migrated from the old course wiki was written years
 * before it was imported, so the timestamp says when it arrived, not which year it is about.
 * Nullable, because the wiki could not always be read for a year.
 *
 * doctrine:migrations:diff also wanted to DROP INDEX idx_9bace7e1a5e6215b on
 * refresh_tokens(family) here. That drop was removed by hand: Version20260810090000 creates
 * that index on purpose because gesdinet v3 queries the column, and the bundle's mapping
 * simply does not declare the index, so every diff proposes dropping it. Do not let it back in.
 */
final class Version20260826105734 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add academic_year to course_comment';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE course_comment ADD academic_year VARCHAR(11) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE course_comment DROP academic_year');
    }
}
