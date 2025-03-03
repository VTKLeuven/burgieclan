<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250302233402 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE announcement (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, content LONGTEXT NOT NULL, start_time DATETIME NOT NULL, end_time DATETIME NOT NULL, title VARCHAR(255) DEFAULT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, INDEX IDX_4DB9D91C61220EA6 (creator_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE comment_category (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, description LONGTEXT DEFAULT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE course (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, code VARCHAR(255) NOT NULL, professors JSON DEFAULT NULL, semesters JSON DEFAULT NULL, credits INT DEFAULT NULL, UNIQUE INDEX UNIQ_169E6FB977153098 (code), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE course_course (course_source INT NOT NULL, course_target INT NOT NULL, INDEX IDX_B8A6AEF4F1B2BE3E (course_source), INDEX IDX_B8A6AEF4E857EEB1 (course_target), PRIMARY KEY(course_source, course_target)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE course_identical_courses (course_source INT NOT NULL, course_target INT NOT NULL, INDEX IDX_9A81ADB8F1B2BE3E (course_source), INDEX IDX_9A81ADB8E857EEB1 (course_target), PRIMARY KEY(course_source, course_target)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE course_comment (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, course_id INT NOT NULL, category_id INT NOT NULL, content LONGTEXT NOT NULL, anonymous TINYINT(1) NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, INDEX IDX_9CB7578061220EA6 (creator_id), INDEX IDX_9CB75780591CC992 (course_id), INDEX IDX_9CB7578012469DE2 (category_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, course_id INT NOT NULL, category_id INT NOT NULL, name VARCHAR(255) NOT NULL, under_review TINYINT(1) NOT NULL, file_name VARCHAR(255) DEFAULT NULL, year VARCHAR(11) DEFAULT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, INDEX IDX_D8698A7661220EA6 (creator_id), INDEX IDX_D8698A76591CC992 (course_id), INDEX IDX_D8698A7612469DE2 (category_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document_category (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document_comment (id INT AUTO_INCREMENT NOT NULL, creator_id INT NOT NULL, document_id INT NOT NULL, content LONGTEXT NOT NULL, anonymous TINYINT(1) NOT NULL, create_date DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', update_date DATETIME NOT NULL, INDEX IDX_301BF4B061220EA6 (creator_id), INDEX IDX_301BF4B0C33F7837 (document_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE module (id INT AUTO_INCREMENT NOT NULL, program_id INT NOT NULL, name VARCHAR(255) NOT NULL, INDEX IDX_C2426283EB8070A (program_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE module_course (module_id INT NOT NULL, course_id INT NOT NULL, INDEX IDX_BC9D2F96AFC2B591 (module_id), INDEX IDX_BC9D2F96591CC992 (course_id), PRIMARY KEY(module_id, course_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE module_module (module_source INT NOT NULL, module_target INT NOT NULL, INDEX IDX_A6276607F5893F5C (module_source), INDEX IDX_A6276607EC6C6FD3 (module_target), PRIMARY KEY(module_source, module_target)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE page (id INT AUTO_INCREMENT NOT NULL, url_key VARCHAR(255) NOT NULL, public_available TINYINT(1) NOT NULL, name_nl VARCHAR(255) NOT NULL, content_nl LONGTEXT DEFAULT NULL, name_en VARCHAR(255) DEFAULT NULL, content_en LONGTEXT DEFAULT NULL, UNIQUE INDEX UNIQ_140AB620DFAB7B3B (url_key), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE program (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, full_name VARCHAR(255) NOT NULL, username VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, roles JSON NOT NULL, accesstoken JSON DEFAULT NULL, UNIQUE INDEX UNIQ_8D93D649F85E0677 (username), UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE favorite_user_program (user_id INT NOT NULL, program_id INT NOT NULL, INDEX IDX_25F66BE1A76ED395 (user_id), INDEX IDX_25F66BE13EB8070A (program_id), PRIMARY KEY(user_id, program_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE favorite_user_module (user_id INT NOT NULL, module_id INT NOT NULL, INDEX IDX_AA647856A76ED395 (user_id), INDEX IDX_AA647856AFC2B591 (module_id), PRIMARY KEY(user_id, module_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE favorite_user_course (user_id INT NOT NULL, course_id INT NOT NULL, INDEX IDX_B0DE31C7A76ED395 (user_id), INDEX IDX_B0DE31C7591CC992 (course_id), PRIMARY KEY(user_id, course_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE favorite_user_document (user_id INT NOT NULL, document_id INT NOT NULL, INDEX IDX_E50604BDA76ED395 (user_id), INDEX IDX_E50604BDC33F7837 (document_id), PRIMARY KEY(user_id, document_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE announcement ADD CONSTRAINT FK_4DB9D91C61220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4F1B2BE3E FOREIGN KEY (course_source) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_course ADD CONSTRAINT FK_B8A6AEF4E857EEB1 FOREIGN KEY (course_target) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_identical_courses ADD CONSTRAINT FK_9A81ADB8F1B2BE3E FOREIGN KEY (course_source) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_identical_courses ADD CONSTRAINT FK_9A81ADB8E857EEB1 FOREIGN KEY (course_target) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB75780591CC992 FOREIGN KEY (course_id) REFERENCES course (id)');
        $this->addSql('ALTER TABLE course_comment ADD CONSTRAINT FK_9CB7578012469DE2 FOREIGN KEY (category_id) REFERENCES comment_category (id)');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7661220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A76591CC992 FOREIGN KEY (course_id) REFERENCES course (id)');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7612469DE2 FOREIGN KEY (category_id) REFERENCES document_category (id)');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B061220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE document_comment ADD CONSTRAINT FK_301BF4B0C33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module ADD CONSTRAINT FK_C2426283EB8070A FOREIGN KEY (program_id) REFERENCES program (id)');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96AFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module_course ADD CONSTRAINT FK_BC9D2F96591CC992 FOREIGN KEY (course_id) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module_module ADD CONSTRAINT FK_A6276607F5893F5C FOREIGN KEY (module_source) REFERENCES module (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE module_module ADD CONSTRAINT FK_A6276607EC6C6FD3 FOREIGN KEY (module_target) REFERENCES module (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE1A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE13EB8070A FOREIGN KEY (program_id) REFERENCES program (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856AFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7591CC992 FOREIGN KEY (course_id) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE announcement DROP FOREIGN KEY FK_4DB9D91C61220EA6');
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4F1B2BE3E');
        $this->addSql('ALTER TABLE course_course DROP FOREIGN KEY FK_B8A6AEF4E857EEB1');
        $this->addSql('ALTER TABLE course_identical_courses DROP FOREIGN KEY FK_9A81ADB8F1B2BE3E');
        $this->addSql('ALTER TABLE course_identical_courses DROP FOREIGN KEY FK_9A81ADB8E857EEB1');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578061220EA6');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB75780591CC992');
        $this->addSql('ALTER TABLE course_comment DROP FOREIGN KEY FK_9CB7578012469DE2');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7661220EA6');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A76591CC992');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7612469DE2');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B061220EA6');
        $this->addSql('ALTER TABLE document_comment DROP FOREIGN KEY FK_301BF4B0C33F7837');
        $this->addSql('ALTER TABLE module DROP FOREIGN KEY FK_C2426283EB8070A');
        $this->addSql('ALTER TABLE module_course DROP FOREIGN KEY FK_BC9D2F96AFC2B591');
        $this->addSql('ALTER TABLE module_course DROP FOREIGN KEY FK_BC9D2F96591CC992');
        $this->addSql('ALTER TABLE module_module DROP FOREIGN KEY FK_A6276607F5893F5C');
        $this->addSql('ALTER TABLE module_module DROP FOREIGN KEY FK_A6276607EC6C6FD3');
        $this->addSql('ALTER TABLE favorite_user_program DROP FOREIGN KEY FK_25F66BE1A76ED395');
        $this->addSql('ALTER TABLE favorite_user_program DROP FOREIGN KEY FK_25F66BE13EB8070A');
        $this->addSql('ALTER TABLE favorite_user_module DROP FOREIGN KEY FK_AA647856A76ED395');
        $this->addSql('ALTER TABLE favorite_user_module DROP FOREIGN KEY FK_AA647856AFC2B591');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7A76ED395');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7591CC992');
        $this->addSql('ALTER TABLE favorite_user_document DROP FOREIGN KEY FK_E50604BDA76ED395');
        $this->addSql('ALTER TABLE favorite_user_document DROP FOREIGN KEY FK_E50604BDC33F7837');
        $this->addSql('DROP TABLE announcement');
        $this->addSql('DROP TABLE comment_category');
        $this->addSql('DROP TABLE course');
        $this->addSql('DROP TABLE course_course');
        $this->addSql('DROP TABLE course_identical_courses');
        $this->addSql('DROP TABLE course_comment');
        $this->addSql('DROP TABLE document');
        $this->addSql('DROP TABLE document_category');
        $this->addSql('DROP TABLE document_comment');
        $this->addSql('DROP TABLE module');
        $this->addSql('DROP TABLE module_course');
        $this->addSql('DROP TABLE module_module');
        $this->addSql('DROP TABLE page');
        $this->addSql('DROP TABLE program');
        $this->addSql('DROP TABLE user');
        $this->addSql('DROP TABLE favorite_user_program');
        $this->addSql('DROP TABLE favorite_user_module');
        $this->addSql('DROP TABLE favorite_user_course');
        $this->addSql('DROP TABLE favorite_user_document');
    }
}
