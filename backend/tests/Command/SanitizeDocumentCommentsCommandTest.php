<?php

namespace App\Tests\Command;

use App\Factory\DocumentCommentFactory;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Tester\CommandTester;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * Comments stored before they were sanitized on write.
 */
class SanitizeDocumentCommentsCommandTest extends KernelTestCase
{
    use ResetDatabase;

    private Connection $connection;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->connection = self::getContainer()->get(Connection::class);
    }

    public function testSanitizesStoredComments(): void
    {
        $attack = DocumentCommentFactory::createOne();
        $reencoded = DocumentCommentFactory::createOne();
        $clean = DocumentCommentFactory::createOne(['content' => '<p>al in orde</p>']);
        // Written past the listener, like the comments stored before it existed
        $this->store($attack->getId(), '<p>test</p><img src=x onerror="console.log(\'xss\')">');
        $this->store(
            $reencoded->getId(),
            "<p>it's<br><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"https://vtk.be\">fine</a></p>"
        );
        $updatedAt = $this->updatedAt($attack->getId());

        $command = new CommandTester((new Application(self::$kernel))->find('app:document-comments:sanitize'));

        $command->execute(['--dry-run' => true]);
        $command->assertCommandIsSuccessful();
        $this->assertStringContainsString(
            'Would sanitize 2 of 3 document comment(s), 1 of them losing markup',
            $command->getDisplay()
        );
        $this->assertStringContainsString('* ' . $attack->getId(), $command->getDisplay());
        $this->assertStringNotContainsString('* ' . $reencoded->getId(), $command->getDisplay());
        $this->assertSame(
            '<p>test</p><img src=x onerror="console.log(\'xss\')">',
            $this->content($attack->getId())
        );

        $command->execute([]);
        $command->assertCommandIsSuccessful();
        $this->assertSame('<p>test</p>', $this->content($attack->getId()));
        $this->assertSame(
            '<p>it&#039;s<br />'
                . '<a target="_blank" rel="noopener noreferrer nofollow" href="https://vtk.be">fine</a></p>',
            $this->content($reencoded->getId())
        );
        $this->assertSame('<p>al in orde</p>', $this->content($clean->getId()));
        // Cleaned, not edited by its author
        $this->assertSame($updatedAt, $this->updatedAt($attack->getId()));

        $command->execute([]);
        $this->assertStringContainsString('Sanitized 0 of 3 document comment(s)', $command->getDisplay());
    }

    private function store(int $id, string $content): void
    {
        $this->connection->update('document_comment', ['content' => $content], ['id' => $id]);
    }

    private function content(int $id): string
    {
        return $this->connection->fetchOne('SELECT content FROM document_comment WHERE id = ?', [$id]);
    }

    private function updatedAt(int $id): string
    {
        return $this->connection->fetchOne('SELECT updated_at FROM document_comment WHERE id = ?', [$id]);
    }
}
