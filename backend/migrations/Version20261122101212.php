<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * ATHENS: each course's page on the ATHENS registration platform and whether it is on the list of
 * the session open there now. Filled in by `app:exchange:import-athens` from register.json.
 */
final class Version20261122101212 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'ATHENS courses: link and information from the registration platform';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE athens_course ADD register_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE athens_course ADD register_info JSONB DEFAULT NULL');
        $this->addSql('ALTER TABLE athens_course ADD on_register BOOLEAN DEFAULT false NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE athens_course DROP register_id');
        $this->addSql('ALTER TABLE athens_course DROP register_info');
        $this->addSql('ALTER TABLE athens_course DROP on_register');
    }
}
