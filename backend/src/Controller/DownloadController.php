<?php

namespace App\Controller;

use App\Repository\DocumentRepository;
use ErrorException;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Vich\UploaderBundle\Exception\NoFileFoundException;
use Vich\UploaderBundle\Handler\DownloadHandler;

#[Route('/files/download')]
final class DownloadController extends AbstractController
{
    #[Route('/{filename}', name: 'document_download', methods: ['GET'])]
    public function __invoke(
        Request            $request,
        string             $filename,
        DocumentRepository $documentRepository,
        DownloadHandler    $downloadHandler
    ): Response {
        $document = $documentRepository->findOneBy(['file_name' => $filename]);

        // If the document record doesn't exist, return 404 early.
        if (null === $document) {
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        }

        try {
            // Context:
            // - Vich's storage uses `fopen($path, 'rb')` to build a stream.
            // - When the underlying file was deleted, PHP emits an E_WARNING and returns `false` (not `null`).
            // - Vich's DownloadHandler only guards against `null` streams and may proceed with an invalid resource.
            // - In dev, Symfony can later convert the warning to an ErrorException outside this try/catch;
            //   in prod, it might just log.
            // Solution:
            // - Locally convert warnings to exceptions within this small scope so we can reliably catch and
            //   return a 404, without patching vendor code or decorating Vich services.
            // - The handler is restored in `finally` to avoid side effects.
            // Convert PHP warnings (like fopen ENOENT) to exceptions inside this block
            $prevHandler = \set_error_handler(
                static function (int $severity, string $message, string $file = '', int $line = 0) {
                    if ($severity & (E_WARNING | E_USER_WARNING)) {
                        throw new ErrorException($message, 0, $severity, $file, $line);
                    }
                    // Use previous handler for other severities
                    return false;
                }
            );

            try {
                return $downloadHandler->downloadObject(
                    $document,
                    'file',
                    null,
                    null,
                    false
                );
            } finally {
                // Always restore the previous error handler to keep global error handling intact
                \restore_error_handler();
            }
        } catch (NoFileFoundException $e) {
            // Vich signals missing file via its own exception in some code paths
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        } catch (ErrorException $e) {
            // An fopen E_WARNING (ENOENT) converted to ErrorException by our scoped handler above -> treat as 404
            return new Response('File not found', Response::HTTP_NOT_FOUND);
        } catch (Exception $e) {
            return new Response('Some other error', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
