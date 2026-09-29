<?php

namespace App\Tests\Controller\Internal;

use App\Repository\CollabDocumentRepository;
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

    public function testMalformedBodiesAreRejected(): void
    {
        $this->signedPut(self::PATH, ['content' => null])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => 'not base64!!'])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => ''])->assertStatus(400);
        $this->signedPut(self::PATH, ['state' => base64_encode('x'), 'content' => 'text'])->assertStatus(400);
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
