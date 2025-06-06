<?php

namespace App\Controller\Api;

use App\ApiResource\ZipApi;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\DocumentRepository;
use DateTime;
use RuntimeException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;
use ZipArchive;

final class DownloadZipController extends AbstractController
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
        private readonly DocumentRepository $documentRepository,
        private readonly StorageInterface $storage,
        private readonly KernelInterface $kernel,
    ) {
    }

    public function __invoke(ZipApi $zipApi): Response
    {
        $programs = $this->mapEntities($zipApi->programs, Program::class);
        $modules = $this->mapEntities($zipApi->modules, Module::class);
        $courses = $this->mapEntities($zipApi->courses, Course::class);
        $documents = $this->mapEntities($zipApi->documents, Document::class);

        $contentHash = $this->generateContentHash($programs, $modules, $courses, $documents);

        if ($contentHash !== md5('')) {
            $fileName = $this->createZipFile($contentHash, $programs, $modules, $courses, $documents);
            return $this->createFileResponse($fileName);
        }

        return new Response('No content to zip', Response::HTTP_NO_CONTENT);
    }

    private function mapEntities(array $entities, string $class): array
    {
        return array_map(fn($entity) => $this->microMapper->map($entity, $class, [
            MicroMapperInterface::MAX_DEPTH => 0,
        ]), $entities);
    }

    /**
     * @param Program[] $programs
     * @param Module[]  $modules
     * @param Course[]  $courses
     */
    private function generateContentHash(array $programs, array $modules, array $courses, array $documents): string
    {
        $content = '';

        foreach ($programs as $program) {
            $content .= $this->getModuleContent($program->getModules()->toArray());
        }

        foreach ($modules as $module) {
            $content .= $this->getModuleContent([$module]);
        }

        foreach ($courses as $course) {
            $content .= $this->getCourseContent($course);
        }

        foreach ($documents as $document) {
            $content .= $document->getFileName();
        }

        return md5($content);
    }

    /**
     * @param Module[] $modules
     * @return string
     */
    private function getModuleContent(array $modules): string
    {
        $content = '';

        foreach ($modules as $module) {
            $content .= $module->getName();
            $content .= $this->getModuleContent($module->getModules()->toArray());
            foreach ($module->getCourses()->toArray() as $course) {
                $content .= $this->getCourseContent($course);
            }
        }

        return $content;
    }

    /**
     * @param Course $course
     * @return string
     */
    private function getCourseContent(Course $course): string
    {
        $content = $course->getName();

        foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
            $content .= $document->getFileName();
        }

        return $content;
    }

    private function createZipFile(
        string $contentHash,
        array $programs,
        array $modules,
        array $courses,
        array $documents
    ): string {
        $fileName = sprintf('%s/data/exports/%s.zip', $this->kernel->getProjectDir(), $contentHash);

        $zip = new ZipArchive();
        if (!file_exists($fileName) && $zip->open($fileName, ZipArchive::CREATE) === true) {
            $this->addProgramsToZip($zip, $programs);
            $this->addModulesToZip($zip, $modules, '');
            $this->addCoursesToZip($zip, $courses, '');
            $this->addDocumentsToZip($zip, $documents, '');
            $zip->close();
        }

        return $fileName;
    }

    private function addProgramsToZip(ZipArchive $zip, array $programs): void
    {
        foreach ($programs as $program) {
            $programName = $program->getName();
            $zip->addEmptyDir($programName);
            $this->addModulesToZip($zip, $program->getModules()->toArray(), $programName);
        }
    }

    private function addModulesToZip(ZipArchive $zip, array $modules, string $parentDir): void
    {
        foreach ($modules as $module) {
            $moduleName = $parentDir ? $parentDir . '/' . $module->getName() : $module->getName();
            $zip->addEmptyDir($moduleName);
            $this->addModulesToZip($zip, $module->getModules()->toArray(), $moduleName);
            $this->addCoursesToZip($zip, $module->getCourses()->toArray(), $moduleName);
        }
    }

    private function addCoursesToZip(ZipArchive $zip, array $courses, string $parentDir): void
    {
        foreach ($courses as $course) {
            $courseName = $parentDir ? $parentDir . '/' . $course->getName() : $course->getName();
            $zip->addEmptyDir($courseName);
            $documents = $this->documentRepository->findByCourseAndHasFile($course);
            $this->addDocumentsToZip($zip, $documents, $courseName);
        }
    }

    private function addDocumentsToZip(ZipArchive $zip, array $documents, string $parentDir): void
    {
        $documentsByCategory = [];
        foreach ($documents as $document) {
            $category = $document->getCategory()->getName();
            if (!isset($documentsByCategory[$category])) {
                $documentsByCategory[$category] = [];
            }
            $documentsByCategory[$category][] = $document;
        }

        // Track used filenames within each category to handle duplicates
        $usedFilenames = [];

        foreach ($documentsByCategory as $category => $categoryDocuments) {
            $categoryDir = $parentDir . '/' . $category;
            $zip->addEmptyDir($categoryDir);
            $usedFilenames[$category] = [];

            foreach ($categoryDocuments as $document) {
                if ($document->getFileName()) {
                    $filePath = $this->storage->resolvePath($document, 'file');
                    if (file_exists($filePath)) {
                        $originalFileName = $document->getFileName();
                        $fileNameToUse = $this->getUniqueFileName($originalFileName, $usedFilenames[$category]);
                        $usedFilenames[$category][] = $fileNameToUse;

                        $zip->addFile($filePath, $categoryDir . '/' . $fileNameToUse);
                    }
                }
            }
        }
    }

    /**
     * Ensures a filename is unique by adding a numerical suffix if needed
     *
     * @param string $fileName Original filename
     * @param array $existingFiles List of filenames already in use
     * @return string Unique filename
     */
    private function getUniqueFileName(string $fileName, array $existingFiles): string
    {
        if (!in_array($fileName, $existingFiles)) {
            return $fileName;
        }

        $pathInfo = pathinfo($fileName);
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
        $baseName = $pathInfo['filename'];
        $counter = 1;

        // Keep incrementing counter until we find an unused filename
        while (in_array("{$baseName}_{$counter}{$extension}", $existingFiles)) {
            $counter++;
        }

        return "{$baseName}_{$counter}{$extension}";
    }

    private function createFileResponse(string $fileName): Response
    {
        if (!file_exists($fileName)) {
            throw new RuntimeException('File not found');
        }

        $fileSize = filesize($fileName);
        // TODO check if this works on a proper production server. With big files (5GB) it fills up the memory.
        // This could be because of the symfony development server
        $response = new StreamedResponse(function () use ($fileName, $fileSize) {
            $handle = fopen($fileName, 'rb');

            if ($handle === false) {
                throw new RuntimeException('Could not open file for reading');
            }

            $length = $fileSize;
            $request = Request::createFromGlobals();

            // Handle range requests
            if ($request->headers->has('Range')) {
                $range = $request->headers->get('Range');
                if (preg_match('/bytes=(\d+)-(\d+)?/', $range, $matches)) {
                    $start = intval($matches[1]);
                    $length = isset($matches[2]) ? (intval($matches[2]) - $start + 1) : ($fileSize - $start);
                    fseek($handle, $start);
                }
            }

            $remaining = $length;
            $chunkSize = 8192; // 8KB chunks

            while ($remaining > 0 && !feof($handle)) {
                $readSize = min($chunkSize, $remaining);
                $buffer = fread($handle, $readSize);
                if ($buffer === false) {
                    break;
                }
                echo $buffer;
                flush();
                $remaining -= strlen($buffer);
            }

            fclose($handle);
        });

        $response->headers->set('Content-Type', 'application/zip');
        $response->headers->set('Content-Disposition', 'attachment;filename="document-export-' .
            (new DateTime())->format('Y-m-d') . '.zip"');
        $response->headers->set('Accept-Ranges', 'bytes');
        $response->headers->set('Content-Length', $fileSize);
        // disables FastCGI buffering in nginx only for this response
        $response->headers->set('X-Accel-Buffering', 'no');

        $request = Request::createFromGlobals();
        if ($request->headers->has('Range')) {
            $response->setStatusCode(Response::HTTP_PARTIAL_CONTENT);
            $range = $request->headers->get('Range');
            if (preg_match('/bytes=(\d+)-(\d+)?/', $range, $matches)) {
                $start = intval($matches[1]);
                $end = isset($matches[2]) ? intval($matches[2]) : ($fileSize - 1);
                $response->headers->set('Content-Range', sprintf('bytes %d-%d/%d', $start, $end, $fileSize));
                $response->headers->set('Content-Length', $end - $start + 1);
            }
        }
        return $response;
    }
}
