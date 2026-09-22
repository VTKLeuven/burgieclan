<?php

namespace App\Tests\Controller\Admin;

use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\Tag;
use App\Entity\User;
use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentFactory;
use App\Factory\TagFactory;
use App\Factory\UserFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Vich\UploaderBundle\Storage\StorageInterface;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;
use ZipArchive;

class DocumentPendingMergeTest extends WebTestCase
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

    public function testIndexPageRendersMergeSelectedBatchAction(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        DocumentFactory::createOne(['under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseIsSuccessful();

        $mergeBtn = $crawler->filter('[data-action-name="batchMerge"]');
        self::assertCount(1, $mergeBtn);
        self::assertSame('true', $mergeBtn->attr('data-action-batch'));
        self::assertSame('true', $mergeBtn->attr('data-action-batch-no-confirm'));
        self::assertStringContainsString('Merge Selected', $mergeBtn->text());
        self::assertStringContainsString('fa-file-zipper', $mergeBtn->html());
    }

    public function testBatchMergeRejectsFewerThanTwoDocuments(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $doc = DocumentFactory::createOne(['under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseIsSuccessful();

        $mergeBtn = $crawler->filter('[data-action-name="batchMerge"]');
        $actionUrl = $mergeBtn->attr('data-action-url');
        $csrfToken = $mergeBtn->attr('data-action-csrf-token');

        $client->request(
            'POST',
            $actionUrl,
            [
                'batchActionName' => 'batchMerge',
                'entityFqcn' => Document::class,
                'batchActionCsrfToken' => $csrfToken,
                'batchActionEntityIds' => [$doc->getId()],
            ]
        );

        self::assertResponseRedirects();
        $client->followRedirect();
        self::assertSelectorExists('.alert-warning');
        self::assertSelectorTextContains('.alert-warning', 'at least 2 documents');
    }

    public function testBatchMergeRedirectsToMergeConfirmPage(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $doc1 = DocumentFactory::createOne(['name' => 'Doc One', 'under_review' => true]);
        $doc2 = DocumentFactory::createOne(['name' => 'Doc Two', 'under_review' => true]);

        $crawler = $client->request('GET', 'https://localhost/admin/document-pending');
        self::assertResponseIsSuccessful();

        $mergeBtn = $crawler->filter('[data-action-name="batchMerge"]');
        $actionUrl = $mergeBtn->attr('data-action-url');
        $csrfToken = $mergeBtn->attr('data-action-csrf-token');

        $client->request(
            'POST',
            $actionUrl,
            [
                'batchActionName' => 'batchMerge',
                'entityFqcn' => Document::class,
                'batchActionCsrfToken' => $csrfToken,
                'batchActionEntityIds' => [$doc1->getId(), $doc2->getId()],
            ]
        );

        self::assertResponseRedirects('/admin/document-pending/merge-confirm');
        $confirmCrawler = $client->followRedirect();
        self::assertResponseIsSuccessful();

        self::assertSelectorTextContains('h1', 'Merge Pending Documents');
        self::assertSelectorExists('.bc-merge-table');
        self::assertStringContainsString('Doc One', $confirmCrawler->filter('.bc-merge-table')->text());
        self::assertStringContainsString('Doc Two', $confirmCrawler->filter('.bc-merge-table')->text());

        // Configuration form elements
        self::assertSelectorExists('input#merge_doc_name');
        self::assertSelectorExists('select#merge_course_id');
        self::assertSelectorExists('select#merge_category_id');
        self::assertSelectorExists('select#merge_year');
        self::assertSelectorExists('input#approve_immediately');
        self::assertSelectorExists('button[type="submit"]');
    }

    public function testMergeProcessCreatesZipAndMergesDocuments(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $file1 = $this->storeFile('exam-q.pdf', '%PDF-1.4 Question Sheet');
        $file2 = $this->storeFile('exam-a.pdf', '%PDF-1.4 Answer Sheet');

        $course = CourseFactory::createOne();
        $category = DocumentCategoryFactory::createOne();
        $tag = TagFactory::createOne(['name' => 'Exam2024']);

        $doc1 = DocumentFactory::createOne(
            [
            'name' => 'Exam 2024 Questions',
            'fileName' => $file1,
            'under_review' => true,
            'course' => $course,
            'category' => $category,
            ]
        );
        $doc2 = DocumentFactory::createOne(
            [
            'name' => 'Exam 2024 Answers',
            'fileName' => $file2,
            'under_review' => true,
            'course' => $course,
            'category' => $category,
            'tags' => [$tag],
            ]
        );

        $url = 'https://localhost/admin/document-pending/merge-confirm?ids[]='
            . $doc1->getId() . '&ids[]=' . $doc2->getId();
        $crawler = $client->request('GET', $url);
        self::assertResponseIsSuccessful();

        $token = $crawler->filter('input[name="_token"]')->attr('value');

        $client->request(
            'POST',
            'https://localhost/admin/document-pending/merge-process',
            [
                '_token' => $token,
                'primary_id' => $doc1->getId(),
                'merge_ids' => [$doc1->getId(), $doc2->getId()],
                'name' => 'Complete Exam June 2024',
                'course_id' => $course->getId(),
                'category_id' => $category->getId(),
                'year' => '2023 - 2024',
                'approve_immediately' => '0',
            ]
        );

        self::assertResponseRedirects('/admin/document-pending');
        $client->followRedirect();
        self::assertSelectorExists('.alert-success');
        self::assertSelectorTextContains(
            '.alert-success',
            'Successfully merged 2 documents into "Complete Exam June 2024"'
        );

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $docRepo = $em->getRepository(Document::class);

        // Doc 2 must be deleted
        $em->clear();
        self::assertNull($docRepo->find($doc2->getId()), 'Companion document should be removed from database');

        // Doc 1 must be updated
        $mergedDoc = $docRepo->find($doc1->getId());
        self::assertNotNull($mergedDoc);
        self::assertSame('Complete Exam June 2024', $mergedDoc->getName());
        self::assertSame('2023 - 2024', $mergedDoc->getYear());
        self::assertTrue($mergedDoc->isUnderReview(), 'Should remain pending when approve_immediately is not checked');

        // Merged doc must have tag inherited from doc2
        $tagNames = $mergedDoc->getTags()->map(fn(Tag $t) => $t->getName())->toArray();
        self::assertContains('Exam2024', $tagNames);

        // Merged doc must have a ZIP file
        $storedFilename = (string) $mergedDoc->getFileName();
        self::assertStringEndsWith('.zip', $storedFilename);

        /** @var StorageInterface $storage */
        $storage = static::getContainer()->get(StorageInterface::class);
        $stream = $storage->resolveStream($mergedDoc, 'file');
        self::assertNotNull($stream);

        $tempLocalZip = tempnam(sys_get_temp_dir(), 'test_verify_') . '.zip';
        file_put_contents($tempLocalZip, stream_get_contents($stream));
        fclose($stream);
        $this->createdFiles[] = $tempLocalZip;

        $zip = new ZipArchive();
        self::assertTrue($zip->open($tempLocalZip));
        self::assertSame(2, $zip->numFiles);

        $extracted1 = $zip->getFromName('Exam 2024 Questions.pdf');
        $extracted2 = $zip->getFromName('Exam 2024 Answers.pdf');
        $zip->close();

        self::assertSame('%PDF-1.4 Question Sheet', $extracted1);
        self::assertSame('%PDF-1.4 Answer Sheet', $extracted2);
    }

    public function testMergeProcessWithApproveImmediatelyApprovesMergedDocument(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $file1 = $this->storeFile('doc-a.txt', 'Doc A text');
        $file2 = $this->storeFile('doc-b.txt', 'Doc B text');

        $doc1 = DocumentFactory::createOne(['fileName' => $file1, 'under_review' => true]);
        $doc2 = DocumentFactory::createOne(['fileName' => $file2, 'under_review' => true]);

        $url = 'https://localhost/admin/document-pending/merge-confirm?ids[]='
            . $doc1->getId() . '&ids[]=' . $doc2->getId();
        $crawler = $client->request('GET', $url);
        self::assertResponseIsSuccessful();

        $token = $crawler->filter('input[name="_token"]')->attr('value');

        $client->request(
            'POST',
            'https://localhost/admin/document-pending/merge-process',
            [
                '_token' => $token,
                'primary_id' => $doc1->getId(),
                'merge_ids' => [$doc1->getId(), $doc2->getId()],
                'name' => 'Approved Package',
                'course_id' => $doc1->getCourse()->getId(),
                'category_id' => $doc1->getCategory()->getId(),
                'year' => '',
                'approve_immediately' => '1',
            ]
        );

        self::assertResponseRedirects('/admin/document-pending');

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $mergedDoc = $em->getRepository(Document::class)->find($doc1->getId());
        self::assertNotNull($mergedDoc);
        self::assertFalse(
            $mergedDoc->isUnderReview(),
            'Document should be approved when approve_immediately is checked'
        );
    }

    public function testMergeProcessRejectsInvalidCsrfToken(): void
    {
        $client = static::createClient();
        $client->loginUser($this->moderator());

        $doc1 = DocumentFactory::createOne(['under_review' => true]);
        $doc2 = DocumentFactory::createOne(['under_review' => true]);

        $client->request(
            'POST',
            'https://localhost/admin/document-pending/merge-process',
            [
                '_token' => 'invalid-token',
                'primary_id' => $doc1->getId(),
                'merge_ids' => [$doc1->getId(), $doc2->getId()],
                'name' => 'Should Fail',
                'course_id' => $doc1->getCourse()->getId(),
                'category_id' => $doc1->getCategory()->getId(),
            ]
        );

        self::assertResponseRedirects('/admin/document-pending');
        $client->followRedirect();
        self::assertSelectorExists('.alert-danger');
        self::assertSelectorTextContains('.alert-danger', 'Invalid CSRF token');
    }

    public function testMergeActionsRequireModeratorRole(): void
    {
        $client = static::createClient();
        $user = UserFactory::createOne(['roles' => [User::ROLE_USER]]);
        $client->loginUser($user);

        $client->request('GET', 'https://localhost/admin/document-pending/merge-confirm?ids[]=1&ids[]=2');
        self::assertResponseStatusCodeSame(403);

        $client->request('POST', 'https://localhost/admin/document-pending/merge-process', ['_token' => 'x']);
        self::assertResponseStatusCodeSame(403);
    }
}
