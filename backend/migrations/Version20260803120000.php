<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260803120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add fluxus_sub and sso_roles to burgieclan_user for the VTK SSO login';
    }

    public function up(Schema $schema): void
    {
        // The existing `roles` column keeps its data and becomes the local overrides;
        // `sso_roles` holds what VTK granted on the last successful userinfo call.
        $this->addSql("ALTER TABLE burgieclan_user ADD sso_roles JSON DEFAULT '[]' NOT NULL");
        $this->addSql('ALTER TABLE burgieclan_user ADD fluxus_sub VARCHAR(255) DEFAULT NULL');
        // Doctrine's own name for this unique constraint; using anything else leaves
        // doctrine:schema:validate permanently out of sync.
        $this->addSql('CREATE UNIQUE INDEX UNIQ_229371DD6FA32D1E ON burgieclan_user (fluxus_sub)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_229371DD6FA32D1E');
        $this->addSql('ALTER TABLE burgieclan_user DROP fluxus_sub');
        $this->addSql('ALTER TABLE burgieclan_user DROP sso_roles');
    }
}
