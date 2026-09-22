<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\Tag;
use App\Entity\User;
use App\Utils\DownloadFilename;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Dto\BatchActionDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use LogicException;
use RuntimeException;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\PropertyAccess\PropertyPath;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Vich\UploaderBundle\FileAbstraction\ReplacingFile;
use Vich\UploaderBundle\Form\Type\VichFileType;
use Vich\UploaderBundle\Storage\StorageInterface;
use ZipArchive;

#[IsGranted(User::ROLE_MODERATOR)]
class DocumentPendingCrudController extends DocumentCrudController
{
    public static function getEntityFqcn(): string
    {
        return Document::class;
    }

    public function configureActions(Actions $actions): Actions
    {
        $approveAction = Action::new('approve')
            ->linkToCrudAction('approve')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-success')
            ->setIcon('fa fa-check-circle')
            ->renderAsButton();

        $batchApprove = Action::new('batchApprove', 'Approve Selected')
            ->linkToCrudAction('batchApprove')
            ->addCssClass('btn btn-success')
            ->setIcon('fa fa-check-circle');

        $batchDownload = Action::new('batchDownload', 'Download Selected')
            ->linkToCrudAction('batchDownload')
            ->addCssClass('btn btn-primary')
            ->setIcon('fa fa-download')
            ->setHtmlAttributes(['data-action-batch-no-confirm' => 'true']);

        $batchMerge = Action::new('batchMerge', 'Merge Selected')
            ->linkToCrudAction('batchMerge')
            ->addCssClass('btn btn-secondary')
            ->setIcon('fa fa-file-zipper')
            ->setHtmlAttributes(['data-action-batch-no-confirm' => 'true']);

        return parent::configureActions($actions)
            ->add(Crud::PAGE_INDEX, $approveAction)
            ->addBatchAction($batchApprove)
            ->addBatchAction($batchDownload)
            ->addBatchAction($batchMerge)
            ->update(
                Crud::PAGE_INDEX,
                Action::BATCH_DELETE,
                function (Action $action) {
                    return $action
                    ->setLabel('Delete Selected')
                    ->setIcon('fa fa-trash-can');
                }
            )
            ->reorder(
                Crud::PAGE_INDEX,
                [
                'approve',
                Action::EDIT,
                Action::DELETE,
                'batchApprove',
                'batchDownload',
                'batchMerge',
                Action::BATCH_DELETE,
                ]
            )
            ->disable(Action::NEW);
    }

    public function createIndexQueryBuilder(
        SearchDto $searchDto,
        EntityDto $entityDto,
        FieldCollection $fields,
        FilterCollection $filters
    ): QueryBuilder {
        return parent::createIndexQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ->andWhere('entity.under_review = :under_review')
            ->setParameter('under_review', true);
    }

    public function configureCrud(Crud $crud): Crud
    {
        // The crud/edit override comes from the parent.
        return parent::configureCrud($crud)
            ->setPageTitle(Crud::PAGE_INDEX, 'Pending Documents')
            ->showEntityActionsInlined()
            ->overrideTemplate('crud/index', 'admin/document_pending_index.html.twig');
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');
        yield DateTimeField::new('createdAt')
            ->hideOnForm();
        yield DateTimeField::new('updatedAt')
            ->hideOnForm();
        yield AssociationField::new('category')
            ->autocomplete();
        yield AssociationField::new('course')
            ->autocomplete();
        $instance = $this->getContext()->getEntity()->getInstance();
        $firstYear = $instance ? $instance->getYear() : null;
        yield ChoiceField::new('year')
            ->setChoices(Document::getAcademicYearChoices(firstYear: $firstYear))
            ->setLabel('Academic Year')
            ->onlyOnForms();
        yield TextField::new('year')
            ->setLabel('Academic Year')
            ->hideOnForm();
        yield TextField::new('author', 'Original author')
            ->setHelp(
                'Only set on files migrated from the old archive: the person who '
                . 'originally wrote them. Those were all uploaded by one archive account, '
                . 'so the uploader says nothing useful and this is the real credit. '
                . 'Leave it empty for anything uploaded through the site - there the '
                . 'uploader is the author, and the site never asks for this field.'
            )
            ->hideOnIndex();
        yield AssociationField::new('tags')
            ->autocomplete()
            ->hideOnIndex()
            ->setFormTypeOption('by_reference', false);
        yield BooleanField::new('under_review')
            ->setLabel('Under review')
            ->renderAsSwitch(false)
            ->hideOnIndex();
        yield BooleanField::new('anonymous')
            ->setLabel('Anonymous')
            ->renderAsSwitch(false);
        yield TextField::new('file')
            ->setFormType(VichFileType::class)
            ->setFormTypeOptions(
                [
                    // Not `true`: in Vich that means "label the link with the mapping's
                    // originalName", and this mapping has no originalName property, so the
                    // anchor came out empty - a zero-width, invisible link. The stored name
                    // is the one thing we always have.
                    'download_label' => new PropertyPath('file_name'),
                    // Vich would otherwise build /files/download/..., which sits behind the
                    // stateless JWT firewall and answers 401 to a session-authenticated
                    // moderator. admin_document_preview is the same file under /admin.
                    'download_uri' => fn(Document $document): ?string => null === $document->getFileName()
                        ? null
                        : $this->generateUrl(
                            'admin_document_preview',
                            ['filename' => $document->getFileName()]
                        ),
                    'allow_delete' => false,
                ]
            )
            ->hideOnIndex();
        yield TextField::new('file_name', 'File Name')
            ->onlyOnIndex();
        yield TextField::new('file_name', 'Preview')
            ->setTemplatePath('admin/field/file_preview_toggle.html.twig')
            ->onlyOnIndex();
    }

