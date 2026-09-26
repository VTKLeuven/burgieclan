<?php

namespace App\Controller\Api;

use App\ApiResource\ZipApi;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\Module;
use App\Entity\Program;
use App\Repository\DocumentRepository;
use App\Security\Voter\DocumentFileVoter;
use App\Service\DocumentFileUrlGenerator;
use App\Utils\DownloadFilename;
use DateTime;
use DateTimeZone;
use RuntimeException;
use League\Flysystem\FilesystemException;
use League\Flysystem\FilesystemOperator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Vich\UploaderBundle\Storage\StorageInterface;
use ZipArchive;

/**
 * Builds a zip of programs, modules, courses and/or documents and answers with a short-lived
 * link to it: {"url": "..."}.
 *
 * Zips are cached by content in the exports storage (next to the documents: the bucket when
 * DOCUMENT_STORAGE=s3, data/exports otherwise), so a second request for the same content
 * only signs a new link. The browser then downloads the zip straight from storage, the same
 * way single documents are served (see DocumentFileUrlGenerator). app:delete-old-zips prunes
 * the cache.
 *
 * Only approved documents are included, plus explicitly selected ones the user may open.
 * That keeps every cached zip safe to hand to anyone who asks for the same content.
 */
final class DownloadZipController extends AbstractController
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
        private readonly DocumentRepository $documentRepository,
        private readonly StorageInterface $storage,
        private readonly DocumentFileUrlGenerator $fileUrlGenerator,
        #[Target('exports.storage')]
        private readonly FilesystemOperator $exportsStorage,
    ) {}

    /**
     * The entry name each document was actually written under inside the zip, by
     * document id. Filled while adding files, read back when the HTML index is
     * generated so its links match the entries — including the "_1" suffix the
     * duplicate handling may have added.
     *
     * @var array<int, string>
     */
    private array $zipEntryNames = [];

    /**
     * Local copies of the documents in the zip being built. ZipArchive reads added files
     * only when the archive is closed, so they must live until then.
     *
     * @var string[]
     */
    private array $tempFiles = [];

    public function __invoke(ZipApi $zipApi): Response
    {
        $programs = $this->mapEntities($zipApi->programs, Program::class);
        $modules = $this->mapEntities($zipApi->modules, Module::class);
        $courses = $this->mapEntities($zipApi->courses, Course::class);
        $documents = array_values(
            array_filter(
                $this->mapEntities($zipApi->documents, Document::class),
                fn (Document $document) => $this->isGranted(DocumentFileVoter::VIEW_FILE, $document),
            )
        );

        $contentHash = $this->generateContentHash($programs, $modules, $courses, $documents);

        if ($contentHash === md5('')) {
            return new Response('No content to zip', Response::HTTP_NO_CONTENT);
        }

        $exportName = $contentHash . '.zip';
        if (!$this->exportsStorage->fileExists($exportName)) {
            $this->buildZip($exportName, $programs, $modules, $courses, $documents);
        }

        $displayFilename = $this->generateDescriptiveFilename($programs, $modules, $courses, $documents);

        $response = new JsonResponse(
            [
            'url' => $this->fileUrlGenerator->generateForExport($exportName, $displayFilename),
            ]
        );
        // Every response is a fresh credential; nothing may keep or share it.
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    private function mapEntities(array $entities, string $class): array
    {
        return array_map(
            fn($entity) => $this->microMapper->map(
                $entity,
                $class,
                [
                    MicroMapperInterface::MAX_DEPTH => 0,
                ]
            ),
            $entities
        );
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
            $content .= $this->getDocumentContent($document);
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

        foreach ($this->documentRepository->findApprovedByCourseWithFile($course) as $document) {
            $content .= $this->getDocumentContent($document);
        }

        return $content;
    }

    /**
     * What identifies a document for zip-caching purposes.
     *
     * The stored filename alone is not enough: it is unique per upload, but it no
     * longer decides what the file is called inside the zip. Mixing the served name
     * in means renaming a document invalidates the cached archive instead of handing
     * out one that still carries the old name.
     */
    private function getDocumentContent(Document $document): string
    {
        return $document->getFileName() . DownloadFilename::forDocument($document);
    }

    /**
     * Writes the zip to a temporary file, then moves it into the exports storage.
     *
     * Files are copied to disk one by one rather than held in memory, so the size of a zip
     * is bounded by free disk space (about twice the zip while it is built), not by PHP's
     * memory_limit.
     */
    private function buildZip(
        string $exportName,
        array $programs,
        array $modules,
        array $courses,
        array $documents
    ): void {
        $zipPath = tempnam(sys_get_temp_dir(), 'burgieclan_zip_');
        if ($zipPath === false) {
            throw new RuntimeException('Could not create a temporary file for the zip.');
        }

        try {
            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::OVERWRITE) !== true) {
                throw new RuntimeException('Could not open the zip for writing.');
            }

            $this->addProgramsToZip($zip, $programs);
            $this->addModulesToZip($zip, $modules, '');
            $this->addCoursesToZip($zip, $courses, '');
            $this->addDocumentsToZip($zip, $documents, '');

            // Generate and add HTML structure file
            $htmlContent = $this->generateHtmlStructure($programs, $modules, $courses, $documents);
            if (!$zip->addFromString('burgieclan-documents-index.html', $htmlContent)) {
                error_log('Failed to add HTML structure to ZIP file');
            }

            if (!$zip->close()) {
                throw new RuntimeException('Could not write the zip: ' . $zip->getStatusString());
            }

            $handle = fopen($zipPath, 'rb');
            if ($handle === false) {
                throw new RuntimeException('Could not read back the zip.');
            }
            try {
                $this->exportsStorage->writeStream($exportName, $handle);
            } finally {
                if (is_resource($handle)) {
                    fclose($handle);
                }
            }
        } finally {
            foreach ([...$this->tempFiles, $zipPath] as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            $this->tempFiles = [];
        }
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
            $documents = $this->documentRepository->findApprovedByCourseWithFile($course);
            $this->addDocumentsToZip($zip, $documents, $courseName);
        }
    }

    private function addDocumentsToZip(ZipArchive $zip, array $documents, string $parentDir): void
    {
        $documentsByCategory = [];
        foreach ($documents as $document) {
            assert($document instanceof Document);
            $category = $document->getCategory()->getNameEn();
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
                    $tempFile = $this->copyToTempFile($document);
                    if ($tempFile !== null) {
                        // The stored name carries the uniqid the SmartUniqueNamer appended
                        // on upload; inside the zip we want the document's own name.
                        $originalFileName = DownloadFilename::forDocument($document);
                        $fileNameToUse = $this->getUniqueFileName($originalFileName, $usedFilenames[$category]);
                        $usedFilenames[$category][] = $fileNameToUse;
                        $this->zipEntryNames[$document->getId()] = $fileNameToUse;

                        $entryName = $categoryDir . '/' . $fileNameToUse;
                        $zip->addFile($tempFile, $entryName);
                        // Stored, not deflated: PDFs, images and Office files are compressed
                        // already, so deflating costs CPU time and saves next to nothing.
                        $zip->setCompressionName($entryName, ZipArchive::CM_STORE);
                    }
                }
            }
        }
    }

    /**
     * Copies a document's file from storage (local disk or the bucket) to a temporary file.
     * Returns null when the file is missing, so one lost file does not fail the whole zip.
     */
    private function copyToTempFile(Document $document): ?string
    {
        try {
            $source = $this->storage->resolveStream($document, 'file');
        } catch (FilesystemException) {
            return null;
        }
        if ($source === null) {
            return null;
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'burgieclan_doc_');
        if ($tempFile === false) {
            fclose($source);
            throw new RuntimeException('Could not create a temporary file for the zip.');
        }
        $this->tempFiles[] = $tempFile;

        $target = fopen($tempFile, 'wb');
        if ($target === false) {
            fclose($source);
            throw new RuntimeException('Could not write a temporary file for the zip.');
        }
        stream_copy_to_stream($source, $target);
        fclose($target);
        fclose($source);

        return $tempFile;
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
        <p class="timestamp">Generated on ' . (new DateTime('now', new DateTimeZone('Europe/Brussels')))->format('d/m/Y \a\t H:i') . '</p>';

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
                $docs = $this->documentRepository->findApprovedByCourseWithFile($course);
                $totalDocuments += count($docs);
            }
        }

        // Count program documents
        foreach ($programs as $program) {
            $this->countProgramContents($program, $moduleCount, $courseCount, $totalDocuments);
        }

        // Count standalone course documents
        foreach ($courses as $course) {
            $docs = $this->documentRepository->findApprovedByCourseWithFile($course);
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
                $docs = $this->documentRepository->findApprovedByCourseWithFile($course);
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
            $docs = $this->documentRepository->findApprovedByCourseWithFile($course);
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
        // Skip documents without files entirely
        if (!$document->getFileName()) {
            return '';
        }

        // Link to the name the file carries inside the zip, not the storage name.
        $fileName = $this->zipEntryNames[$document->getId()] ?? DownloadFilename::forDocument($document);

        $filePath = '';

        // Create a relative path for the document within the ZIP
        $courseName = $document->getCourse()->getName();
        $categoryName = $document->getCategory()->getNameEn();

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
        $displayName = $document->getName();

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
        if (count($document->getTags()) > 0) {
            $tagNames = array_map(
                function ($tag) {
                    return $tag->getName();
                },
                $document->getTags()->toArray()
            );

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
        $html .= '<div class="metadata-pair">';
        $html .= '<span class="metadata-label">Created:</span>';
        $html .= '<span class="metadata-value">' . $document->getCreatedAt()->format('Y-m-d') . '</span>';
        $html .= '</div>';

        // Update date
        $html .= '<div class="metadata-pair">';
        $html .= '<span class="metadata-label">Updated:</span>';
        $html .= '<span class="metadata-value">' . $document->getUpdatedAt()->format('Y-m-d') . '</span>';
        $html .= '</div>';

        // Add file size from entity metadata (works with both local and S3 storage)
        $fileSize = $document->getFileSize();
        if ($fileSize) {
            $html .= '<div class="metadata-pair">';
            $html .= '<span class="metadata-label">Size:</span>';
            $html .= '<span class="metadata-value">' . $this->formatFileSize($fileSize) . '</span>';
            $html .= '</div>';
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
        $documents = $this->documentRepository->findApprovedByCourseWithFile($course);
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
            $category = $document->getCategory()->getNameEn();
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
        $timestamp = (new DateTime('now', new DateTimeZone('Europe/Brussels')))->format('Y-m-d');

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
}
