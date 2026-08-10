<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Restore the refresh_tokens.family / family_valid columns.
 *
 * These are mapped by gesdinet/jwt-refresh-token-bundle v3 through its XML mapped-superclass, not
 * by any attribute in this codebase, which is why they read as "unused" — but Doctrine selects them
 * on every refresh-token query, so without them /api/auth/token/refresh fails with
 * "column t0.family does not exist".
 *
 * They were introduced by Version20260809111922, which was folded into Version20260809172758 when
 * the pending migrations were consolidated, and then removed from that file again in e6b4fbd. The
 * net effect was that no migration created them any more, while environments that had already run
 * the original migration kept them — so the breakage only showed on a database migrated after the
 * consolidation (production), never locally.
 *
 * Written with IF NOT EXISTS because those two states legitimately coexist: databases migrated
 * before the consolidation already have the columns, databases migrated after it do not.
 */
final class Version20260810090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Restore refresh_tokens.family and family_valid (required by gesdinet v3)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family VARCHAR(32) DEFAULT NULL');
        $this->addSql('ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family_valid TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_9bace7e1a5e6215b ON refresh_tokens (family)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_9bace7e1a5e6215b');
        $this->addSql('ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS family');
        $this->addSql('ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS family_valid');
    }
}
