<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240508161850 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE favorite_user_program (user_id INT NOT NULL, program_id INT NOT NULL, INDEX IDX_25F66BE1A76ED395 (user_id), INDEX IDX_25F66BE13EB8070A (program_id), PRIMARY KEY(user_id, program_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE favorite_user_module (user_id INT NOT NULL, module_id INT NOT NULL, INDEX IDX_AA647856A76ED395 (user_id), INDEX IDX_AA647856AFC2B591 (module_id), PRIMARY KEY(user_id, module_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE favorite_user_course (user_id INT NOT NULL, course_id INT NOT NULL, INDEX IDX_B0DE31C7A76ED395 (user_id), INDEX IDX_B0DE31C7591CC992 (course_id), PRIMARY KEY(user_id, course_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE favorite_user_document (user_id INT NOT NULL, document_id INT NOT NULL, INDEX IDX_E50604BDA76ED395 (user_id), INDEX IDX_E50604BDC33F7837 (document_id), PRIMARY KEY(user_id, document_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE1A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_program ADD CONSTRAINT FK_25F66BE13EB8070A FOREIGN KEY (program_id) REFERENCES program (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_module ADD CONSTRAINT FK_AA647856AFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7A76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_course ADD CONSTRAINT FK_B0DE31C7591CC992 FOREIGN KEY (course_id) REFERENCES burgieclan_course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDA76ED395 FOREIGN KEY (user_id) REFERENCES burgieclan_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE favorite_user_document ADD CONSTRAINT FK_E50604BDC33F7837 FOREIGN KEY (document_id) REFERENCES document (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE favorite_user_program DROP FOREIGN KEY FK_25F66BE1A76ED395');
        $this->addSql('ALTER TABLE favorite_user_program DROP FOREIGN KEY FK_25F66BE13EB8070A');
        $this->addSql('ALTER TABLE favorite_user_module DROP FOREIGN KEY FK_AA647856A76ED395');
        $this->addSql('ALTER TABLE favorite_user_module DROP FOREIGN KEY FK_AA647856AFC2B591');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7A76ED395');
        $this->addSql('ALTER TABLE favorite_user_course DROP FOREIGN KEY FK_B0DE31C7591CC992');
        $this->addSql('ALTER TABLE favorite_user_document DROP FOREIGN KEY FK_E50604BDA76ED395');
        $this->addSql('ALTER TABLE favorite_user_document DROP FOREIGN KEY FK_E50604BDC33F7837');
        $this->addSql('DROP TABLE favorite_user_program');
        $this->addSql('DROP TABLE favorite_user_module');
        $this->addSql('DROP TABLE favorite_user_course');
        $this->addSql('DROP TABLE favorite_user_document');
    }
}
