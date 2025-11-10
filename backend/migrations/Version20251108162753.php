<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251108162753 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SEQUENCE announcement_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE burgieclan_user_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE comment_category_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE course_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE course_comment_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE course_comment_vote_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE document_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE document_category_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE document_comment_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE document_comment_vote_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE document_vote_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE module_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE page_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE program_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE quick_link_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE refresh_tokens_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE tag_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE SEQUENCE user_document_view_id_seq INCREMENT BY 1 MINVALUE 1 START 1');
        $this->addSql('CREATE TABLE announcement (id INT NOT NULL, creator_id INT NOT NULL, create_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, update_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, priority BOOLEAN NOT NULL, title_nl VARCHAR(255) NOT NULL, title_en VARCHAR(255) DEFAULT NULL, content_nl TEXT NOT NULL, content_en TEXT DEFAULT NULL, start_time TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, end_time TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_4DB9D91C61220EA6 ON announcement (creator_id)');
        $this->addSql('COMMENT ON COLUMN announcement.create_date IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE TABLE burgieclan_user (id INT NOT NULL, full_name VARCHAR(255) NOT NULL, username VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, roles JSON NOT NULL, accesstoken JSON DEFAULT NULL, default_anonymous BOOLEAN DEFAULT true NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_229371DDF85E0677 ON burgieclan_user (username)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_229371DDE7927C74 ON burgieclan_user (email)');
        $this->addSql('CREATE TABLE favorite_user_program (user_id INT NOT NULL, program_id INT NOT NULL, PRIMARY KEY(user_id, program_id))');
        $this->addSql('CREATE INDEX IDX_25F66BE1A76ED395 ON favorite_user_program (user_id)');
        $this->addSql('CREATE INDEX IDX_25F66BE13EB8070A ON favorite_user_program (program_id)');
        $this->addSql('CREATE TABLE favorite_user_module (user_id INT NOT NULL, module_id INT NOT NULL, PRIMARY KEY(user_id, module_id))');
        $this->addSql('CREATE INDEX IDX_AA647856A76ED395 ON favorite_user_module (user_id)');
        $this->addSql('CREATE INDEX IDX_AA647856AFC2B591 ON favorite_user_module (module_id)');
        $this->addSql('CREATE TABLE favorite_user_course (user_id INT NOT NULL, course_id INT NOT NULL, PRIMARY KEY(user_id, course_id))');
        $this->addSql('CREATE INDEX IDX_B0DE31C7A76ED395 ON favorite_user_course (user_id)');
        $this->addSql('CREATE INDEX IDX_B0DE31C7591CC992 ON favorite_user_course (course_id)');
        $this->addSql('CREATE TABLE favorite_user_document (user_id INT NOT NULL, document_id INT NOT NULL, PRIMARY KEY(user_id, document_id))');
        $this->addSql('CREATE INDEX IDX_E50604BDA76ED395 ON favorite_user_document (user_id)');
        $this->addSql('CREATE INDEX IDX_E50604BDC33F7837 ON favorite_user_document (document_id)');
        $this->addSql('CREATE TABLE comment_category (id INT NOT NULL, name_nl VARCHAR(255) NOT NULL, description_nl TEXT DEFAULT NULL, name_en VARCHAR(255) DEFAULT NULL, description_en TEXT DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE TABLE course (id INT NOT NULL, name VARCHAR(255) NOT NULL, code VARCHAR(255) NOT NULL, professors JSON DEFAULT NULL, semesters JSON DEFAULT NULL, language VARCHAR(7) NOT NULL, credits INT DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_169E6FB977153098 ON course (code)');
        $this->addSql('CREATE TABLE course_course (course_source INT NOT NULL, course_target INT NOT NULL, PRIMARY KEY(course_source, course_target))');
        $this->addSql('CREATE INDEX IDX_B8A6AEF4F1B2BE3E ON course_course (course_source)');
        $this->addSql('CREATE INDEX IDX_B8A6AEF4E857EEB1 ON course_course (course_target)');
        $this->addSql('CREATE TABLE course_identical_courses (course_source INT NOT NULL, course_target INT NOT NULL, PRIMARY KEY(course_source, course_target))');
        $this->addSql('CREATE INDEX IDX_9A81ADB8F1B2BE3E ON course_identical_courses (course_source)');
        $this->addSql('CREATE INDEX IDX_9A81ADB8E857EEB1 ON course_identical_courses (course_target)');
        $this->addSql('CREATE TABLE course_comment (id INT NOT NULL, creator_id INT NOT NULL, course_id INT NOT NULL, category_id INT NOT NULL, create_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, update_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, content TEXT NOT NULL, anonymous BOOLEAN NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_9CB7578061220EA6 ON course_comment (creator_id)');
        $this->addSql('CREATE INDEX IDX_9CB75780591CC992 ON course_comment (course_id)');
        $this->addSql('CREATE INDEX IDX_9CB7578012469DE2 ON course_comment (category_id)');
        $this->addSql('COMMENT ON COLUMN course_comment.create_date IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE TABLE course_comment_vote (id INT NOT NULL, creator_id INT NOT NULL, course_comment_id INT NOT NULL, create_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, update_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, vote_type INT NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_FDEC5F7561220EA6 ON course_comment_vote (creator_id)');
        $this->addSql('CREATE INDEX IDX_FDEC5F75278B3390 ON course_comment_vote (course_comment_id)');
        $this->addSql('CREATE UNIQUE INDEX unique_user_vote_per_course_comment ON course_comment_vote (creator_id, course_comment_id)');
        $this->addSql('COMMENT ON COLUMN course_comment_vote.create_date IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE TABLE document (id INT NOT NULL, creator_id INT NOT NULL, course_id INT NOT NULL, category_id INT NOT NULL, create_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, update_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, name VARCHAR(255) NOT NULL, under_review BOOLEAN NOT NULL, anonymous BOOLEAN NOT NULL, file_name VARCHAR(255) DEFAULT NULL, file_size INT DEFAULT NULL, year VARCHAR(11) DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_D8698A7661220EA6 ON document (creator_id)');
        $this->addSql('CREATE INDEX IDX_D8698A76591CC992 ON document (course_id)');
        $this->addSql('CREATE INDEX IDX_D8698A7612469DE2 ON document (category_id)');
        $this->addSql('COMMENT ON COLUMN document.create_date IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE TABLE document_category (id INT NOT NULL, name_nl VARCHAR(255) NOT NULL, name_en VARCHAR(255) DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE TABLE document_comment (id INT NOT NULL, creator_id INT NOT NULL, document_id INT NOT NULL, create_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, update_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, content TEXT NOT NULL, anonymous BOOLEAN NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_301BF4B061220EA6 ON document_comment (creator_id)');
        $this->addSql('CREATE INDEX IDX_301BF4B0C33F7837 ON document_comment (document_id)');
        $this->addSql('COMMENT ON COLUMN document_comment.create_date IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE TABLE document_comment_vote (id INT NOT NULL, creator_id INT NOT NULL, document_comment_id INT NOT NULL, create_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, update_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, vote_type INT NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_D1C306F961220EA6 ON document_comment_vote (creator_id)');
        $this->addSql('CREATE INDEX IDX_D1C306F959AAD645 ON document_comment_vote (document_comment_id)');
        $this->addSql('CREATE UNIQUE INDEX unique_user_vote_per_document_comment ON document_comment_vote (creator_id, document_comment_id)');
        $this->addSql('COMMENT ON COLUMN document_comment_vote.create_date IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE TABLE document_vote (id INT NOT NULL, creator_id INT NOT NULL, document_id INT NOT NULL, create_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, update_date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, vote_type INT NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_FDA409F761220EA6 ON document_vote (creator_id)');
        $this->addSql('CREATE INDEX IDX_FDA409F7C33F7837 ON document_vote (document_id)');
        $this->addSql('CREATE UNIQUE INDEX unique_user_vote_per_document ON document_vote (creator_id, document_id)');
        $this->addSql('COMMENT ON COLUMN document_vote.create_date IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('CREATE TABLE module (id INT NOT NULL, program_id INT DEFAULT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_C2426283EB8070A ON module (program_id)');
        $this->addSql('CREATE TABLE module_course (module_id INT NOT NULL, course_id INT NOT NULL, PRIMARY KEY(module_id, course_id))');
        $this->addSql('CREATE INDEX IDX_BC9D2F96AFC2B591 ON module_course (module_id)');
        $this->addSql('CREATE INDEX IDX_BC9D2F96591CC992 ON module_course (course_id)');
        $this->addSql('CREATE TABLE module_module (module_source INT NOT NULL, module_target INT NOT NULL, PRIMARY KEY(module_source, module_target))');
        $this->addSql('CREATE INDEX IDX_A6276607F5893F5C ON module_module (module_source)');
        $this->addSql('CREATE INDEX IDX_A6276607EC6C6FD3 ON module_module (module_target)');
        $this->addSql('CREATE TABLE page (id INT NOT NULL, url_key VARCHAR(255) NOT NULL, public_available BOOLEAN NOT NULL, name_nl VARCHAR(255) NOT NULL, content_nl TEXT DEFAULT NULL, name_en VARCHAR(255) DEFAULT NULL, content_en TEXT DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_140AB620DFAB7B3B ON page (url_key)');
        $this->addSql('CREATE TABLE program (id INT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE TABLE quick_link (id INT NOT NULL, name_nl VARCHAR(255) DEFAULT NULL, name_en VARCHAR(255) DEFAULT NULL, link_to VARCHAR(255) NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE TABLE refresh_tokens (id INT NOT NULL, refresh_token VARCHAR(128) NOT NULL, username VARCHAR(255) NOT NULL, valid TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9BACE7E1C74F2195 ON refresh_tokens (refresh_token)');
        $this->addSql('CREATE TABLE tag (id INT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_389B7835E237E06 ON tag (name)');
        $this->addSql('CREATE TABLE tag_document (tag_id INT NOT NULL, document_id INT NOT NULL, PRIMARY KEY(tag_id, document_id))');
        $this->addSql('CREATE INDEX IDX_EE58F1ADBAD26311 ON tag_document (tag_id)');
        $this->addSql('CREATE INDEX IDX_EE58F1ADC33F7837 ON tag_document (document_id)');
        $this->addSql('CREATE TABLE user_document_view (id INT NOT NULL, user_id INT NOT NULL, document_id INT NOT NULL, last_viewed TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_B7C78A4DA76ED395 ON user_document_view (user_id)');
        $this->addSql('CREATE INDEX IDX_B7C78A4DC33F7837 ON user_document_view (document_id)');
        $this->addSql('CREATE INDEX IDX_B7C78A4D7D8F9BDE ON user_document_view (last_viewed)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_B7C78A4DA76ED395C33F7837 ON user_document_view (user_id, document_id)');
        $this->addSql('ALTER TABLE announcement ADD CONSTRAINT FK_4DB9D91C61220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE1A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE13EB8070A FOREIGN KEY (program_id) REFERENCES program (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856AFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7591CC992 FOREIGN KEY (course_id) REFERENCES course (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDA76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4F1B2BE3E FOREIGN KEY (course_source) REFERENCES course (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4E857EEB1 FOREIGN KEY (course_target) REFERENCES course (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_identical_courses ADD CONSTRAINT FK_9A81ADB8F1B2BE3E FOREIGN KEY (course_source) REFERENCES course (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_identical_courses ADD CONSTRAINT FK_9A81ADB8E857EEB1 FOREIGN KEY (course_target) REFERENCES course (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578061220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780591CC992 FOREIGN KEY (course_id) REFERENCES course (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578012469DE2 FOREIGN KEY (category_id) REFERENCES comment_category (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F7561220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE course_comment_vote ADD CONSTRAINT FK_FDEC5F75278B3390 FOREIGN KEY (course_comment_id) REFERENCES course_comment (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7661220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A76591CC992 FOREIGN KEY (course_id) REFERENCES course (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7612469DE2 FOREIGN KEY (category_id) REFERENCES document_category (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B061220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B0C33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F961220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document_comment_vote ADD CONSTRAINT FK_D1C306F959AAD645 FOREIGN KEY (document_comment_id) REFERENCES document_comment (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F761220EA6 FOREIGN KEY (creator_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE document_vote ADD CONSTRAINT FK_FDA409F7C33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE module ADD CONSTRAINT FK_C2426283EB8070A FOREIGN KEY (program_id) REFERENCES program (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96AFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96591CC992 FOREIGN KEY (course_id) REFERENCES course (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE module_module ADD CONSTRAINT FK_A6276607F5893F5C FOREIGN KEY (module_source) REFERENCES module (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE module_module ADD CONSTRAINT FK_A6276607EC6C6FD3 FOREIGN KEY (module_target) REFERENCES module (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE tag_document ADD CONSTRAINT FK_EE58F1ADBAD26311 FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE tag_document ADD CONSTRAINT FK_EE58F1ADC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DA76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE user_document_view ADD CONSTRAINT FK_B7C78A4DC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('DROP SEQUENCE announcement_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE burgieclan_user_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE comment_category_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE course_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE course_comment_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE course_comment_vote_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE document_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE document_category_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE document_comment_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE document_comment_vote_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE document_vote_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE module_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE page_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE program_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE quick_link_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE refresh_tokens_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE tag_id_seq CASCADE');
        $this->addSql('DROP SEQUENCE user_document_view_id_seq CASCADE');
        $this->addSql('ALTER TABLE announcement DROP CONSTRAINT FK_4DB9D91C61220EA6');
        $this->addSql('ALTER TABLE favorite_user_program DROP CONSTRAINT FK_25F66BE1A76ED395');
        $this->addSql('ALTER TABLE favorite_user_program DROP CONSTRAINT FK_25F66BE13EB8070A');
        $this->addSql('ALTER TABLE favorite_user_module DROP CONSTRAINT FK_AA647856A76ED395');
        $this->addSql('ALTER TABLE favorite_user_module DROP CONSTRAINT FK_AA647856AFC2B591');
        $this->addSql('ALTER TABLE favorite_user_course DROP CONSTRAINT FK_B0DE31C7A76ED395');
        $this->addSql('ALTER TABLE favorite_user_course DROP CONSTRAINT FK_B0DE31C7591CC992');
        $this->addSql('ALTER TABLE favorite_user_document DROP CONSTRAINT FK_E50604BDA76ED395');
        $this->addSql('ALTER TABLE favorite_user_document DROP CONSTRAINT FK_E50604BDC33F7837');
        $this->addSql('ALTER TABLE course_course DROP CONSTRAINT FK_B8A6AEF4F1B2BE3E');
        $this->addSql('ALTER TABLE course_course DROP CONSTRAINT FK_B8A6AEF4E857EEB1');
        $this->addSql('ALTER TABLE course_identical_courses DROP CONSTRAINT FK_9A81ADB8F1B2BE3E');
        $this->addSql('ALTER TABLE course_identical_courses DROP CONSTRAINT FK_9A81ADB8E857EEB1');
        $this->addSql('ALTER TABLE course_comment DROP CONSTRAINT FK_9CB7578061220EA6');
        $this->addSql('ALTER TABLE course_comment DROP CONSTRAINT FK_9CB75780591CC992');
        $this->addSql('ALTER TABLE course_comment DROP CONSTRAINT FK_9CB7578012469DE2');
        $this->addSql('ALTER TABLE course_comment_vote DROP CONSTRAINT FK_FDEC5F7561220EA6');
        $this->addSql('ALTER TABLE course_comment_vote DROP CONSTRAINT FK_FDEC5F75278B3390');
        $this->addSql('ALTER TABLE document DROP CONSTRAINT FK_D8698A7661220EA6');
        $this->addSql('ALTER TABLE document DROP CONSTRAINT FK_D8698A76591CC992');
        $this->addSql('ALTER TABLE document DROP CONSTRAINT FK_D8698A7612469DE2');
        $this->addSql('ALTER TABLE document_comment DROP CONSTRAINT FK_301BF4B061220EA6');
        $this->addSql('ALTER TABLE document_comment DROP CONSTRAINT FK_301BF4B0C33F7837');
        $this->addSql('ALTER TABLE document_comment_vote DROP CONSTRAINT FK_D1C306F961220EA6');
        $this->addSql('ALTER TABLE document_comment_vote DROP CONSTRAINT FK_D1C306F959AAD645');
        $this->addSql('ALTER TABLE document_vote DROP CONSTRAINT FK_FDA409F761220EA6');
        $this->addSql('ALTER TABLE document_vote DROP CONSTRAINT FK_FDA409F7C33F7837');
        $this->addSql('ALTER TABLE module DROP CONSTRAINT FK_C2426283EB8070A');
        $this->addSql('ALTER TABLE module_course DROP CONSTRAINT FK_BC9D2F96AFC2B591');
        $this->addSql('ALTER TABLE module_course DROP CONSTRAINT FK_BC9D2F96591CC992');
        $this->addSql('ALTER TABLE module_module DROP CONSTRAINT FK_A6276607F5893F5C');
        $this->addSql('ALTER TABLE module_module DROP CONSTRAINT FK_A6276607EC6C6FD3');
        $this->addSql('ALTER TABLE tag_document DROP CONSTRAINT FK_EE58F1ADBAD26311');
        $this->addSql('ALTER TABLE tag_document DROP CONSTRAINT FK_EE58F1ADC33F7837');
        $this->addSql('ALTER TABLE user_document_view DROP CONSTRAINT FK_B7C78A4DA76ED395');
        $this->addSql('ALTER TABLE user_document_view DROP CONSTRAINT FK_B7C78A4DC33F7837');
        $this->addSql('DROP TABLE announcement');
        $this->addSql('DROP TABLE burgieclan_user');
        $this->addSql('DROP TABLE favorite_user_program');
        $this->addSql('DROP TABLE favorite_user_module');
        $this->addSql('DROP TABLE favorite_user_course');
        $this->addSql('DROP TABLE favorite_user_document');
        $this->addSql('DROP TABLE comment_category');
        $this->addSql('DROP TABLE course');
        $this->addSql('DROP TABLE course_course');
        $this->addSql('DROP TABLE course_identical_courses');
        $this->addSql('DROP TABLE course_comment');
        $this->addSql('DROP TABLE course_comment_vote');
        $this->addSql('DROP TABLE document');
        $this->addSql('DROP TABLE document_category');
        $this->addSql('DROP TABLE document_comment');
        $this->addSql('DROP TABLE document_comment_vote');
        $this->addSql('DROP TABLE document_vote');
        $this->addSql('DROP TABLE module');
        $this->addSql('DROP TABLE module_course');
        $this->addSql('DROP TABLE module_module');
        $this->addSql('DROP TABLE page');
        $this->addSql('DROP TABLE program');
        $this->addSql('DROP TABLE quick_link');
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('DROP TABLE tag');
        $this->addSql('DROP TABLE tag_document');
        $this->addSql('DROP TABLE user_document_view');
    }
}
