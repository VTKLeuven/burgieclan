<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260411183148 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        // Tables with existing create_date/update_date columns - migrate data
        $this->addSql('ALTER TABLE announcement ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE announcement ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE announcement SET created_at = create_date, updated_at = update_date');
        $this->addSql('ALTER TABLE announcement ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE announcement ALTER COLUMN updated_at SET NOT NULL');
        $this->addSql('ALTER TABLE announcement DROP create_date');
        $this->addSql('ALTER TABLE announcement DROP update_date');

        $this->addSql('ALTER TABLE burgieclan_user ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE burgieclan_user ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE burgieclan_user SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE burgieclan_user ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE burgieclan_user ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE comment_category ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE comment_category ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE comment_category SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE comment_category ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE comment_category ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE course ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE course ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE course SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE course ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE course ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE course_comment ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE course_comment ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE course_comment SET created_at = create_date, updated_at = update_date');
        $this->addSql('ALTER TABLE course_comment ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment ALTER COLUMN updated_at SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment DROP create_date');
        $this->addSql('ALTER TABLE course_comment DROP update_date');

        $this->addSql('ALTER TABLE course_comment_vote ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE course_comment_vote ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE course_comment_vote SET created_at = create_date, updated_at = update_date');
        $this->addSql('ALTER TABLE course_comment_vote ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment_vote ALTER COLUMN updated_at SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment_vote DROP create_date');
        $this->addSql('ALTER TABLE course_comment_vote DROP update_date');

        $this->addSql('ALTER TABLE document ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document SET created_at = create_date, updated_at = update_date');
        $this->addSql('ALTER TABLE document ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE document ALTER COLUMN updated_at SET NOT NULL');
        $this->addSql('ALTER TABLE document DROP create_date');
        $this->addSql('ALTER TABLE document DROP update_date');

        $this->addSql('ALTER TABLE document_category ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document_category ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document_category SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE document_category ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE document_category ALTER COLUMN updated_at SET NOT NULL');


        $this->addSql('ALTER TABLE document_comment ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document_comment ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document_comment SET created_at = create_date, updated_at = update_date');
        $this->addSql('ALTER TABLE document_comment ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment ALTER COLUMN updated_at SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment DROP create_date');
        $this->addSql('ALTER TABLE document_comment DROP update_date');

        $this->addSql('ALTER TABLE document_comment_vote ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document_comment_vote ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document_comment_vote SET created_at = create_date, updated_at = update_date');
        $this->addSql('ALTER TABLE document_comment_vote ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment_vote ALTER COLUMN updated_at SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment_vote DROP create_date');
        $this->addSql('ALTER TABLE document_comment_vote DROP update_date');

        $this->addSql('ALTER TABLE document_vote ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document_vote ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document_vote SET created_at = create_date, updated_at = update_date');
        $this->addSql('ALTER TABLE document_vote ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE document_vote ALTER COLUMN updated_at SET NOT NULL');
        $this->addSql('ALTER TABLE document_vote DROP create_date');
        $this->addSql('ALTER TABLE document_vote DROP update_date');

        $this->addSql('ALTER TABLE module ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE module ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE module SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE module ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE module ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE page ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE page ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE page SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE page ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE page ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE program ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE program ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE program SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE program ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE program ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE quick_link ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE quick_link ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE quick_link SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE quick_link ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE quick_link ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE tag ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE tag ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE tag SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE tag ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE tag ALTER COLUMN updated_at SET NOT NULL');

        $this->addSql('ALTER TABLE user_document_view ADD created_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE user_document_view ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE user_document_view SET created_at = NOW(), updated_at = NOW()');
        $this->addSql('ALTER TABLE user_document_view ALTER COLUMN created_at SET NOT NULL');
        $this->addSql('ALTER TABLE user_document_view ALTER COLUMN updated_at SET NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        // Tables with existing create_date/update_date columns -> migrate data back
        // Tables without existing create_date/update_date -> just drop the new columns

        $this->addSql('ALTER TABLE announcement ADD create_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE announcement ADD update_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE announcement SET create_date = created_at, update_date = updated_at');
        $this->addSql('ALTER TABLE announcement ALTER COLUMN create_date SET NOT NULL');
        $this->addSql('ALTER TABLE announcement ALTER COLUMN update_date SET NOT NULL');
        $this->addSql('ALTER TABLE announcement DROP created_at');
        $this->addSql('ALTER TABLE announcement DROP updated_at');

        $this->addSql('ALTER TABLE burgieclan_user DROP created_at');
        $this->addSql('ALTER TABLE burgieclan_user DROP updated_at');

        $this->addSql('ALTER TABLE comment_category DROP created_at');
        $this->addSql('ALTER TABLE comment_category DROP updated_at');

        $this->addSql('ALTER TABLE course DROP created_at');
        $this->addSql('ALTER TABLE course DROP updated_at');

        $this->addSql('ALTER TABLE course_comment ADD create_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE course_comment ADD update_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE course_comment SET create_date = created_at, update_date = updated_at');
        $this->addSql('ALTER TABLE course_comment ALTER COLUMN create_date SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment ALTER COLUMN update_date SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment DROP created_at');
        $this->addSql('ALTER TABLE course_comment DROP updated_at');

        $this->addSql('ALTER TABLE course_comment_vote ADD create_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE course_comment_vote ADD update_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE course_comment_vote SET create_date = created_at, update_date = updated_at');
        $this->addSql('ALTER TABLE course_comment_vote ALTER COLUMN create_date SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment_vote ALTER COLUMN update_date SET NOT NULL');
        $this->addSql('ALTER TABLE course_comment_vote DROP created_at');
        $this->addSql('ALTER TABLE course_comment_vote DROP updated_at');

        $this->addSql('ALTER TABLE document ADD create_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document ADD update_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document SET create_date = created_at, update_date = updated_at');
        $this->addSql('ALTER TABLE document ALTER COLUMN create_date SET NOT NULL');
        $this->addSql('ALTER TABLE document ALTER COLUMN update_date SET NOT NULL');
        $this->addSql('ALTER TABLE document DROP created_at');
        $this->addSql('ALTER TABLE document DROP updated_at');

        $this->addSql('ALTER TABLE document_category DROP created_at');
        $this->addSql('ALTER TABLE document_category DROP updated_at');

        $this->addSql('ALTER TABLE document_comment ADD create_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document_comment ADD update_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document_comment SET create_date = created_at, update_date = updated_at');
        $this->addSql('ALTER TABLE document_comment ALTER COLUMN create_date SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment ALTER COLUMN update_date SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment DROP created_at');
        $this->addSql('ALTER TABLE document_comment DROP updated_at');

        $this->addSql('ALTER TABLE document_comment_vote ADD create_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document_comment_vote ADD update_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document_comment_vote SET create_date = created_at, update_date = updated_at');
        $this->addSql('ALTER TABLE document_comment_vote ALTER COLUMN create_date SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment_vote ALTER COLUMN update_date SET NOT NULL');
        $this->addSql('ALTER TABLE document_comment_vote DROP created_at');
        $this->addSql('ALTER TABLE document_comment_vote DROP updated_at');

        $this->addSql('ALTER TABLE document_vote ADD create_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('ALTER TABLE document_vote ADD update_date TIMESTAMP(0) WITHOUT TIME ZONE');
        $this->addSql('UPDATE document_vote SET create_date = created_at, update_date = updated_at');
        $this->addSql('ALTER TABLE document_vote ALTER COLUMN create_date SET NOT NULL');
        $this->addSql('ALTER TABLE document_vote ALTER COLUMN update_date SET NOT NULL');
        $this->addSql('ALTER TABLE document_vote DROP created_at');
        $this->addSql('ALTER TABLE document_vote DROP updated_at');

        $this->addSql('ALTER TABLE module DROP created_at');
        $this->addSql('ALTER TABLE module DROP updated_at');

        $this->addSql('ALTER TABLE page DROP created_at');
        $this->addSql('ALTER TABLE page DROP updated_at');

        $this->addSql('ALTER TABLE program DROP created_at');
        $this->addSql('ALTER TABLE program DROP updated_at');

        $this->addSql('ALTER TABLE quick_link DROP created_at');
        $this->addSql('ALTER TABLE quick_link DROP updated_at');

        $this->addSql('ALTER TABLE tag DROP created_at');
        $this->addSql('ALTER TABLE tag DROP updated_at');

        $this->addSql('ALTER TABLE user_document_view DROP created_at');
        $this->addSql('ALTER TABLE user_document_view DROP updated_at');
    }
}
