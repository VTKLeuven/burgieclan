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
        $programs = [];
        foreach ($zipApi->programs as $program) {
            $programs[] = $this->microMapper->map($program, Program::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $modules = [];
        foreach ($zipApi->modules as $module) {
            $modules[] = $this->microMapper->map($module, Module::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }
        $courses = [];
        foreach ($zipApi->courses as $course) {
            $courses[] = $this->microMapper->map($course, Course::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }

        $zip = new ZipArchive();
        $content = '';

        if (!empty($programs)) {
            foreach ($programs as $program) {
                foreach ($program->getModules() as $module) {
                    foreach ($module->getCourses() as $course) {
                        foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
                            $content .= $document->getFileName();
                        }
                    }
                }
            }
        }
        if (!empty($modules)) {
            foreach ($modules as $module) {
                foreach ($module->getCourses() as $course) {
                    foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
                        $content .= $document->getFileName();
                    }
                }
            }
        }
        if (!empty($courses)) {
            foreach ($courses as $course) {
                foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
                    $content .= $document->getFileName();
                }
            }
        }

        if (!empty($content)) {
            $hash = md5($content);
            $date = (new DateTime())->format('Y-m-d');
            $file_name = sprintf('%s/data/exports/document-export-%s-%s.zip', $this->kernel->getProjectDir(), $date, $hash);

            if (!file_exists($file_name) && $zip->open($file_name, ZipArchive::CREATE) === true) {
                if (!empty($programs)) {
                    foreach ($programs as $program) {
                        $zip->addEmptyDir($program->getName());
                        foreach ($program->getModules() as $module) {
                            $zip->addEmptyDir($module->getName());
                            foreach ($module->getCourses() as $course) {
                                $zip->addEmptyDir($course->getName());
                                foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
                                    $path = $this->storage->resolvePath($document, 'file');
                                    $zip->addFile($path, $program->getName() . '/' . $module->getName() . '/' . $course->getName() . '/' . $document->getFileName());
                                }
                            }
                        }
                    }
                }
                if (!empty($modules)) {
                    foreach ($modules as $module) {
                        $zip->addEmptyDir($module->getName());
                        foreach ($module->getCourses() as $course) {
                            $zip->addEmptyDir($course->getName());
                            foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
                                $path = $this->storage->resolvePath($document, 'file');
                                $zip->addFile($path, $module->getName() . '/' . $course->getName() . '/' . $document->getFileName());
                            }
                        }
                    }
                }
                if (!empty($courses)) {
                    foreach ($courses as $course) {
                        $zip->addEmptyDir($course->getName());
                        foreach ($this->documentRepository->findByCourseAndHasFile($course) as $document) {
                            $path = $this->storage->resolvePath($document, 'file');
                            $zip->addFile($path, $course->getName() . '/' . $document->getFileName());
                        }
                    }
                }
            }

            $response = new Response(file_get_contents($file_name));
            $response->headers->set('Content-Type', 'application/zip');
            $response->headers->set('Content-Disposition', 'attachment;filename="' . $file_name . '"');
            $response->headers->set('Content-length', filesize($file_name));

            return $response;
        }
        return new Response('No content to zip', Response::HTTP_NO_CONTENT);
    }
}
