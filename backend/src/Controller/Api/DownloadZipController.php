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
        $documents = $this->mapEntities($zipApi->documents, Document::class);

        $contentHash = $this->generateContentHash($programs, $modules, $courses, $documents);

        if ($contentHash !== md5('')) {
            $fileName = $this->createZipFile($contentHash, $programs, $modules, $courses, $documents);

            // Generate descriptive filename for the download
            $displayFilename = $this->generateDescriptiveFilename($programs, $modules, $courses, $documents);

            return $this->createFileResponse($fileName, $displayFilename);
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
     * @param Module[] $modules
     * @param Course[] $courses
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
        array  $programs,
        array  $modules,
        array  $courses,
        array  $documents
    ): string {
        $fileName = sprintf('%s/data/exports/%s.zip', $this->kernel->getProjectDir(), $contentHash);

        $zip = new ZipArchive();
        if (!file_exists($fileName) && $zip->open($fileName, ZipArchive::CREATE) === true) {
            $this->addProgramsToZip($zip, $programs);
            $this->addModulesToZip($zip, $modules, '');
            $this->addCoursesToZip($zip, $courses, '');
            $this->addDocumentsToZip($zip, $documents, '');

            // Generate and add HTML structure file
            $htmlContent = $this->generateHtmlStructure($programs, $modules, $courses, $documents);
            $result = $zip->addFromString('burgieclan-documents-index.html', $htmlContent);

            if (!$result) {
                // Log the error or take appropriate action if the HTML file couldn't be added
                error_log('Failed to add HTML structure to ZIP file');
            }

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

    /**
     * Generate HTML file showing the Burgieclan documents with tags and metadata
     */
    private function generateHtmlStructure(array $programs, array $modules, array $courses, array $documents): string
    {
        // Start HTML document with responsive design and interactive features
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Burgieclan Documents Archive</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 15px;
            background-color: #f8f8fb;
        }
        h1, h2, h3, h4 {
            margin-top: 1em;
            margin-bottom: 0.3em;
            color: #353761;
        }
        h5, h6 {
            margin-bottom: 0.3em;
        }
        h1 {
            border-bottom: 2px solid #fce400;
            padding-bottom: 10px;
        }
        .timestamp {
            color: #6a6c85;
            font-size: 0.8em;
            margin-bottom: 1.5em;
        }
        .container {
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 6px rgba(53,55,97,0.1);
            padding: 12px;
            margin-bottom: 15px;
        }
        .section {
            padding-left: 6px;
            border-left: 2px solid transparent;
            overflow: hidden;
            transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
            opacity: 1;
        }
        .program {
            border-left-color: #fce400;
        }
        .module {
            border-left-color: #353761;
        }
        .course {
            border-left-color: #353761;
            opacity: 0.8;
        }
        .category {
            border-left-color: #fce400;
        }
        .category h6 {
            font-size: 0.9em;
            padding-top: 0.2em;
            display: flex;
            align-items: center;
        }
        .document {
            margin: 6px 0;
            padding: 8px 10px;
            background: #f8f9fa;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .document:hover {
            background: #e9ecef;
        }
        .document a {
            color: #353761;
            text-decoration: none;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .document a:hover {
            text-decoration: underline;
        }
        .metadata {
            font-size: 0.8em;
            color: #7f8c8d;
            margin-top: 3px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px 8px;
            align-items: center;
        }
        .metadata-label {
            font-weight: 600;
            color: #353761;
            margin-right: 2px;
        }
        .metadata-value {
            color: #444;
            margin-right: 8px;
        }
        .metadata-pair {
            display: inline-flex;
            align-items: center;
            background-color: #f0f1f7;
            padding: 1px 6px;
            border-radius: 3px;
            margin-right: 4px;
            margin-bottom: 3px;
        }
        .tag-container {
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
            margin-bottom: 3px;
        }
        .tag {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 12px;
            background-color: #f0f1f7;
            color: #353761;
            font-size: 0.85em;
            white-space: nowrap;
            border: 1px solid #d0d2e3;
        }
        .empty-message {
            margin: 4px 0;
            font-size: 0.85em;
            color: #777;
            font-style: italic;
        }
        h2, h3, h4, h5, h6 {
            display: flex;
            align-items: center;
            cursor: pointer;
            margin-top: 0.7em;
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.2em;
            font-size: 0.95em;
            color: #353761;
        }
        h2 .icon, h3 .icon, h4 .icon, h5 .icon, h6 .icon {
            margin-left: 8px;
            font-size: 0.7em;
            color: #353761;
            opacity: 0.7;
            transition: transform 0.3s ease-out;
        }
        h2:hover .icon, h3:hover .icon, h4:hover .icon, h5:hover .icon, h6:hover .icon {
            color: #353761;
            opacity: 1;
        }
        .section-collapsed .icon {
            transform: rotate(-90deg);
        }
        .hidden {
            max-height: 0 !important;
            opacity: 0;
            margin: 0;
            padding-top: 0;
            padding-bottom: 0;
            pointer-events: none;
        }
        .count-badge {
            background: #fce400;
            border-radius: 8px;
            padding: 1px 6px;
            font-size: 0.7em;
            margin-left: 4px;
            color: #353761;
            font-weight: 600;
        }
        .summary {
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 1px 6px rgba(53,55,97,0.1);
            padding: 12px;
            margin-bottom: 15px;
            border-left: 3px solid #fce400;
        }
        .summary h2 {
            margin-top: 0;
            font-size: 1.1em;
            color: #353761;
            border-bottom: 1px solid #ddd;
        }
        .summary ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        .summary li {
            margin-bottom: 3px;
        }
        @media (max-width: 768px) {
            body {
                padding: 8px;
            }
            .container {
                padding: 10px;
            }
            h1 {
                font-size: 1.5em;
            }
        }
        .file-size {
            font-family: monospace;
            white-space: nowrap;
        }
        .size-large {
            color: #d13438;
            font-weight: bold;
        }
        .size-medium {
            color: #ca8e14;
        }
        .course-code {
            display: inline-block;
            background-color: #fce400;
            color: #353761;
            font-size: 0.8em;
            padding: 1px 5px;
            border-radius: 3px;
            margin-left: 6px;
            font-family: monospace;
            font-weight: 600;
        }
        .document-title {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            flex-wrap: wrap;
        }
        .file-ext {
            display: inline-block;
            background-color: #f0f1f7;
            color: #353761;
            font-size: 0.75em;
            padding: 2px 5px;
            border-radius: 3px;
            margin-left: 3px;
            text-transform: lowercase;
            font-weight: 500;
            position: relative;
            top: -1px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Burgieclan Documents Archive</h1>
        <p class="timestamp">Generated on ' . (new DateTime('now', new \DateTimeZone('Europe/Brussels')))->format('d/m/Y \a\t H:i') . '</p>';

        // Add counters for summary
        $totalDocuments = 0; // Start with 0 and count all documents
        $programCount = count($programs);
        $moduleCount = count($modules);
        $courseCount = count($courses);

        // Count standalone documents
        foreach ($documents as $document) {
            if ($document->getFileName()) {
                $totalDocuments++;
            }
        }

        // Count module documents
        foreach ($modules as $module) {
            $moduleCount += count($module->getModules());
            $courseCount += count($module->getCourses());

            // Count documents in module courses
            foreach ($module->getCourses() as $course) {
                $docs = $this->documentRepository->findByCourseAndHasFile($course);
                $totalDocuments += count($docs);
            }
        }

        // Count program documents
        foreach ($programs as $program) {
            $this->countProgramContents($program, $moduleCount, $courseCount, $totalDocuments);
        }

        // Count standalone course documents
        foreach ($courses as $course) {
            $docs = $this->documentRepository->findByCourseAndHasFile($course);
            $totalDocuments += count($docs);
        }

        // Add summary
        $html .= '
        <div class="summary">
            <h2>Summary</h2>
            <p>This archive contains:
                <ul>
                    <li><strong>' . $programCount . '</strong> program' . ($programCount !== 1 ? 's' : '') . '</li>
                    <li><strong>' . $moduleCount . '</strong> module' . ($moduleCount !== 1 ? 's' : '') . '</li>
                    <li><strong>' . $courseCount . '</strong> course' . ($courseCount !== 1 ? 's' : '') . '</li>
                    <li><strong>' . $totalDocuments . '</strong> document' . ($totalDocuments !== 1 ? 's' : '') . '</li>
                </ul>
            </p>
        </div>';

        // Start rendering content
        $html .= '<div id="root">';

        // Process standalone documents
        if (!empty($documents)) {
            foreach ($documents as $document) {
                // Only process documents with files
                if ($document->getFileName()) {
                    $html .= $this->renderDocumentHTML($document);
                }
            }
        }

        // Process standalone courses
        if (!empty($courses)) {
            foreach ($courses as $course) {
                $html .= $this->renderCourseHTML($course);
            }
        }

        // Process standalone modules
        if (!empty($modules)) {
            foreach ($modules as $module) {
                $html .= $this->renderModuleHTML($module);
            }
        }

        // Process programs (full hierarchy)
        if (!empty($programs)) {
            foreach ($programs as $program) {
                $html .= $this->renderProgramHTML($program);
            }
        }

        // Close containers and add JavaScript
        $html .= '</div>
    </div>
    <script>
        // Toggle sections functionality
        document.addEventListener("click", function(event) {
            // Check if a heading with data-target was clicked
            if (event.target.hasAttribute && event.target.hasAttribute("data-target") ||
                (event.target.parentElement && event.target.parentElement.hasAttribute && event.target.parentElement.hasAttribute("data-target"))) {
                
                // Get the heading element
                const heading = event.target.hasAttribute("data-target") ? event.target : event.target.parentElement;
                const targetId = heading.getAttribute("data-target");
                const targetElement = document.getElementById(targetId);
                
                // Set appropriate max-height for animation
                if (targetElement.classList.contains("hidden")) {
                    // When showing, remove hidden first to enable animation
                    targetElement.style.maxHeight = "0px";
                    targetElement.classList.remove("hidden");
                    
                    // Force browser to calculate layout before animating
                    void targetElement.offsetWidth;
                    
                    // Get scrollHeight and set max-height to enable animation
                    const contentHeight = targetElement.scrollHeight;
                    targetElement.style.maxHeight = contentHeight + "px";
                    
                    // After animation completes, set to auto height for nested content
                    setTimeout(() => {
                        if (!targetElement.classList.contains("hidden")) {
                            targetElement.style.maxHeight = "none";
                        }
                    }, 300);
                } else {
                    // When hiding, first set exact height to enable animation
                    const contentHeight = targetElement.scrollHeight;
                    targetElement.style.maxHeight = contentHeight + "px";
                    
                    // Force browser to calculate layout before animating
                    void targetElement.offsetWidth;
                    
                    // Set max-height to 0 to animate closing
                    targetElement.style.maxHeight = "0px";
                    
                    // After animation completes, add hidden class
                    setTimeout(() => {
                        targetElement.classList.add("hidden");
                    }, 300);
                }
                
                heading.parentElement.classList.toggle("section-collapsed");
                event.stopPropagation();
            }
        });
    </script>
</body>
</html>';

        return $html;
    }

    /**
     * Count the number of modules and courses in a program recursively
     */
    private function countProgramContents(Program $program, int &$moduleCount, int &$courseCount, int &$documentCount): void
    {
        foreach ($program->getModules() as $module) {
            $moduleCount++;
            $courseCount += count($module->getCourses());

            // Count documents in courses
            foreach ($module->getCourses() as $course) {
                $docs = $this->documentRepository->findByCourseAndHasFile($course);
                $documentCount += count($docs);
            }

            // Recursively count sub-modules
            foreach ($module->getModules() as $subModule) {
                $this->countModuleContents($subModule, $moduleCount, $courseCount, $documentCount);
            }
        }
    }

    /**
     * Count the number of modules and courses in a module recursively
     */
    private function countModuleContents(Module $module, int &$moduleCount, int &$courseCount, int &$documentCount): void
    {
        $moduleCount++;
        $courseCount += count($module->getCourses());

        // Count documents in courses
        foreach ($module->getCourses() as $course) {
            $docs = $this->documentRepository->findByCourseAndHasFile($course);
            $documentCount += count($docs);
        }

        foreach ($module->getModules() as $subModule) {
            $this->countModuleContents($subModule, $moduleCount, $courseCount, $documentCount);
        }
    }

    /**
     * Render HTML for a document with metadata
     */
    private function renderDocumentHTML(Document $document, string $parentPath = ''): string
    {
        $fileName = $document->getFileName();

        // Skip documents without files entirely
        if (!$fileName) {
            return '';
        }

        $filePath = '';

        // Create a relative path for the document within the ZIP
        $courseName = $document->getCourse() ? $document->getCourse()->getName() : '';
        $categoryName = $document->getCategory() ? $document->getCategory()->getName() : '';

        if ($courseName && $categoryName) {
            if ($parentPath) {
                // This is a document within a module or program hierarchy
                $filePath = $parentPath . '/' . $categoryName . '/' . $fileName;
            } else {
                // This is a standalone document
                $filePath = $courseName . '/' . $categoryName . '/' . $fileName;
            }
        } elseif ($categoryName) {
            $filePath = $categoryName . '/' . $fileName;
        } else {
            $filePath = $fileName;
        }

        $html = '<div class="document">';

        // Create a link that opens the document in the browser when clicked
        // Use document name as the link text but keep the file path as the link target
        $displayName = $document->getName() ? $document->getName() : $fileName;

        // Get file extension to display
        $fileExt = pathinfo($fileName, PATHINFO_EXTENSION);

        $html .= '<div class="document-title">';
        $html .= '<a href="' . htmlspecialchars($filePath) . '" target="_blank" title="' . htmlspecialchars($fileName) . '">' .
            htmlspecialchars($displayName);
        // Add file extension directly next to the filename
        if ($fileExt) {
            $html .= '<span class="file-ext">' . htmlspecialchars($fileExt) . '</span>';
        }
        $html .= '</a>';
        $html .= '</div>';

        // Add metadata
        $html .= '<div class="metadata">';

        // Tags field
        if ($document->getTags() && count($document->getTags()) > 0) {
            $tagNames = array_map(function ($tag) {
                return $tag->getName();
            }, $document->getTags()->toArray());

            $html .= '<div class="tag-container">';
            foreach ($tagNames as $tag) {
                $html .= '<span class="tag">' . htmlspecialchars($tag) . '</span>';
            }
            $html .= '</div>';
        }

        // Year field
        if ($document->getYear()) {
            $html .= '<div class="metadata-pair">';
            $html .= '<span class="metadata-label">Year:</span>';
            $html .= '<span class="metadata-value">' . htmlspecialchars($document->getYear()) . '</span>';
            $html .= '</div>';
        }

        // Create date
        if ($document->getCreateDate()) {
            $html .= '<div class="metadata-pair">';
            $html .= '<span class="metadata-label">Created:</span>';
            $html .= '<span class="metadata-value">' . $document->getCreateDate()->format('Y-m-d') . '</span>';
            $html .= '</div>';
        }

        // Update date
        if ($document->getUpdateDate()) {
            $html .= '<div class="metadata-pair">';
            $html .= '<span class="metadata-label">Updated:</span>';
            $html .= '<span class="metadata-value">' . $document->getUpdateDate()->format('Y-m-d') . '</span>';
            $html .= '</div>';
        }

        // Add file size if we can calculate it
        if ($document->getFile()) {
            $filePath = $this->storage->resolvePath($document, 'file');
            if (file_exists($filePath) && is_readable($filePath)) {
                $fileSize = filesize($filePath);
                $html .= '<div class="metadata-pair">';
                $html .= '<span class="metadata-label">Size:</span>';
                $html .= '<span class="metadata-value">' . $this->formatFileSize($fileSize) . '</span>';
                $html .= '</div>';
            }
        }

        $html .= '</div></div>';

        return $html;
    }

    /**
     * Format file size in human-readable format with optional color class
     */
    private function formatFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= (1 << (10 * $pow));
        $formattedSize = round($bytes, 1) . ' ' . $units[$pow];

        // Add color class based on file size
        $sizeClass = '';
        if ($pow >= 3) { // GB or more
            $sizeClass = ' size-large';
        } elseif ($pow == 2 && $bytes > 20) { // More than 20 MB
            $sizeClass = ' size-medium';
        }

        return '<span class="file-size' . $sizeClass . '">' . $formattedSize . '</span>';
    }

    /**
     * Render HTML for a course and its documents
     */
    private function renderCourseHTML(Course $course, string $parentPath = ''): string
    {
        $courseId = 'course-' . $course->getId();
        $documents = $this->documentRepository->findByCourseAndHasFile($course);
        $documentCount = count($documents);

        // Construct the full path for this course
        $coursePath = $parentPath ? $parentPath . '/' . $course->getName() : $course->getName();

        // Build course display name with course code if available
        $courseDisplayName = htmlspecialchars($course->getName());
        if ($course->getCode()) {
            $courseDisplayName .= ' <span class="course-code">' . htmlspecialchars($course->getCode()) . '</span>';
        }

        $html = '<div class="section course">
            <h5 data-target="' . $courseId . '-content">' . $courseDisplayName . ' <span class="count-badge">' . $documentCount . ' docs</span> <span class="icon">▼</span></h5>
            <div class="section" id="' . $courseId . '-content">';

        // Group documents by category
        $documentsByCategory = [];
        foreach ($documents as $document) {
            $category = $document->getCategory()->getName();
            if (!isset($documentsByCategory[$category])) {
                $documentsByCategory[$category] = [];
            }
            $documentsByCategory[$category][] = $document;
        }

        if (empty($documentsByCategory)) {
            $html .= '<p class="empty-message">No documents in this course</p>';
        } else {
            // Render documents by category
            foreach ($documentsByCategory as $category => $categoryDocuments) {
                $categoryId = 'category-' . $courseId . '-' . preg_replace('/[^a-z0-9]/i', '-', $category);
                $html .= '<div class="section category">
                    <h6 data-target="' . $categoryId . '-content">' . htmlspecialchars($category) . ' <span class="count-badge">' . count($categoryDocuments) . '</span> <span class="icon">▼</span></h6>
                    <div class="section" id="' . $categoryId . '-content">';

                foreach ($categoryDocuments as $document) {
                    $html .= $this->renderDocumentHTML($document, $coursePath);
                }

                $html .= '</div></div>';
            }
        }

        $html .= '</div></div>';
        return $html;
    }

    /**
     * Render HTML for a module and its contents
     */
    private function renderModuleHTML(Module $module, string $parentPath = ''): string
    {
        $moduleId = 'module-' . $module->getId();

        // Construct the full path for this module
        $modulePath = $parentPath ? $parentPath . '/' . $module->getName() : $module->getName();

        $html = '<div class="section module">
            <h4 data-target="' . $moduleId . '-content">' . htmlspecialchars($module->getName()) . ' <span class="icon">▼</span></h4>
            <div class="section" id="' . $moduleId . '-content">';

        // Add sub-modules
        if ($module->getModules()->count() > 0) {
            foreach ($module->getModules() as $subModule) {
                $html .= $this->renderModuleHTML($subModule, $modulePath);
            }
        }

        // Add courses
        if ($module->getCourses()->count() > 0) {
            foreach ($module->getCourses() as $course) {
                $html .= $this->renderCourseHTML($course, $modulePath);
            }
        } elseif ($module->getModules()->count() === 0) {
            $html .= '<p class="empty-message">No courses or sub-modules</p>';
        }

        $html .= '</div></div>';
        return $html;
    }

    /**
     * Render HTML for a program and its contents
     */
    private function renderProgramHTML(Program $program): string
    {
        $programId = 'program-' . $program->getId();
        $programPath = $program->getName();

        $html = '<div class="section program">
            <h3 data-target="' . $programId . '-content">' . htmlspecialchars($program->getName()) . ' <span class="icon">▼</span></h3>
            <div class="section" id="' . $programId . '-content">';

        // Add modules
        if ($program->getModules()->count() > 0) {
            foreach ($program->getModules() as $module) {
                $html .= $this->renderModuleHTML($module, $programPath);
            }
        } else {
            $html .= '<p class="empty-message">No modules in this program</p>';
        }

        $html .= '</div></div>';
        return $html;
    }

    /**
     * Generate a descriptive filename for the ZIP download based on its contents
     */
    private function generateDescriptiveFilename(array $programs, array $modules, array $courses, array $documents): string
    {
        // Create the timestamp part
        $timestamp = (new DateTime('now', new \DateTimeZone('Europe/Brussels')))->format('Y-m-d');

        // Default base name
        $baseName = 'documents';

        // Use the name of the top-level entity
        if (!empty($programs)) {
            if (count($programs) === 1) {
                // Single program
                $baseName = $this->sanitizeFilename($programs[0]->getName());
            } else {
                // Multiple programs - use a collective name
                $baseName = 'program-collection';
            }
        } elseif (!empty($modules)) {
            if (count($modules) === 1) {
                // Single module
                $baseName = $this->sanitizeFilename($modules[0]->getName());
            } else {
                // Multiple modules - use a collective name
                $baseName = 'module-collection';
            }
        } elseif (!empty($courses)) {
            if (count($courses) === 1) {
                // Single course
                $baseName = $this->sanitizeFilename($courses[0]->getName());
            } else {
                // Multiple courses - use a collective name
                $baseName = 'course-collection';
            }
        } elseif (!empty($documents)) {
            // Only standalone documents
            $baseName = 'document-collection';
        }

        // Build final filename
        return "{$baseName}-{$timestamp}.zip";
    }

    /**
     * Sanitize a string to be used in a filename
     */
    private function sanitizeFilename(string $name): string
    {
        // Replace spaces with hyphens
        $name = str_replace(' ', '-', $name);

        // Remove special characters that are problematic in filenames
        $name = preg_replace('/[^A-Za-z0-9\-_]/', '', $name);

        // Limit length
        $name = substr($name, 0, 50);

        return $name;
    }

    private function createFileResponse(string $fileName, string $displayFilename = 'documents.zip'): Response
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
        $response->headers->set('Content-Disposition', 'attachment;filename="' . $displayFilename . '"');
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
