<?php

namespace App\Controller\Api;

use ApiPlatform\Metadata\IriConverterInterface;
use App\ApiResource\CourseApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCategoryApi;
use App\ApiResource\TagApi;
use App\Entity\Document;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;

class CreateDocumentController extends AbstractController
{
    public const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

    /**
     * Allowed lowercase file extensions (mirrors frontend/src/utils/constants/upload.ts, excluding svg).
     *
     * @var list<string>
     */
    private const ALLOWED_EXTENSIONS = [
        // Documents & Text
        'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp',
        'txt', 'rtf', 'csv', 'md', 'markdown',
        // Images (svg excluded due to active script/XSS risk)
        'jpg', 'jpeg', 'png', 'gif', 'webp',
        // Archives
        'zip', 'tar', 'gz', '7z', 'rar',
        // Code & Scripts (including Matlab)
        'py', 'm', 'mat', 'mlx', 'slx', 'mdl', 'fig', 'p', 'r', 'c', 'cpp', 'h', 'java',
        // CAD & 3D Formats
        'step', 'stp', 'iges', 'igs', 'stl', 'obj', 'dwg', 'dxf',
        'sldprt', 'sldasm', 'slddrw', 'ipt', 'iam', 'idw', 'f3d', 'f3z',
        'catpart', 'catproduct', 'catdrawing', 'prt', 'asm', 'par', 'psm',
        // Media
        'mp4',
    ];

