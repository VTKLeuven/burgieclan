<?php

namespace App\Controller\Api;

use App\ApiResource\ZipApi;
use App\Entity\Course;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\DocumentRepository;
use DateTime;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;
use ZipArchive;

final class DownloadZipController extends AbstractController
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
        private readonly DocumentRepository   $documentRepository,
        private readonly StorageInterface     $storage,
        private readonly KernelInterface      $kernel,
    ) {
    }

    public function __invoke(ZipApi $zipApi): Response
    {
        $programs = $this->mapEntities($zipApi->programs, Program::class);
        $modules = $this->mapEntities($zipApi->modules, Module::class);
        $courses = $this->mapEntities($zipApi->courses, Course::class);

        $contentHash = $this->generateContentHash($programs, $modules, $courses);

        if ($contentHash !== md5('')) {
            $fileName = $this->createZipFile($contentHash, $programs, $modules, $courses);
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
    private function generateContentHash(array $programs, array $modules, array $courses): string
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

    private function createZipFile(string $contentHash, array $programs, array $modules, array $courses): string
    {
        $fileName = sprintf('%s/data/exports/%s.zip', $this->kernel->getProjectDir(), $contentHash);

        $zip = new ZipArchive();
        if (!file_exists($fileName) && $zip->open($fileName, ZipArchive::CREATE) === true) {
            $this->addProgramsToZip($zip, $programs);
            $this->addModulesToZip($zip, $modules, '');
            $this->addCoursesToZip($zip, $courses, '');
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
            foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
                $path = $this->storage->resolvePath($document, 'file');
                $zip->addFile($path, $courseName . '/' . $document->getFileName());
            }
        }
    }

    private function createFileResponse(string $fileName): Response
    {
        $response = new Response(file_get_contents($fileName));
        $response->headers->set('Content-Type', 'application/zip');
        $response->headers->set('Content-Disposition', 'attachment;filename="document-export-' .
            (new DateTime())->format('Y-m-d') . '.zip"');
        $response->headers->set('Content-length', filesize($fileName));

        return $response;
    }
}