    #[AdminRoute('/approve', name: 'approve')]
    public function approve(
        AdminContext $adminContext,
        EntityManagerInterface $entityManagerInterface,
        AdminUrlGenerator $adminUrlGenerator
    ): RedirectResponse {
        // In EasyAdmin 4.26+, when POSTing to a custom action, the entity might not be in the context
        // We need to retrieve the entity ID from the request and load it manually
        $entityId = $adminContext->getRequest()->query->get('entityId');
        if (!$entityId) {
            throw new LogicException('Entity ID is missing from the request');
        }

        // Load the entity manually
        $document = $entityManagerInterface->getRepository(Document::class)->find($entityId);
        if (!$document instanceof Document) {
            throw new LogicException('Document not found with ID: ' . $entityId);
        }

        $document->setUnderReview(false);

        $entityManagerInterface->flush();

        $targetUrl = $adminUrlGenerator
            ->setController(self::class)
            ->setAction(Crud::PAGE_EDIT)
            ->setEntityId($document->getId())
            ->generateUrl();
        return $this->redirect($targetUrl);
    }

    #[AdminRoute('/batch-approve', name: 'batch_approve')]
    public function batchApprove(
        AdminContext $adminContext,
        BatchActionDto $batchActionDto,
        EntityManagerInterface $entityManager
    ): Response {
        $csrfTokenId = 'ea-batch-action-' . $batchActionDto->getName() . '-' . $batchActionDto->getEntityFqcn();
        if (!$this->isCsrfTokenValid($csrfTokenId, $batchActionDto->getCsrfToken())) {
            $this->addFlash('danger', 'Invalid CSRF token.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        if ($batchActionDto->getEntityFqcn() !== $adminContext->getEntity()->getFqcn()) {
            throw new BadRequestHttpException();
        }

        $repository = $entityManager->getRepository(Document::class);
        $approvedCount = 0;
        foreach ($batchActionDto->getEntityIds() as $entityId) {
            $document = $repository->find($entityId);
            if ($document instanceof Document && $document->isUnderReview()) {
                $document->setUnderReview(false);
                $approvedCount++;
            }
        }

        $entityManager->flush();

        $this->addFlash(
            'success',
            sprintf(
                '%d document%s approved.',
                $approvedCount,
                $approvedCount === 1 ? ' was' : 's were'
            )
        );

        return $this->redirectToRoute('admin_document_pending_index');
    }

    #[AdminRoute('/batch-download', name: 'batch_download')]
    public function batchDownload(
        AdminContext $adminContext,
        BatchActionDto $batchActionDto,
        EntityManagerInterface $entityManager,
        StorageInterface $storage
    ): Response {
        $csrfTokenId = 'ea-batch-action-' . $batchActionDto->getName() . '-' . $batchActionDto->getEntityFqcn();
        if (!$this->isCsrfTokenValid($csrfTokenId, $batchActionDto->getCsrfToken())) {
            $this->addFlash('danger', 'Invalid CSRF token.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        if ($batchActionDto->getEntityFqcn() !== $adminContext->getEntity()->getFqcn()) {
            throw new BadRequestHttpException();
        }

        $repository = $entityManager->getRepository(Document::class);
        /** @var Document[] $documents */
        $documents = [];
        foreach ($batchActionDto->getEntityIds() as $entityId) {
            $document = $repository->find($entityId);
            if ($document instanceof Document && $document->getFileName()) {
                $documents[] = $document;
            }
        }

        if (empty($documents)) {
            $this->addFlash('warning', 'No downloadable documents were selected.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'pending_docs_');
        if ($tempFile === false) {
            throw new RuntimeException('Failed to create temporary file for ZIP export.');
        }

        $zip = new ZipArchive();
        if ($zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Failed to open ZIP archive.');
        }

        $usedNames = [];
        foreach ($documents as $document) {
            $stream = $storage->resolveStream($document, 'file');
            if ($stream === null) {
                continue;
            }

            $baseName = DownloadFilename::forDocument($document);
            $fileNameToUse = $this->getUniqueZipFilename($baseName, $usedNames);
            $usedNames[] = $fileNameToUse;

            $content = stream_get_contents($stream);
            fclose($stream);

            if ($content !== false) {
                $zip->addFromString($fileNameToUse, $content);
            }
        }

        if ($zip->numFiles === 0) {
            $zip->close();
            @unlink($tempFile);
            $this->addFlash('warning', 'None of the selected documents contained downloadable files.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $zip->close();

        $zipFilename = sprintf('pending-documents-%s.zip', (new DateTimeImmutable())->format('Y-m-d-His'));

        $zipContent = file_get_contents($tempFile);
        @unlink($tempFile);

        if ($zipContent === false) {
            throw new RuntimeException('Failed to read generated ZIP archive.');
        }

        $response = new Response($zipContent);
        $response->headers->set('Content-Type', 'application/zip');
        $response->headers->set(
            'Content-Disposition',
            HeaderUtils::makeDisposition(HeaderUtils::DISPOSITION_ATTACHMENT, $zipFilename)
        );

        return $response;
    }

    /**
     * @param list<string> $usedNames
     */
    private function getUniqueZipFilename(string $filename, array $usedNames): string
    {
        if (!in_array($filename, $usedNames, true)) {
            return $filename;
        }

        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $base = pathinfo($filename, PATHINFO_FILENAME);
        $counter = 1;

        do {
            $candidate = $extension !== ''
                ? sprintf('%s (%d).%s', $base, $counter, $extension)
                : sprintf('%s (%d)', $base, $counter);
            $counter++;
        } while (in_array($candidate, $usedNames, true));

        return $candidate;
    }

    #[AdminRoute('/batch-merge', name: 'batch_merge')]
    public function batchMerge(
        Request $request,
        AdminContext $adminContext,
        BatchActionDto $batchActionDto,
        EntityManagerInterface $entityManager
    ): Response {
        $csrfTokenId = 'ea-batch-action-' . $batchActionDto->getName() . '-' . $batchActionDto->getEntityFqcn();
        if (!$this->isCsrfTokenValid($csrfTokenId, $batchActionDto->getCsrfToken())) {
            $this->addFlash('danger', 'Invalid CSRF token.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        if ($batchActionDto->getEntityFqcn() !== $adminContext->getEntity()->getFqcn()) {
            throw new BadRequestHttpException();
        }

        $entityIds = $batchActionDto->getEntityIds();
        if (count($entityIds) < 2) {
            $this->addFlash('warning', 'Please select at least 2 documents to merge.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $repository = $entityManager->getRepository(Document::class);
        $validIds = [];
        foreach ($entityIds as $entityId) {
            $document = $repository->find($entityId);
            if ($document instanceof Document && $document->isUnderReview()) {
                $validIds[] = $document->getId();
            }
        }

        if (count($validIds) < 2) {
            $this->addFlash('warning', 'Please select at least 2 valid pending documents to merge.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $request->getSession()->set('pending_merge_ids', $validIds);

        return $this->redirectToRoute('admin_document_pending_merge_confirm');
    }

    #[AdminRoute('/merge-confirm', name: 'merge_confirm')]
    public function mergeConfirm(
        Request $request,
        EntityManagerInterface $entityManager
    ): Response {
        $sessionIds = $request->getSession()->get('pending_merge_ids');
        $queryIds = $request->query->all('ids');
        $ids = !empty($queryIds) ? $queryIds : (is_array($sessionIds) ? $sessionIds : []);

        if (count($ids) < 2) {
            $this->addFlash('warning', 'Please select at least 2 documents to merge.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $repository = $entityManager->getRepository(Document::class);
        /** @var Document[] $documents */
        $documents = [];
        foreach ($ids as $id) {
            $doc = $repository->find($id);
            if ($doc instanceof Document && $doc->isUnderReview()) {
                $documents[] = $doc;
            }
        }

        if (count($documents) < 2) {
            $this->addFlash('warning', 'Fewer than 2 valid pending documents were found to merge.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $primaryDocument = $documents[0];
        $courses = $entityManager->getRepository(Course::class)->findBy([], ['name' => 'ASC']);
        $categories = $entityManager->getRepository(DocumentCategory::class)->findBy([], ['name_nl' => 'ASC']);
        $years = Document::getAcademicYearChoices(amountOfYears: 40);

        return $this->render(
            'admin/document_pending_merge.html.twig',
            [
                'documents' => $documents,
                'primaryDocument' => $primaryDocument,
                'courses' => $courses,
                'categories' => $categories,
                'years' => $years,
            ]
        );
    }

    #[AdminRoute('/merge-process', name: 'merge_process')]
    public function mergeProcess(
        Request $request,
        EntityManagerInterface $entityManager,
        StorageInterface $storage
    ): Response {
        if (!$this->isCsrfTokenValid('admin_document_pending_merge', (string) $request->request->get('_token'))) {
            $this->addFlash('danger', 'Invalid CSRF token.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $primaryId = $request->request->getInt('primary_id');
        /** @var list<int|string> $mergeIds */
        $mergeIds = $request->request->all('merge_ids');
        $name = trim((string) $request->request->get('name'));
        $courseId = $request->request->getInt('course_id');
        $categoryId = $request->request->getInt('category_id');
        $year = (string) $request->request->get('year');
        $year = $year !== '' ? $year : null;
        $approveImmediately = (bool) $request->request->get('approve_immediately');

        if (empty($name)) {
            $this->addFlash('danger', 'A document name is required.');
            return $this->redirectToRoute('admin_document_pending_merge_confirm');
        }

        if (count($mergeIds) < 2 || !in_array((string) $primaryId, array_map('strval', $mergeIds), true)) {
            $this->addFlash('danger', 'Invalid merge selection.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $docRepo = $entityManager->getRepository(Document::class);
        $primaryDoc = $docRepo->find($primaryId);
        if (!$primaryDoc instanceof Document || !$primaryDoc->isUnderReview()) {
            $this->addFlash('danger', 'Primary document is invalid or not pending.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        /** @var Document[] $allDocs */
        $allDocs = [];
        foreach ($mergeIds as $id) {
            $doc = $docRepo->find($id);
            if ($doc instanceof Document && $doc->isUnderReview()) {
                $allDocs[] = $doc;
            }
        }

        if (count($allDocs) < 2) {
            $this->addFlash('danger', 'At least 2 valid pending documents are required to merge.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $course = $entityManager->getRepository(Course::class)->find($courseId);
        $category = $entityManager->getRepository(DocumentCategory::class)->find($categoryId);

        if (!$course instanceof Course || !$category instanceof DocumentCategory) {
            $this->addFlash('danger', 'Selected course or category is invalid.');
            return $this->redirectToRoute('admin_document_pending_merge_confirm');
        }

        $tempZipPath = tempnam(sys_get_temp_dir(), 'merged_doc_') . '.zip';

        $zip = new ZipArchive();
        if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Failed to create ZIP archive.');
        }

        $usedNames = [];
        $filesAdded = 0;
        foreach ($allDocs as $doc) {
            $stream = $storage->resolveStream($doc, 'file');
            if ($stream === null) {
                continue;
            }

            $baseName = DownloadFilename::forDocument($doc);
            $uniqueName = $this->getUniqueZipFilename($baseName, $usedNames);
            $usedNames[] = $uniqueName;

            $content = stream_get_contents($stream);
            fclose($stream);

            if ($content !== false) {
                $zip->addFromString($uniqueName, $content);
                $filesAdded++;
            }
        }

        if ($filesAdded === 0) {
            $zip->close();
            @unlink($tempZipPath);
            $this->addFlash('danger', 'None of the selected documents contained downloadable files to merge.');
            return $this->redirectToRoute('admin_document_pending_index');
        }

        $zip->close();

        // Attach the ZIP file to primaryDoc
        $primaryDoc->setFile(new ReplacingFile($tempZipPath));
        $primaryDoc->setName($name);
        $primaryDoc->setCourse($course);
        $primaryDoc->setCategory($category);
        $primaryDoc->setYear($year);

        if ($approveImmediately) {
            $primaryDoc->setUnderReview(false);
        }

        // Merge tags from all companion documents
        foreach ($allDocs as $doc) {
            foreach ($doc->getTags() as $tag) {
                if (!$primaryDoc->getTags()->contains($tag)) {
                    $primaryDoc->addTag($tag);
                }
            }
        }

        // Remove the companion documents
        foreach ($allDocs as $doc) {
            if ($doc->getId() !== $primaryDoc->getId()) {
                $entityManager->remove($doc);
            }
        }

        $entityManager->flush();
        @unlink($tempZipPath);
        $request->getSession()->remove('pending_merge_ids');

        $this->addFlash(
            'success',
            sprintf(
                'Successfully merged %d documents into "%s" (%d files packaged into ZIP).',
                count($allDocs),
                $primaryDoc->getName(),
                $filesAdded
            )
        );

        return $this->redirectToRoute('admin_document_pending_index');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('name')
            ->add('year')
            ->add(EntityContainsFilter::new('course', Course::class))
            ->add(EntityContainsFilter::new('category', DocumentCategory::class))
            ->add(EntityContainsFilter::new('tags', Tag::class))
            ->add('under_review')
            ->add('anonymous');
    }
}
