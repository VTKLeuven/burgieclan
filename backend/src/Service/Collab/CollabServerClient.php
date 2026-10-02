<?php

namespace App\Service\Collab;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Asks the collab server to change a live document, for the few things Symfony itself starts:
 * rolling back to a revision, dropping connections after a lock, and telling everyone who has a
 * document open that something around it changed.
 *
 * Changes to a live document must go through the collab server so every connected browser gets
 * them as a normal edit (see collab/README.md). Requests are signed the same way as the ones the
 * collab server sends here (CollabRequestSignature), and it checks them the same way
 * (collab/src/internal.ts).
 */
class CollabServerClient
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly CollabRequestSignature $signature,
        #[Autowire(env: 'COLLAB_INTERNAL_URL')]
        private readonly string $baseUrl,
    ) {}

    /**
     * Replaces the content of a live document with an earlier state (a Yjs update, e.g. from a
     * CollabDocumentRevision). Everyone who has it open sees the change at once, and the result is
     * stored like any other edit.
     *
     * @throws CollabServerException
     */
    public function restore(string $documentName, string $state): void
    {
        $this->post(
            sprintf('/internal/documents/%s/restore', rawurlencode($documentName)),
            (string) json_encode(['state' => base64_encode($state)])
        );
    }

    /**
     * Closes every connection to a document. Browsers reconnect straight away with a new token,
     * so a lock or reopen takes effect for people who already had the document open.
     *
     * @throws CollabServerException
     */
    public function disconnect(string $documentName): void
    {
        $this->post(sprintf('/internal/documents/%s/disconnect', rawurlencode($documentName)), '');
    }

    /**
     * Sends a small JSON message to everyone who has the document open, as a Hocuspocus stateless
     * message. Nothing happens when nobody has it open. A short timeout: this is a notification,
     * sent while someone waits for their own request.
     *
     * @param array<string, scalar> $message
     *
     * @throws CollabServerException
     */
    public function broadcast(string $documentName, array $message): void
    {
        $this->post(
            sprintf('/internal/documents/%s/broadcast', rawurlencode($documentName)),
            (string) json_encode($message),
            3
        );
    }

    /**
     * @throws CollabServerException
     */
    private function post(string $path, string $body, int $timeout = 10): void
    {
        $timestamp = time();
        $headers = [
            'Content-Type' => 'application/json',
            CollabRequestSignature::HEADER_TIMESTAMP => (string) $timestamp,
            CollabRequestSignature::HEADER_SIGNATURE => $this->signature->sign('POST', $path, $timestamp, $body),
        ];
        $url = rtrim($this->baseUrl, '/') . $path;
        $options = ['headers' => $headers, 'body' => $body, 'timeout' => $timeout];

        try {
            $response = $this->httpClient->request('POST', $url, $options);
            $status = $response->getStatusCode();
        } catch (ExceptionInterface $exception) {
            throw new CollabServerException('The collab server could not be reached.', 0, $exception);
        }

        if ($status < 200 || $status >= 300) {
            throw new CollabServerException(sprintf('The collab server answered HTTP %d.', $status));
        }
    }
}
