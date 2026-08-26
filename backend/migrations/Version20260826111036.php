<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Let a comment section be a rated one.
 *
 * type defaults to 'discussion', so every existing section keeps behaving exactly as it does
 * today and this migration changes nothing on its own - which sections carry stars is an
 * admin decision made afterwards, per category.
 *
 * The scale labels are what 1 and 5 mean on that section, e.g. "licht" and "zwaar". A bare
 * 1-5 does not say which direction is good, and students would answer in both directions.
 *
 * As in Version20260826105734, doctrine:migrations:diff also proposed dropping
 * idx_9bace7e1a5e6215b on refresh_tokens(family). Removed by hand again: gesdinet v3 needs
 * that index and its mapping does not declare it, so every diff will keep proposing it.
 */
final class Version20260826111036 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add type and rating scale labels to comment_category';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE comment_category ADD type VARCHAR(16) DEFAULT \'discussion\' NOT NULL');
        $this->addSql('ALTER TABLE comment_category ADD rating_low_label_nl VARCHAR(40) DEFAULT NULL');
        $this->addSql('ALTER TABLE comment_category ADD rating_low_label_en VARCHAR(40) DEFAULT NULL');
        $this->addSql('ALTER TABLE comment_category ADD rating_high_label_nl VARCHAR(40) DEFAULT NULL');
        $this->addSql('ALTER TABLE comment_category ADD rating_high_label_en VARCHAR(40) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE comment_category DROP type');
        $this->addSql('ALTER TABLE comment_category DROP rating_low_label_nl');
        $this->addSql('ALTER TABLE comment_category DROP rating_low_label_en');
        $this->addSql('ALTER TABLE comment_category DROP rating_high_label_nl');
        $this->addSql('ALTER TABLE comment_category DROP rating_high_label_en');
    }
}
