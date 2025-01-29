<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250129145409 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs

        //First remove all demo tables
        $this->addSql('ALTER TABLE symfony_demo_comment DROP FOREIGN KEY FK_53AD8F83F675F31B');
        $this->addSql('ALTER TABLE symfony_demo_comment DROP FOREIGN KEY FK_53AD8F834B89032C');
        $this->addSql('ALTER TABLE symfony_demo_post DROP FOREIGN KEY FK_58A92E65F675F31B');
        $this->addSql('ALTER TABLE symfony_demo_post_tag DROP FOREIGN KEY FK_6ABC1CC4BAD26311');
        $this->addSql('ALTER TABLE symfony_demo_post_tag DROP FOREIGN KEY FK_6ABC1CC44B89032C');

        $this->addSql('DROP TABLE symfony_demo_comment');
        $this->addSql('DROP TABLE symfony_demo_post');
        $this->addSql('DROP TABLE symfony_demo_post_tag');
        $this->addSql('DROP TABLE symfony_demo_tag');

        //Then rename user table
        $this->addSql('ALTER TABLE announcement DROP FOREIGN KEY FK_4DB9D91C61220EA6');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578061220EA6');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7661220EA6');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B061220EA6');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7A76ED395');
        $this->addSql('ALTER TABLE favorite_user_document DROP FOREIGN KEY FK_E50604BDA76ED395');
        $this->addSql('ALTER TABLE favorite_user_module DROP FOREIGN KEY FK_AA647856A76ED395');
        $this->addSql('ALTER TABLE favorite_user_program DROP FOREIGN KEY FK_25F66BE1A76ED395');

        $this->addSql('DROP TABLE burgieclan_user');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, full_name VARCHAR(255) NOT NULL, username VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, roles JSON NOT NULL, accesstoken JSON DEFAULT NULL, UNIQUE INDEX UNIQ_8D93D649F85E0677 (username), UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE announcement ADD CONSTRAINT FK_4DB9D91C61220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7661220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE1A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');

        //Then rename course table
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB75780591CC992');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A76591CC992');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7591CC992');
        $this->addSql('ALTER TABLE module_course DROP FOREIGN KEY FK_BC9D2F96591CC992');
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4F1B2BE3E');
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4E857EEB1');

        $this->addSql('DROP TABLE burgieclan_course');
        $this->addSql('CREATE TABLE course (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, code VARCHAR(255) NOT NULL, professors JSON DEFAULT NULL, semesters JSON DEFAULT NULL, credits INT DEFAULT NULL, UNIQUE INDEX UNIQ_169E6FB977153098 (code), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780591CC992 FOREIGN KEY (course_id) REFERENCES course (id)');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A76591CC992 FOREIGN KEY (course_id) REFERENCES course (id)');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7591CC992 FOREIGN KEY (course_id) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96591CC992 FOREIGN KEY (course_id) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4F1B2BE3E FOREIGN KEY (course_source) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4E857EEB1 FOREIGN KEY (course_target) REFERENCES course (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        
        //First restore course table
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB75780591CC992');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A76591CC992');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7591CC992');
        $this->addSql('ALTER TABLE module_course DROP FOREIGN KEY FK_BC9D2F96591CC992');
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4F1B2BE3E');
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4E857EEB1');
        
        $this->addSql('DROP TABLE course');
        $this->addSql('CREATE TABLE burgieclan_course (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, professors JSON DEFAULT NULL, semesters JSON DEFAULT NULL, code VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, credits INT DEFAULT NULL, UNIQUE INDEX UNIQ_4B01B9EC77153098 (code), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780591CC992 FOREIGN KEY (course_id) REFERENCES burgieclan_course (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A76591CC992 FOREIGN KEY (course_id) REFERENCES burgieclan_course (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7591CC992 FOREIGN KEY (course_id) REFERENCES burgieclan_course (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96591CC992 FOREIGN KEY (course_id) REFERENCES burgieclan_course (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4F1B2BE3E FOREIGN KEY (course_source) REFERENCES burgieclan_course (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4E857EEB1 FOREIGN KEY (course_target) REFERENCES burgieclan_course (id) ON UPDATE NO ACTION ON DELETE CASCADE');



        //Then restore user table
        $this->addSql('ALTER TABLE announcement DROP FOREIGN KEY FK_4DB9D91C61220EA6');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578061220EA6');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7661220EA6');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B061220EA6');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7A76ED395');
        $this->addSql('ALTER TABLE favorite_user_document DROP FOREIGN KEY FK_E50604BDA76ED395');
        $this->addSql('ALTER TABLE favorite_user_module DROP FOREIGN KEY FK_AA647856A76ED395');
        $this->addSql('ALTER TABLE favorite_user_program DROP FOREIGN KEY FK_25F66BE1A76ED395');

        $this->addSql('DROP TABLE user');
        $this->addSql('CREATE TABLE burgieclan_user (id INT AUTO_INCREMENT NOT NULL, full_name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, username VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, email VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, password VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, roles JSON NOT NULL, accesstoken JSON DEFAULT NULL, UNIQUE INDEX UNIQ_229371DDE7927C74 (email), UNIQUE INDEX UNIQ_229371DDF85E0677 (username), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        
        $this->addSql('ALTER TABLE announcement ADD CONSTRAINT FK_4DB9D91C61220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578061220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7661220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B061220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDA76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE1A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE CASCADE');

        //Then restore demo tables
        $this->addSql('CREATE TABLE symfony_demo_comment (id INT AUTO_INCREMENT NOT NULL, post_id INT NOT NULL, author_id INT NOT NULL, content LONGTEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, published_at DATETIME NOT NULL, INDEX IDX_53AD8F834B89032C (post_id), INDEX IDX_53AD8F83F675F31B (author_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE symfony_demo_post (id INT AUTO_INCREMENT NOT NULL, author_id INT NOT NULL, title VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, slug VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, summary VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, content LONGTEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, published_at DATETIME NOT NULL, INDEX IDX_58A92E65F675F31B (author_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE symfony_demo_post_tag (post_id INT NOT NULL, tag_id INT NOT NULL, INDEX IDX_6ABC1CC44B89032C (post_id), INDEX IDX_6ABC1CC4BAD26311 (tag_id), PRIMARY KEY(post_id, tag_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE symfony_demo_tag (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_unicode_ci`, UNIQUE INDEX UNIQ_4D5855405E237E06 (name), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE symfony_demo_comment ADD CONSTRAINT FK_53AD8F83F675F31B FOREIGN KEY (author_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE symfony_demo_comment ADD CONSTRAINT FK_53AD8F834B89032C FOREIGN KEY (post_id) REFERENCES symfony_demo_post (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE symfony_demo_post ADD CONSTRAINT FK_58A92E65F675F31B FOREIGN KEY (author_id) REFERENCES burgieclan_user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE symfony_demo_post_tag ADD CONSTRAINT FK_6ABC1CC4BAD26311 FOREIGN KEY (tag_id) REFERENCES symfony_demo_tag (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE symfony_demo_post_tag ADD CONSTRAINT FK_6ABC1CC44B89032C FOREIGN KEY (post_id) REFERENCES symfony_demo_post (id) ON UPDATE NO ACTION ON DELETE CASCADE');
    }
}

