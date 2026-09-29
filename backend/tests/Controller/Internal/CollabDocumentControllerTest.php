<?php

namespace App\Tests\Controller\Internal;

use App\Factory\ExamFactory;
use App\Repository\CollabDocumentRepository;
use App\Repository\CollabDocumentRevisionRepository;
use App\Service\Collab\CollabRequestSignature;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Browser\KernelBrowser;
use Zenstruck\Browser\Test\HasBrowser;

class CollabDocumentControllerTest extends KernelTestCase
{
    use HasBrowser;

    private const PATH = '/internal/collab/documents/collab-test';

    public function testUnsignedRequestsAreRejected(): void
    {
        $this->browser()->get(self::PATH)->assertStatus(401);
        $this->browser()
            ->put(self::PATH, ['body' => json_encode(['state' => base64_encode("\x01\x02")])])
            ->assertStatus(401);
    }

    public function testTamperedOrStaleSignaturesAreRejected(): void
    {
        $body = json_encode(['state' => base64_encode("\x01\x02"), 'content' => null]);

        // Signed for a different body.
        $headers = $this->signedHeaders('PUT', self::PATH, '{}');
        $this->browser()->put(self::PATH, ['headers' => $headers, 'body' => $body])->assertStatus(401);

        // Signed for a different document.
        $headers = $this->signedHeaders('PUT', '/internal/collab/documents/other', $body);
        $this->browser()->put(self::PATH, ['headers' => $headers, 'body' => $body])->assertStatus(401);

        // Signed too long ago.
        $headers = $this->signedHeaders('PUT', self::PATH, $body, time() - 600);
        $this->browser()->put(self::PATH, ['headers' => $headers, 'body' => $body])->assertStatus(401);
    }

    public function testUnknownDocumentIsNotFound(): void
    {
        $this->signedGet(self::PATH)->assertStatus(404);
    }

    public function testStoreThenLoadRoundTripsTheExactBytes(): void
    {
        // Every byte value, so an encoding slip anywhere (base64, bytea, stream handling) shows.
        $state = implode('', array_map('chr', range(0, 255)));
        $content = ['type' => 'doc', 'content' => [['type' => 'paragraph']]];

        $this->signedPut(self::PATH, ['state' => base64_encode($state), 'content' => $content])
            ->assertStatus(204);

        $this->assertSame($state, $this->rawBody($this->signedGet(self::PATH)->assertStatus(200)));

        // A second store updates the same row instead of adding one.
        $this->signedPut(self::PATH, ['state' => base64_encode('updated'), 'content' => null])
            ->assertStatus(204);

        $this->assertSame('updated', $this->rawBody($this->signedGet(self::PATH)->assertStatus(200)));

        $repository = self::getContainer()->get(CollabDocumentRepository::class);
        $this->assertCount(1, $repository->findBy(['name' => 'collab-test']));
        $this->assertNull($repository->findOneByName('collab-test')?->getContent());
    }

    public function testStoresFieldsAndCollectsContributors(): void
    {
        $fields = ['sittings' => [['id' => 'd1', 'label' => 'ma 20 jan']]];

        $this->signedPut(
            self::PATH,
            [
            'state' => base64_encode('one'),
            'content' => null,
            'fields' => $fields,
            'contributors' => ['12', '5'],
            ]
        )->assertStatus(204);
        $this->signedPut(
            self::PATH,
            [
            'state' => base64_encode('two'),
            'content' => null,
            'fields' => $fields,
            // Junk is dropped, not fatal: the document itself must still be stored.
            'contributors' => ['5', '7', 'x', -3, '0', null],
            ]
        )->assertStatus(204);

        $document = self::getContainer()->get(CollabDocumentRepository::class)->findOneByName('collab-test');
        $this->assertSame($fields, $document?->getFields());

        // The second store kept the first version as a revision, with the first store's editors ...
        $revision = self::getContainer()->get(CollabDocumentRevisionRepository::class)->findLatest($document);
        $this->assertSame('one', $revision?->getState());
        $this->assertSame([5, 12], $revision->getContributors());
        // ... and the second store's editors wait for the next one.
        $this->assertSame([5, 7], $document->getPendingContributors());
    }

    public function testADocumentWhoseExamWasDeletedIsNotStoredAgain(): void
    {
        $this->signedPut('/internal/collab/documents/exam-999999', ['state' => base64_encode('x')])
            ->assertStatus(410);

        $this->assertNull(self::getContainer()->get(CollabDocumentRepository::class)->findOneByName('exam-999999'));
    }

    public function testAnExistingExamIsStored(): void
    {
        $exam = ExamFactory::createOne();
        $path = '/internal/collab/documents/' . $exam->getDocumentName();

        $this->signedPut($path, ['state' => base64_encode('x')])->assertStatus(204);
        $this->assertSame('x', $this->rawBody($this->signedGet($path)->assertStatus(200)));
    }

    public function testMalformedBodiesAreRejected(): void
    {
        $this->signedPut(self::PATH, ['content' => null])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => 'not base64!!'])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => ''])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => base64_encode('x'), 'content' => 'text'])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => base64_encode('x'), 'fields' => 'text'])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => base64_encode('x'), 'contributors' => '12'])->assertStatus(400);
    }

    public function testInvalidNamesDoNotRoute(): void
    {
        $this->signedGet('/internal/collab/documents/Not_Valid')->assertStatus(404);
    }

    /**
     * The response body exactly as sent. Browser::content() drops some control bytes, which is
     * fine for HTML but not for a binary Yjs state.
     */
    private function rawBody(KernelBrowser $browser): string
    {
        return (string) $browser->client()->getResponse()->getContent();
    }

    private function signedGet(string $path): KernelBrowser
    {
        return $this->browser()->get($path, ['headers' => $this->signedHeaders('GET', $path, '')]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function signedPut(string $path, array $payload): KernelBrowser
    {
        $body = (string) json_encode($payload);

        $options = [
            'headers' => $this->signedHeaders('PUT', $path, $body) + ['Content-Type' => 'application/json'],
            'body' => $body,
        ];

        return $this->browser()->put($path, $options);
    }

    /**
     * @return array<string, string>
     */
    private function signedHeaders(string $method, string $path, string $body, ?int $timestamp = null): array
    {
        $timestamp ??= time();
        $signature = self::getContainer()->get(CollabRequestSignature::class);

        return [
            CollabRequestSignature::HEADER_TIMESTAMP => (string) $timestamp,
            CollabRequestSignature::HEADER_SIGNATURE => $signature->sign($method, $path, $timestamp, $body),
        ];
    }
}
