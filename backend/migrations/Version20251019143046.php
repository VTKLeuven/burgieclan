<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251019143046 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE announcement DROP FOREIGN KEY FK_4DB9D91C61220EA6');
        $this->addSql('ALTER TABLE announcement ADD CONSTRAINT FK_4DB9D91C61220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578061220EA6');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F75278B3390');
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F7561220EA6');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F75278B3390 FOREIGN KEY (course_comment_id) REFERENCES course_comment (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F7561220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7661220EA6');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7661220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B061220EA6');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F959AAD645');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F961220EA6');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F959AAD645 FOREIGN KEY (document_comment_id) REFERENCES document_comment (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F961220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F761220EA6');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F7C33F7837');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F761220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F7C33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_document_view DROP FOREIGN KEY FK_B7C78A4DA76ED395');
        $this->addSql('ALTER TABLE user_document_view DROP FOREIGN KEY FK_B7C78A4DC33F7837');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE announcement DROP FOREIGN KEY FK_4DB9D91C61220EA6');
        $this->addSql('ALTER TABLE announcement ADD CONSTRAINT FK_4DB9D91C61220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578061220EA6');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F7561220EA6');
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F75278B3390');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F7561220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F75278B3390 FOREIGN KEY (course_comment_id) REFERENCES course_comment (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7661220EA6');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7661220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B061220EA6');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F961220EA6');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F959AAD645');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F961220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F959AAD645 FOREIGN KEY (document_comment_id) REFERENCES document_comment (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F761220EA6');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F7C33F7837');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F761220EA6 FOREIGN KEY (creator_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F7C33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE user_document_view DROP FOREIGN KEY FK_B7C78A4DA76ED395');
        $this->addSql('ALTER TABLE user_document_view DROP FOREIGN KEY FK_B7C78A4DC33F7837');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
    }
}
