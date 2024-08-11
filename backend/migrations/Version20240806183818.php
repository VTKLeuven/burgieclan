<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240806183818 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE course_comment_vote (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, comment_id INT NOT NULL, is_upvote TINYINT(1) NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, INDEX IDX_FDEC5F7561220EA6 (creator_id), INDEX IDX_FDEC5F75F8697D13 (comment_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document_comment_vote (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, comment_id INT NOT NULL, is_upvote TINYINT(1) NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, INDEX IDX_D1C306F961220EA6 (creator_id), INDEX IDX_D1C306F9F8697D13 (comment_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document_vote (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, document_id INT NOT NULL, is_upvote TINYINT(1) NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, INDEX IDX_FDA409F761220EA6 (creator_id), INDEX IDX_FDA409F7C33F7837 (document_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F7561220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id)');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F75F8697D13 FOREIGN KEY (comment_id) REFERENCES course_comment (id)');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F961220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id)');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F9F8697D13 FOREIGN KEY (comment_id) REFERENCES document_comment (id)');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F761220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id)');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F7C33F7837 FOREIGN KEY (document_id) REFERENCES document (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F7561220EA6');
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F75F8697D13');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F961220EA6');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F9F8697D13');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F761220EA6');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F7C33F7837');
        $this->addSql('DROP TABLE course_comment_vote');
        $this->addSql('DROP TABLE document_comment_vote');
        $this->addSql('DROP TABLE document_vote');
    }
}
