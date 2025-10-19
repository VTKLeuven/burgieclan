<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250921125258 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE course_comment_vote (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, course_comment_id INT NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, vote_type INT NOT NULL, INDEX IDX_FDEC5F7561220EA6 (creator_id), INDEX IDX_FDEC5F75278B3390 (course_comment_id), UNIQUE INDEX unique_user_vote_per_course_comment (creator_id, course_comment_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document_comment_vote (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, document_comment_id INT NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, vote_type INT NOT NULL, INDEX IDX_D1C306F961220EA6 (creator_id), INDEX IDX_D1C306F959AAD645 (document_comment_id), UNIQUE INDEX unique_user_vote_per_document_comment (creator_id, document_comment_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document_vote (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, document_id INT NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, vote_type INT NOT NULL, INDEX IDX_FDA409F761220EA6 (creator_id), INDEX IDX_FDA409F7C33F7837 (document_id), UNIQUE INDEX unique_user_vote_per_document (creator_id, document_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F7561220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F75278B3390 FOREIGN KEY (course_comment_id) REFERENCES course_comment (id)');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F961220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F959AAD645 FOREIGN KEY (document_comment_id) REFERENCES document_comment (id)');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F761220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F7C33F7837 FOREIGN KEY (document_id) REFERENCES document (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F7561220EA6');
        $this->addSql('ALTER TABLE course_comment_vote DROP FOREIGN KEY FK_FDEC5F75278B3390');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F961220EA6');
        $this->addSql('ALTER TABLE document_comment_vote DROP FOREIGN KEY FK_D1C306F959AAD645');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F761220EA6');
        $this->addSql('ALTER TABLE document_vote DROP FOREIGN KEY FK_FDA409F7C33F7837');
        $this->addSql('DROP TABLE course_comment_vote');
        $this->addSql('DROP TABLE document_comment_vote');
        $this->addSql('DROP TABLE document_vote');
    }
}
