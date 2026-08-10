<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Namespace imported Module.kul_id values with the KU Leuven programId they belong to.
 *
 * KU Leuven reuses a moduleGroupId across programmes (76 of 1696 in a full scan of the pg index),
 * and the importer matches modules on kul_id alone, so importing programme B could grab programme
 * A's module and re-parent it. Prefixing the id with the programme makes the match unambiguous.
 *
 * Only bare ids are rewritten. Synthetic ids already carry their own prefix and a colon
 * ("sem:...", "keuzepakket:...", "keuzepakketten:..."), so the NOT LIKE '%:%' guard skips them.
 *
 * Nested modules have no program_id of their own — the column is only set on the top level — so
 * the owning programme is found by walking module_module down from the roots.
 *
 * Known limitation: a module currently shared by two programmes can only be given one prefix here.
 * The next import of the other programme creates its own copy, which is the intended end state;
 * the leftover is harmless but will need removing by hand.
 */
final class Version20260809182857 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Prefix imported module.kul_id with the KU Leuven programId';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            <<<'SQL'
            WITH RECURSIVE tree AS (
                SELECT m.id, p.kul_id AS prog
                FROM module m
                JOIN program p ON p.id = m.program_id
                WHERE m.kul_id IS NOT NULL AND p.kul_id IS NOT NULL
                UNION
                SELECT c.id, t.prog
                FROM tree t
                JOIN module_module mm ON mm.module_source = t.id
                JOIN module c ON c.id = mm.module_target
                WHERE c.kul_id IS NOT NULL
            )
            UPDATE module m
            SET kul_id = t.prog || ':' || m.kul_id
            FROM tree t
            WHERE m.id = t.id
              AND m.kul_id NOT LIKE '%:%'
            SQL
        );
    }

    public function down(Schema $schema): void
    {
        // Strip a leading "<digits>:" again. Synthetic ids start with a word prefix
        // ("sem:", "keuzepakket:"), so the digit anchor leaves them untouched.
        $this->addSql(
            <<<'SQL'
            UPDATE module
            SET kul_id = substring(kul_id from position(':' in kul_id) + 1)
            WHERE kul_id ~ '^[0-9]+:'
            SQL
        );
    }
}