    /**
     * Allowed MIME types (mirrors frontend/src/utils/constants/upload.ts, excluding image/svg+xml,
     * plus generic types finfo reports for allowed source/binary/office/CAD extensions).
     *
     * @var list<string>
     */
    private const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'application/rtf',
        'text/rtf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/x-zip-compressed',
        'application/x-tar',
        'application/gzip',
        'application/x-gzip',
        'application/x-7z-compressed',
        'application/x-rar-compressed',
        'application/x-rar',
        'text/csv',
        'text/plain',
        'text/markdown',
        'text/x-matlab',
        'application/x-matlab',
        'application/x-matlab-data',
        'application/matlab',
        'text/x-python',
        'text/x-script.python',
        'application/x-python-code',
        'text/x-c',
        'text/x-c++',
        'text/x-java',
        'text/x-objc',
        'video/mp4',
        // CAD & 3D MIME types
        'model/step',
        'application/step',
        'application/x-step',
        'model/iges',
        'application/iges',
        'application/x-iges',
        'model/stl',
        'application/sla',
        'application/vnd.ms-pki.stl',
        'application/x-stl',
        'image/vnd.dwg',
        'application/dwg',
        'application/x-dwg',
        'image/x-dwg',
        'application/acad',
        'application/x-acad',
        'image/vnd.dxf',
        'application/dxf',
        'application/x-dxf',
        'image/x-dxf',
        'model/obj',
        'application/object',
        'application/sldworks',
        'application/x-solidworks',
        'application/x-inventor',
        // Generic container/binary types reported by finfo for .mat, .doc, .xls, CAD, etc.
        'application/octet-stream',
        'application/x-ole-storage',
        'application/cdfv2',
    ];

    /**
     * Dangerous MIME types that are always rejected even if renamed to an allowed extension.
     *
     * @var list<string>
     */
    private const DENIED_MIME_TYPES = [
        'text/html',
        'application/xhtml+xml',
        'image/svg+xml',
        'text/javascript',
        'application/javascript',
        'application/x-javascript',
        'application/x-php',
        'text/x-php',
        'application/x-httpd-php',
        'application/x-executable',
        'application/x-dosexec',
        'application/x-msdownload',
        'application/x-sharedlib',
        'application/x-elf',
        'application/x-mach-binary',
        'application/x-sh',
        'text/x-shellscript',
        'application/x-csh',
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly IriConverterInterface $iriConverter,
        private readonly MicroMapperInterface $microMapper,
        private readonly StorageInterface $storage,
    ) {}

    public function __invoke(Request $request): DocumentApi
    {
        $dto = new DocumentApi();

        // Get all variables from the request (these are IRI's), convert them to an object and add them to the dto.
        // If a variable is missing, throw a BadRequestHttpException.
        $dto->name = $request->request->get('name') ?? throw new BadRequestHttpException('"name" is required');
        /** @var CourseApi $course */
        $course = $this->iriConverter->getResourceFromIri(
            $request->request->get('course') ??
                throw new BadRequestHttpException('"course" is required')
        );
        $dto->course = $course;
        /** @var DocumentCategoryApi $category */
        $category = $this->iriConverter->getResourceFromIri(
            $request->request->get('category') ??
                throw new BadRequestHttpException('"category" is required')
        );
        $dto->category = $category;

        $dto->year = $request->request->get('year');

        $anonymous = $request->request->get('anonymous') === 'true';
        $dto->anonymous = $anonymous;

        $dto->tags = [];
        // Get all tags from the request (Symfony collects multiple 'tags' parameters as an array)
        $tagsArray = $request->request->all('tags');
        if (!empty($tagsArray)) {
            foreach ($tagsArray as $tagIri) {
                if (empty($tagIri)) {
                    continue;
                }
                try {
                    /** @var TagApi $tag */
                    $tag = $this->iriConverter->getResourceFromIri($tagIri);
                    $dto->tags[] = $tag;
                } catch (Exception $e) {
                    throw new BadRequestHttpException($e->getMessage() . ' - Invalid tag IRI: ' . $tagIri);
                }
            }
        }

        $dto->parts = array_values(
            array_filter(
                array_map(
                    static fn(mixed $part): string => is_string($part) ? trim($part) : '',
                    $request->request->all('parts')
                ),
                static fn(string $part): bool => $part !== ''
            )
        );

        // Convert the documentDto to an actual Document.
        $document = $this->microMapper->map($dto, Document::class);
        $dto->parts = $document->getParts();

        $uploadedFile = $request->files->get('file');
        if (!$uploadedFile instanceof UploadedFile) {
            throw new BadRequestHttpException('"file" is required');
        }

        $this->validateUploadedFile($uploadedFile);

        $document->setFile($uploadedFile);

        // Persist the document to the database.
        $this->entityManager->persist($document);
        $this->entityManager->flush();

        // Add the id of the persisted document to the dto.
        $dto->id = $document->getId();
        // Generate the url to the file.
        $dto->contentUrl = $this->storage->resolveUri($document, 'file');

        // The return value is the object that gets send as reply to the user calling the API endpoint.
        return $dto;
    }

    private function validateUploadedFile(UploadedFile $file): void
    {
        if (!$file->isValid()) {
            $tooLarge = [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE];
            if (in_array($file->getError(), $tooLarge, true)) {
                throw new BadRequestHttpException('File exceeds the maximum allowed size of 200 MB.');
            }

            throw new BadRequestHttpException('Invalid file upload: ' . $file->getErrorMessage());
        }

        $size = $file->getSize();
        if (false === $size || $size > self::MAX_FILE_SIZE) {
            throw new BadRequestHttpException('File exceeds the maximum allowed size of 200 MB.');
        }

        $extension = strtolower(pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
        if ('' === $extension || !in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new BadRequestHttpException(
                sprintf('File extension ".%s" is not allowed.', $extension)
            );
        }

        $mimeType = $file->getMimeType();
        if (null !== $mimeType) {
            $normalizedMime = strtolower(trim(explode(';', $mimeType)[0]));
            if (
                in_array($normalizedMime, self::DENIED_MIME_TYPES, true)
                || !in_array($normalizedMime, self::ALLOWED_MIME_TYPES, true)
            ) {
                throw new BadRequestHttpException(
                    sprintf('File MIME type "%s" is not allowed.', $normalizedMime)
                );
            }
        }
    }
}
