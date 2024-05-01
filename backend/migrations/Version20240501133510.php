<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240501133510 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB75780A76ED395');
        $this->addSql('DROP INDEX IDX_9CB75780A76ED395 ON course_comment');
        $this->addSql('ALTER TABLE course_comment CHANGE user_id creator_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578061220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id)');
        $this->addSql('CREATE INDEX IDX_9CB7578061220EA6 ON course_comment (creator_id)');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A76A76ED395');
        $this->addSql('DROP INDEX IDX_D8698A76A76ED395 ON document');
        $this->addSql('ALTER TABLE document CHANGE user_id creator_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7661220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id)');
        $this->addSql('CREATE INDEX IDX_D8698A7661220EA6 ON document (creator_id)');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B0A76ED395');
        $this->addSql('DROP INDEX IDX_301BF4B0A76ED395 ON document_comment');
        $this->addSql('ALTER TABLE document_comment CHANGE user_id creator_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B061220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id)');
        $this->addSql('CREATE INDEX IDX_301BF4B061220EA6 ON document_comment (creator_id)');
        $this->addSql('ALTER TABLE notification DROP FOREIGN KEY FK_BF5476CAA76ED395');
        $this->addSql('DROP INDEX IDX_BF5476CAA76ED395 ON notification');
        $this->addSql('ALTER TABLE notification CHANGE user_id creator_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CA61220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id)');
        $this->addSql('CREATE INDEX IDX_BF5476CA61220EA6 ON notification (creator_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7661220EA6');
        $this->addSql('DROP INDEX IDX_D8698A7661220EA6 ON document');
        $this->addSql('ALTER TABLE document CHANGE creator_id user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A76A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_D8698A76A76ED395 ON document (user_id)');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B061220EA6');
        $this->addSql('DROP INDEX IDX_301BF4B061220EA6 ON document_comment');
        $this->addSql('ALTER TABLE document_comment CHANGE creator_id user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B0A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_301BF4B0A76ED395 ON document_comment (user_id)');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578061220EA6');
        $this->addSql('DROP INDEX IDX_9CB7578061220EA6 ON course_comment');
        $this->addSql('ALTER TABLE course_comment CHANGE creator_id user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_9CB75780A76ED395 ON course_comment (user_id)');
        $this->addSql('ALTER TABLE notification DROP FOREIGN KEY FK_BF5476CA61220EA6');
        $this->addSql('DROP INDEX IDX_BF5476CA61220EA6 ON notification');
        $this->addSql('ALTER TABLE notification CHANGE creator_id user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE notification ADD CONSTRAINT FK_BF5476CAA76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_BF5476CAA76ED395 ON notification (user_id)');
    }
}
