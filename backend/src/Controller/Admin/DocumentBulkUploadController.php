<?php

namespace App\Controller\Admin;

use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\Tag;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\Constraints\All;
use Symfony\Component\Validator\Constraints\File as FileConstraint;

#[IsGranted(User::ROLE_MODERATOR)]
class DocumentBulkUploadController extends AbstractController
{
    private const SESSION_KEY = 'bulk_upload_documents';
    private const TEMP_DIR = '/data/temp-uploads/';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly RequestStack $requestStack,
    ) {
    }

    #[AdminRoute('/bulk-upload', name: 'bulk_upload_index')]
    public function index(): Response
    {
        // Create the upload form
        $form = $this->createFormBuilder()
            ->add('course', EntityType::class, [
                'class' => Course::class,
                'choice_label' => function (Course $course) {
                    return $course->getName() . ' (' . $course->getCode() . ')';
                },
                'placeholder' => 'Select a course',
                'label' => 'Default Course',
                'required' => true,
                'constraints' => [new NotNull(message: 'Please select a course')],
            ])
            ->add('category', EntityType::class, [
                'class' => DocumentCategory::class,
                'choice_label' => 'nameNl',
                'placeholder' => 'Select a category',
                'label' => 'Default Category',
                'required' => true,
                'constraints' => [new NotNull(message: 'Please select a category')],
            ])
            ->add('useFileDate', CheckboxType::class, [
                'label' => 'Detect year from file date',
                'required' => false,
                'data' => true,
                'help' => 'Automatically determine academic year from file creation/modification date',
            ])
            ->add('defaultYear', ChoiceType::class, [
                'choices' => Document::getAcademicYearChoices(amountOfYears: 10),
                'label' => 'Default Year',
                'required' => false,
                'data' => $this->getCurrentAcademicYear(),
                'help' => 'This will be used as default when "Detect year from file date" is disabled or year cannot be determined',
            ])
            ->add('defaultTags', EntityType::class, [
                'class' => Tag::class,
                'choice_label' => 'name',
                'placeholder' => 'Select tags',
                'label' => 'Default Tags',
                'multiple' => true,
                'required' => false,
                'query_builder' => function ($repository) {
                    // Return empty query builder - will be filtered by JavaScript
                    return $repository->createQueryBuilder('t')
                        ->where('1 = 0'); // Initially show no tags
                },
                'help' => 'These tags will be applied to all documents by default (filtered by selected course/category)',
                'attr' => ['data-dynamic-tags' => 'true'],
            ])
            ->add('underReview', CheckboxType::class, [
                'label' => 'Under Review',
                'required' => false,
                'data' => false,
                'help' => 'Set to true if documents should be marked as under review',
            ])
            ->add('anonymous', CheckboxType::class, [
                'label' => 'Anonymous',
                'required' => false,
                'data' => true,
                'help' => 'Set to true if documents should be marked as anonymous',
            ])
            ->add('files', FileType::class, [
                'label' => 'Documents',
                'multiple' => true,
                'mapped' => false,
                'required' => true,
                'constraints' => [
                    new All([
                        new FileConstraint([
                            'maxSize' => '200M',
                            'mimeTypes' => [
                                'application/pdf',
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                'application/msword',
                                'text/plain',
                                'image/jpeg',
                                'image/png',
                                'video/mp4',
                                'application/zip',
                                'text/x-matlab',
                                'text/x-python'
                            ],
                        ]),
                    ]),
                ],
                'help' => 'Select multiple documents to upload (PDF, Word, Excel, PowerPoint, or text files, max 200MB each)',
            ])
            ->add('submit', SubmitType::class, [
                'label' => 'Upload & Preview',
                'attr' => ['class' => 'btn btn-primary'],
            ])
            ->getForm();

        $form->handleRequest($this->requestStack->getCurrentRequest());

        if ($form->isSubmitted() && $form->isValid()) {
            return $this->handleUpload($form);
        }

        return $this->render('admin/bulk_upload_form.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    private function handleUpload($form): Response
    {
        $session = $this->requestStack->getSession();
        $data = $form->getData();
        $files = $form->get('files')->getData();

        if (!$files || count($files) === 0) {
            $this->addFlash('error', 'Please select at least one file to upload.');
            return $this->redirectToRoute('admin_bulk_upload_index');
        }

        // Get file timestamps from JavaScript
        $request = $this->requestStack->getCurrentRequest();
        $fileTimestamps = json_decode($request->request->get('file_timestamps', '[]'), true);

        // Process uploaded files
        $documentsMetadata = [];
        $sessionId = session_id();
        $projectDir = $this->getParameter('kernel.project_dir');
        $tempDir = $projectDir . self::TEMP_DIR . $sessionId;

        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        $course = $data['course'];
        $category = $data['category'];
        $useFileDate = $data['useFileDate'] ?? true;
        $defaultYear = $data['defaultYear'] ?? $this->getCurrentAcademicYear();
        /** ArrayCollection $defaultTags */
        $defaultTags = $data['defaultTags'] ?? [];
        $underReview = $data['underReview'] ?? false;
        $anonymous = $data['anonymous'] ?? true;

        // Get IDs for storage
        $courseId = $course->getId();
        $categoryId = $category->getId();
        $tagIds = array_map(fn($tag) => $tag->getId(), $defaultTags->toArray());

        $fileIndex = 0;
        foreach ($files as $uploadedFile) {
            if (!$uploadedFile instanceof UploadedFile || !$uploadedFile->isValid()) {
                $fileIndex++;
                continue;
            }

            // Move file to temporary location
            $originalName = $uploadedFile->getClientOriginalName();
            $tmpFilename = uniqid() . '_' . $originalName;
            $uploadedFile->move($tempDir, $tmpFilename);
            $tmpPath = $tempDir . '/' . $tmpFilename;

            // Preserve the original file timestamp if available
            if (isset($fileTimestamps[$fileIndex]) && is_numeric($fileTimestamps[$fileIndex])) {
                touch($tmpPath, $fileTimestamps[$fileIndex]);
            }

            // Determine year based on settings
            if ($useFileDate) {
                $fileYear = $this->extractYearFromFile($tmpPath);
                $year = $fileYear ?: $defaultYear;
            } else {
                $year = $defaultYear;
            }

            // Extract document name from filename with proper formatting
            $documentName = $this->getSuggestedNameFromFilename($originalName);

            $fileIndex++;

            $documentsMetadata[] = [
                'tmpPath' => $tmpPath,
                'originalName' => $originalName,
                'name' => $documentName,
                'year' => $year,
                'size' => filesize($tmpPath),
                'course' => $courseId,
                'category' => $categoryId,
                'tags' => $tagIds,
                'underReview' => $underReview,
                'anonymous' => $anonymous,
            ];
        }

        // Store in session
        $session->set(self::SESSION_KEY, $documentsMetadata);
        $session->set(self::SESSION_KEY . '_defaults', [
            'course' => $courseId,
            'category' => $categoryId,
            'useFileDate' => $useFileDate,
            'defaultYear' => $defaultYear,
            'defaultTags' => $tagIds,
            'underReview' => $underReview,
            'anonymous' => $anonymous,
        ]);

        // Redirect to edit page
        return $this->redirectToRoute('admin_bulk_upload_edit_metadata');
    }

    #[AdminRoute('/bulk-upload/edit-metadata', name: 'bulk_upload_edit_metadata')]
    public function editMetadata(): Response
    {
        $session = $this->requestStack->getSession();
        $documentsMetadata = $session->get(self::SESSION_KEY, []);
        $defaults = $session->get(self::SESSION_KEY . '_defaults', []);

        if (empty($documentsMetadata)) {
            $this->addFlash('warning', 'No documents in session. Please upload files first.');
            return $this->redirectToRoute('admin_bulk_upload_index');
        }

        // Fetch entities for display
        $courseRepo = $this->entityManager->getRepository(Course::class);
        $categoryRepo = $this->entityManager->getRepository(DocumentCategory::class);
        $tagRepo = $this->entityManager->getRepository(Tag::class);

        foreach ($documentsMetadata as &$doc) {
            $doc['courseEntity'] = $courseRepo->find($doc['course']);
            $doc['categoryEntity'] = $categoryRepo->find($doc['category']);
            $doc['tagEntities'] = [];
            if (!empty($doc['tags'])) {
                foreach ($doc['tags'] as $tagId) {
                    $tag = $tagRepo->find($tagId);
                    if ($tag) {
                        $doc['tagEntities'][] = $tag;
                    }
                }
            }
        }

        return $this->render('admin/bulk_upload_edit.html.twig', [
            'documents' => $documentsMetadata,
            'defaults' => $defaults,
            'courses' => $courseRepo->findAll(),
            'categories' => $categoryRepo->findAll(),
            'tags' => $tagRepo->findAll(),
            'yearChoices' => Document::getAcademicYearChoices(amountOfYears: 10),
        ]);
    }

    #[AdminRoute('/bulk-upload/update-metadata', name: 'bulk_upload_update_metadata')]
    public function updateMetadata(Request $request): Response
    {
        $session = $this->requestStack->getSession();
        $documentsMetadata = $session->get(self::SESSION_KEY, []);

        $selectedIndices = $request->request->all('selected') ?? [];
        $bulkCourse = $request->request->get('bulk_course');
        $bulkCategory = $request->request->get('bulk_category');
        $bulkYear = $request->request->get('bulk_year');
        $bulkTags = $request->request->all('bulk_tags') ?? [];

        // Update selected documents
        foreach ($selectedIndices as $index) {
            if (isset($documentsMetadata[$index])) {
                if ($bulkCourse) {
                    $documentsMetadata[$index]['course'] = $bulkCourse;
                }
                if ($bulkCategory) {
                    $documentsMetadata[$index]['category'] = $bulkCategory;
                }
                if ($bulkYear) {
                    $documentsMetadata[$index]['year'] = $bulkYear;
                }
                if (!empty($bulkTags)) {
                    $documentsMetadata[$index]['tags'] = $bulkTags;
                }
            }
        }

        // Also handle individual row updates
        $names = $request->request->all('name') ?? [];
        $years = $request->request->all('year') ?? [];
        $courses = $request->request->all('course') ?? [];
        $categories = $request->request->all('category') ?? [];

        foreach ($documentsMetadata as $index => &$doc) {
            if (isset($names[$index])) {
                $doc['name'] = $names[$index];
            }
            if (isset($years[$index])) {
                $doc['year'] = $years[$index];
            }
            if (isset($courses[$index])) {
                $doc['course'] = $courses[$index];
            }
            if (isset($categories[$index])) {
                $doc['category'] = $categories[$index];
            }
        }

        $session->set(self::SESSION_KEY, $documentsMetadata);

        return $this->redirectToRoute('admin_bulk_upload_edit_metadata');
    }

    #[AdminRoute('/bulk-upload/create-all', name: 'bulk_upload_create_all')]
    public function createAll(): Response
    {
        $session = $this->requestStack->getSession();
        $documentsMetadata = $session->get(self::SESSION_KEY, []);

        if (empty($documentsMetadata)) {
            $this->addFlash('warning', 'No documents to create.');
            return $this->redirectToRoute('admin_bulk_upload_index');
        }

        $user = $this->getUser();
        assert($user instanceof User);

        $createdCount = 0;
        $errors = [];

        foreach ($documentsMetadata as $docMeta) {
            try {
                $document = new Document($user);
                $document->setName($docMeta['name']);
                $document->setYear($docMeta['year']);
                $document->setUnderReview($docMeta['underReview'] ?? false);
                $document->setAnonymous($docMeta['anonymous'] ?? true);

                // Set course
                $course = $this->entityManager->getRepository(Course::class)->find($docMeta['course']);
                if ($course) {
                    $document->setCourse($course);
                }

                // Set category
                $category = $this->entityManager->getRepository(DocumentCategory::class)->find($docMeta['category']);
                if ($category) {
                    $document->setCategory($category);
                }

                // Set tags
                if (!empty($docMeta['tags'])) {
                    foreach ($docMeta['tags'] as $tagId) {
                        $tag = $this->entityManager->getRepository(Tag::class)->find($tagId);
                        if ($tag) {
                            $document->addTag($tag);
                        }
                    }
                }

                // Set file
                $file = new File($docMeta['tmpPath']);
                $document->setFile($file);
                $document->setFileName($docMeta['originalName']);

                $this->entityManager->persist($document);
                $createdCount++;
            } catch (\Exception $e) {
                $errors[] = sprintf('Error creating document "%s": %s', $docMeta['name'], $e->getMessage());
            }
        }

        $this->entityManager->flush();

        // Clean up temporary files and session
        $this->cleanupTempFiles($documentsMetadata);
        $session->remove(self::SESSION_KEY);
        $session->remove(self::SESSION_KEY . '_defaults');

        if ($createdCount > 0) {
            $this->addFlash('success', sprintf('Successfully created %d document(s).', $createdCount));
        }

        if (!empty($errors)) {
            foreach ($errors as $error) {
                $this->addFlash('error', $error);
            }
        }

        // Redirect to the documents list in EasyAdmin
        return $this->redirectToRoute('admin_document_index');
    }

    /**
     * Extracts a clean document name from a filename
     * Removes file extension, replaces underscores/hyphens with spaces,
     * and applies proper capitalization
     */
    private function getSuggestedNameFromFilename(string $filename): string
    {
        if (empty($filename)) {
            return '';
        }

        // Remove file extension
        $nameWithoutExtension = pathinfo($filename, PATHINFO_FILENAME);

        // Replace underscores and hyphens with spaces
        $nameWithSpaces = str_replace(['_', '-'], ' ', $nameWithoutExtension);

        // Capitalize first letter of each word and trim
        $words = explode(' ', $nameWithSpaces);
        $capitalizedWords = array_map(function ($word) {
            return ucfirst(strtolower($word));
        }, $words);

        return trim(implode(' ', $capitalizedWords));
    }

    private function extractYearFromFile(string $filePath): ?string
    {
        $timestamp = filemtime($filePath);
        if ($timestamp === false) {
            return null;
        }

        $date = new \DateTime();
        $date->setTimestamp($timestamp);

        $year = (int)$date->format('Y');
        $month = (int)$date->format('m');

        // If file was created after September, it belongs to next academic year
        if ($month >= 9) {
            return sprintf('%d - %d', $year, $year + 1);
        }

        return sprintf('%d - %d', $year - 1, $year);
    }

    private function getCurrentAcademicYear(): string
    {
        $currentYear = (int)date('Y');
        $currentMonth = (int)date('m');

        if ($currentMonth >= 9) {
            return sprintf('%d - %d', $currentYear, $currentYear + 1);
        }

        return sprintf('%d - %d', $currentYear - 1, $currentYear);
    }

    #[AdminRoute('/bulk-upload/get-tags', name: 'bulk_upload_get_tags')]
    public function getTags(Request $request): Response
    {
        $courseId = $request->query->get('course');
        $categoryId = $request->query->get('category');

        $tagRepository = $this->entityManager->getRepository(Tag::class);
        $tags = $tagRepository->findByCourseOrCategoryOrUnused($courseId, $categoryId);

        $tagData = array_map(function (Tag $tag) {
            return [
                'id' => $tag->getId(),
                'name' => $tag->getName(),
            ];
        }, $tags);

        return $this->json($tagData);
    }

    #[AdminRoute('/bulk-upload/create-tag', name: 'bulk_upload_create_tag')]
    public function createTag(Request $request): Response
    {
        if (!($request->isMethod('POST'))) {
            throw new BadRequestException('Invalid request method');
        }

        $data = json_decode($request->getContent(), true);
        $tagName = trim($data['name'] ?? '');

        if (empty($tagName)) {
            throw new BadRequestException('Tag name is required');
        }

        // Check if tag already exists
        $tagRepository = $this->entityManager->getRepository(Tag::class);
        $existingTag = $tagRepository->findOneBy(['name' => $tagName]);

        if ($existingTag) {
            return $this->json([
                'id' => $existingTag->getId(),
                'name' => $existingTag->getName(),
                'existing' => true,
            ]);
        }

        // Create new tag
        $tag = new Tag();
        $tag->setName($tagName);

        $this->entityManager->persist($tag);
        $this->entityManager->flush();

        return $this->json([
            'id' => $tag->getId(),
            'name' => $tag->getName(),
            'existing' => false,
        ], 201);
    }

    private function cleanupTempFiles(array $documentsMetadata): void
    {
        foreach ($documentsMetadata as $doc) {
            if (isset($doc['tmpPath']) && file_exists($doc['tmpPath'])) {
                @unlink($doc['tmpPath']);
            }
        }

        // Try to remove the session directory
        $sessionId = session_id();
        $projectDir = $this->getParameter('kernel.project_dir');
        $tempDir = $projectDir . self::TEMP_DIR . $sessionId;
        if (is_dir($tempDir)) {
            @rmdir($tempDir);
        }
    }
}
