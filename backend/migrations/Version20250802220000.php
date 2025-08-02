<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration to create Professor entity and update Course-Professor relationship
 */
final class Version20250802220000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create Professor entity and update Course-Professor relationship from JSON array to many-to-many';
    }

    public function up(Schema $schema): void
    {
        // Create professor table
        $this->addSql('CREATE TABLE professor (
            id INT AUTO_INCREMENT NOT NULL, 
            u_number VARCHAR(10) NOT NULL, 
            name VARCHAR(255) NOT NULL, 
            email VARCHAR(255) DEFAULT NULL, 
            picture_url VARCHAR(500) DEFAULT NULL, 
            department VARCHAR(255) DEFAULT NULL, 
            title VARCHAR(255) DEFAULT NULL, 
            last_updated DATETIME DEFAULT NULL, 
            UNIQUE INDEX UNIQ_790DD7FD4F6ACF90 (u_number), 
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Create course_professor junction table
        $this->addSql('CREATE TABLE course_professor (
            course_id INT NOT NULL, 
            professor_id INT NOT NULL, 
            INDEX IDX_21C3CC73591CC992 (course_id), 
            INDEX IDX_21C3CC737D2D3171 (professor_id), 
            PRIMARY KEY(course_id, professor_id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Add foreign keys
        $this->addSql('ALTER TABLE course_professor ADD CONSTRAINT FK_21C3CC73591CC992 FOREIGN KEY (course_id) REFERENCES course (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE course_professor ADD CONSTRAINT FK_21C3CC737D2D3171 FOREIGN KEY (professor_id) REFERENCES professor (id) ON DELETE CASCADE');

        // Migration script to convert existing professor JSON data to Professor entities
        // This will be handled in a post-migration script since we need to parse JSON
        // For now, we'll just add a comment that this needs manual data migration
        $this->addSql('-- TODO: Migrate existing professor JSON data to Professor entities and course_professor relationships');
        
        // Remove the professors JSON column from course table (we'll do this after data migration)
        // $this->addSql('ALTER TABLE course DROP professors');
    }

    public function down(Schema $schema): void
    {
        // Drop foreign keys and tables
        $this->addSql('ALTER TABLE course_professor DROP FOREIGN KEY FK_21C3CC73591CC992');
        $this->addSql('ALTER TABLE course_professor DROP FOREIGN KEY FK_21C3CC737D2D3171');
        $this->addSql('DROP TABLE course_professor');
        $this->addSql('DROP TABLE professor');
        
        // Note: We don't restore the JSON column automatically as it could cause data loss
        // This should be handled manually if needed
    }
}