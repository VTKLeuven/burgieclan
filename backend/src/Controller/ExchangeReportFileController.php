<?php

namespace App\Controller;

use App\Entity\ExchangeReportFile;
use App\Entity\User;
use App\Service\Exchange\ExchangeReportFileStore;
use Doctrine\ORM\EntityManagerInterface;
use League\Flysystem\FilesystemException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\UriSigner;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Serves the files attached to exchange reports:
 *
 *  - /files/exchange/{fileName}: for links signed by ExchangeReportFileUrlGenerator, while files
 *    are stored locally. On S3 those links point at the bucket instead.
 *  - /admin/exchange-file/{fileName}: for moderators reviewing a report in the admin, behind the
 *    admin session.
 */
class ExchangeReportFileController extends AbstractController
{
    private const FILE_NAME = '[0-9a-f-]{36}\.[a-z]{3,4}';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ExchangeReportFileStore $store,
    ) {}

    #[Route('/files/exchange/{fileName}', name: 'exchange_report_file_signed', requirements: ['fileName' => self::FILE_NAME], methods: ['GET'])]
    public function signed(string $fileName, Request $request, UriSigner $uriSigner): Response
    {
        // The signature covers the path and carries its own expiry, so it stands in for the
        // access check the API did before signing.
        if (!$uriSigner->check($request->getRequestUri())) {
            return new Response('Link expired or invalid', Response::HTTP_FORBIDDEN);
        }

        return $this->serve($fileName);
    }

    #[Route('/admin/exchange-file/{fileName}', name: 'admin_exchange_report_file', requirements: ['fileName' => self::FILE_NAME], methods: ['GET'])]
    public function forAdmin(string $fileName): Response
    {
        $this->denyAccessUnlessGranted(User::ROLE_MODERATOR);

        return $this->serve($fileName);
    }

    private function serve(string $fileName): Response
    {
        $file = $this->entityManager->getRepository(ExchangeReportFile::class)->findOneBy(['fileName' => $fileName]);
        if (null === $file) {
            return new Response('Not found', Response::HTTP_NOT_FOUND);
        }

        try {
            $stream = $this->store->readStream($file);
        } catch (FilesystemException) {
            return new Response('Not found', Response::HTTP_NOT_FOUND);
        }

        $name = $file->getOriginalName();
        $fallback = preg_replace('/[^A-Za-z0-9._-]/', '_', $name) ?: 'file.' . $file->getExtension();
        $inline = ExchangeReportFileStore::isInline($file);

        return new StreamedResponse(
            static function () use ($stream): void {
                fpassthru($stream);
                fclose($stream);
            },
            Response::HTTP_OK,
            [
                'Content-Type' => ExchangeReportFileStore::contentType($file),
                'Content-Length' => (string) $file->getSize(),
                'Content-Disposition' => HeaderUtils::makeDisposition(
                    $inline ? HeaderUtils::DISPOSITION_INLINE : HeaderUtils::DISPOSITION_ATTACHMENT,
                    $name,
                    $fallback
                ),
                'Cache-Control' => 'private, max-age=600',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }
}
