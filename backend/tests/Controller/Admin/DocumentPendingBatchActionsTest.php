<?php

namespace App\Tests\Controller\Admin;

use App\Entity\Document;
use App\Entity\User;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Vich\UploaderBundle\Storage\StorageInterface;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;
use ZipArchive;

class DocumentPendingBatchActionsTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    /** @var string[] */
    private array $createdFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->createdFiles as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
        $this->createdFiles = [];
        parent::tearDown();
    }

    private function storeFile(string $name, string $contents): string
    {
        $dir = \dirname(__DIR__, 3) . '/data/documents';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $path = $dir . '/' . $name;
        file_put_contents($path, $contents);
        $this->createdFiles[] = $path;

        return $name;
    }

    private function moderator(): User
    {
        return UserFactory::createOne(['roles' => [User::ROLE_MODERATOR]]);
    }

    public function testIndexPageRendersBulkActionBarAndBatchActions(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        DocumentFactory::createOne(['under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseIsSuccessful();

        // Bulk action bar elements
        self::assertSelectorExists('#pending-bulk-action-bar');
        self::assertSelectorExists('#bc-selected-count');
        self::assertSelectorExists('#bc-clear-selection');

        // Check for batch action buttons
        $approveBtn = $crawler->filter('[data-action-name="batchApprove"]');
        self::assertCount(1, $approveBtn);
        self::assertSame('true', $approveBtn->attr('data-action-batch'));
        self::assertStringContainsString('Approve Selected', $approveBtn->text());

        $downloadBtn = $crawler->filter('[data-action-name="batchDownload"]');
        self::assertCount(1, $downloadBtn);
        self::assertSame('true', $downloadBtn->attr('data-action-batch'));
        self::assertSame('true', $downloadBtn->attr('data-action-batch-no-confirm'));
        self::assertStringContainsString('Download Selected', $downloadBtn->text());

        $deleteBtn = $crawler->filter('[data-action-name="batchDelete"]');
        self::assertCount(1, $deleteBtn);
        self::assertSame('true', $deleteBtn->attr('data-action-batch'));
    }

    public function testBatchApproveApprovesSelectedDocuments(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $doc1 = DocumentFactory::createOne(['name' => 'Doc One', 'under_review' => true]);
        $doc2 = DocumentFactory::createOne(['name' => 'Doc Two', 'under_review' => true]);
        $doc3 = DocumentFactory::createOne(['name' => 'Doc Three', 'under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseIsSuccessful();

        $approveBtn = $crawler->filter('[data-action-name="batchApprove"]');
        $actionUrl = $approveBtn->attr('data-action-url');
        $csrfToken = $approveBtn->attr('data-action-csrf-token');

        self::assertNotEmpty($actionUrl);
        self::assertNotEmpty($csrfToken);

        $client->request(
            'POST',
            $actionUrl,
            [
            'batchActionName' => 'batchApprove',
            'entityFqcn' => Document::class,
            'batchActionCsrfToken' => $csrfToken,
            'batchActionEntityIds' => [
                (string) $doc1->getId(),
                (string) $doc2->getId(),
            ],
            ]
        );

        self::assertResponseRedirects();
        $crawler = $client->followRedirect();

        self::assertStringContainsString('2 documents were approved.', $crawler->filter('body')->html());

        /** @var EntityManagerInterface $entityManager */
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->clear();

        $doc1Reloaded = $entityManager->getRepository(Document::class)->find($doc1->getId());
        $doc2Reloaded = $entityManager->getRepository(Document::class)->find($doc2->getId());
        $doc3Reloaded = $entityManager->getRepository(Document::class)->find($doc3->getId());

        self::assertNotNull($doc1Reloaded);
        self::assertNotNull($doc2Reloaded);
        self::assertNotNull($doc3Reloaded);

        self::assertFalse($doc1Reloaded->isUnderReview());
        self::assertFalse($doc2Reloaded->isUnderReview());
        self::assertTrue($doc3Reloaded->isUnderReview());
    }

    public function testBatchApproveRejectsInvalidCsrfToken(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $doc = DocumentFactory::createOne(['under_review' => true]);

        $client->request(
            'POST',
            'https://localhost/admin/document-pending/batch-approve',
            [
            'batchActionName' => 'batchApprove',
            'entityFqcn' => Document::class,
            'batchActionCsrfToken' => 'invalid-token',
            'batchActionEntityIds' => [(string) $doc->getId()],
            ]
        );

        self::assertResponseRedirects();
        $crawler = $client->followRedirect();
        self::assertStringContainsString('Invalid CSRF token.', $crawler->filter('body')->html());

        /** @var EntityManagerInterface $entityManager */
        $entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $entityManager->clear();

        $docReloaded = $entityManager->getRepository(Document::class)->find($doc->getId());
        self::assertNotNull($docReloaded);
        self::assertTrue($docReloaded->isUnderReview());
    }

    public function testBatchDownloadReturnsZipFileWithCleanFilenames(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $file1 = $this->storeFile('test1_hash.pdf', '%PDF-1.4 Content One');
        $file2 = $this->storeFile('test2_hash.txt', 'Plain text content two');

        $doc1 = DocumentFactory::createOne(
            [
            'name' => 'Summary Calculus',
            'file_name' => $file1,
            'under_review' => true,
            ]
        );
        $doc2 = DocumentFactory::createOne(
            [
            'name' => 'Notes Physics',
            'file_name' => $file2,
            'under_review' => true,
            ]
        );

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseIsSuccessful();

        $downloadBtn = $crawler->filter('[data-action-name="batchDownload"]');
        $actionUrl = $downloadBtn->attr('data-action-url');
        $csrfToken = $downloadBtn->attr('data-action-csrf-token');

        $client->request(
            'POST',
            $actionUrl,
            [
            'batchActionName' => 'batchDownload',
            'entityFqcn' => Document::class,
            'batchActionCsrfToken' => $csrfToken,
            'batchActionEntityIds' => [
                (string) $doc1->getId(),
                (string) $doc2->getId(),
            ],
            ]
        );

        self::assertResponseIsSuccessful();
        $response = $client->getResponse();

        self::assertSame('application/zip', $response->headers->get('Content-Type'));
        $disposition = (string) $response->headers->get('Content-Disposition');
        self::assertStringContainsString('attachment; filename=pending-documents-', $disposition);

        $zipContent = (string) $response->getContent();
        self::assertNotEmpty($zipContent);

        $tempZip = tempnam(sys_get_temp_dir(), 'test_dl_');
        file_put_contents($tempZip, $zipContent);

        $zip = new ZipArchive();
        self::assertTrue($zip->open($tempZip));
        self::assertSame(2, $zip->numFiles);

        $extractedNames = [
            $zip->getNameIndex(0),
            $zip->getNameIndex(1),
        ];
        sort($extractedNames);

        self::assertSame(['Notes Physics.txt', 'Summary Calculus.pdf'], $extractedNames);

        self::assertSame('%PDF-1.4 Content One', $zip->getFromName('Summary Calculus.pdf'));
        self::assertSame('Plain text content two', $zip->getFromName('Notes Physics.txt'));

        $zip->close();
        @unlink($tempZip);
    }

    public function testBatchDownloadHandlesDuplicateFilenamesInZip(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $file1 = $this->storeFile('file_a.pdf', 'Content A');
        $file2 = $this->storeFile('file_b.pdf', 'Content B');

        $doc1 = DocumentFactory::createOne(['name' => 'Exam 2024', 'file_name' => $file1, 'under_review' => true]);
        $doc2 = DocumentFactory::createOne(['name' => 'Exam 2024', 'file_name' => $file2, 'under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        $downloadBtn = $crawler->filter('[data-action-name="batchDownload"]');
        $actionUrl = $downloadBtn->attr('data-action-url');
        $csrfToken = $downloadBtn->attr('data-action-csrf-token');

        $client->request(
            'POST',
            $actionUrl,
            [
            'batchActionName' => 'batchDownload',
            'entityFqcn' => Document::class,
            'batchActionCsrfToken' => $csrfToken,
            'batchActionEntityIds' => [
                (string) $doc1->getId(),
                (string) $doc2->getId(),
            ],
            ]
        );

        self::assertResponseIsSuccessful();
        $response = $client->getResponse();

        $tempZip = tempnam(sys_get_temp_dir(), 'test_dl_dup_');
        file_put_contents($tempZip, (string) $response->getContent());

        $zip = new ZipArchive();
        self::assertTrue($zip->open($tempZip));
        self::assertSame(2, $zip->numFiles);

        $names = [$zip->getNameIndex(0), $zip->getNameIndex(1)];
        sort($names);

        self::assertSame(['Exam 2024 (1).pdf', 'Exam 2024.pdf'], $names);

        $zip->close();
        @unlink($tempZip);
    }

    public function testBatchActionsRequireModeratorRole(): void
    {
        $client = static::createClient();
        // Regular user without ROLE_MODERATOR
        $client->loginUser(UserFactory::createOne(['roles' => []]));

        $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseStatusCodeSame(403);

        $client->request(
            'POST',
            'https://localhost/admin/document-pending/batch-approve',
            [
            'batchActionName' => 'batchApprove',
            'entityFqcn' => Document::class,
            'batchActionCsrfToken' => 'any',
            'batchActionEntityIds' => ['1'],
            ]
        );
        self::assertResponseStatusCodeSame(403);
    }
}
