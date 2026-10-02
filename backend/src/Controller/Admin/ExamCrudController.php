<?php

namespace App\Controller\Admin;

use App\Constants\AdminActionCsrf;
use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\CollabDocument;
use App\Entity\CollabDocumentRevision;
use App\Entity\Course;
use App\Entity\Exam;
use App\Entity\User;
use App\Repository\CollabDocumentRepository;
use App\Repository\CollabDocumentRevisionRepository;
use App\Repository\UserRepository;
use App\Service\Collab\CollabDocumentStore;
use App\Service\Collab\CollabServerClient;
use App\Service\Collab\CollabServerException;
use App\Utils\ExamContent;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Config\KeyValueStore;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\Field;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Exam reconstructions for moderators: see who changed what, roll back, lock and reopen.
 *
 * Students start and edit reconstructions on the site; nothing here edits content directly. A
 * rollback goes through the collab server (CollabServerClient::restore) so everyone who has the
 * exam open gets it as a normal edit, and the version it replaces is kept first, so a rollback
 * can itself be rolled back.
 *
 * Locking and reopening only move `editableUntil`. Everyone who has the exam open is then
 * reconnected, which hands them a token for the new situation.
 *
 * The state-changing actions are POST-only and check a CSRF token (AdminActionCsrf). Their paths
 * have two segments so a GET is answered 405 instead of reaching the detail route
 * (/admin/exam/{entityId}) with "lock" as an id.
 */
#[IsGranted(User::ROLE_MODERATOR)]
class ExamCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly CollabDocumentRepository $documents,
        private readonly CollabDocumentRevisionRepository $revisions,
        private readonly UserRepository $users,
        private readonly CollabDocumentStore $store,
        private readonly CollabServerClient $collab,
        private readonly AdminUrlGenerator $adminUrlGenerator,
    ) {}

    public static function getEntityFqcn(): string
    {
        return Exam::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Exam reconstruction')
            ->setEntityLabelInPlural('Exam reconstructions')
            ->setDefaultSort(['createdAt' => 'DESC'])
            ->setSearchFields(['academicYear', 'course.code', 'course.name'])
            ->overrideTemplate('crud/detail', 'admin/exam_detail.html.twig')
            ->showEntityActionsInlined();
    }

    public function configureActions(Actions $actions): Actions
    {
        $lock = Action::new('lock', 'Lock now')
            ->linkToCrudAction('lock')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-warning')
            ->setIcon('fa fa-lock')
            ->displayIf(static fn(Exam $exam): bool => $exam->isEditable())
            ->renderAsButton();

        $reopen = Action::new('reopen', 'Reopen for two weeks')
            ->linkToCrudAction('reopen')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-secondary')
            ->setIcon('fa fa-lock-open')
            ->displayIf(static fn(Exam $exam): bool => !$exam->isEditable())
            ->renderAsButton();

        $openOnSite = Action::new('openOnSite', 'Open on site')
            ->linkToUrl(fn(Exam $exam): string => $this->siteUrl($exam))
            ->setIcon('fa fa-arrow-up-right-from-square');

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_DETAIL, $lock)
            ->add(Crud::PAGE_DETAIL, $reopen)
            ->add(Crud::PAGE_DETAIL, $openOnSite)
            // Students start reconstructions on the course page.
            ->disable(Action::NEW)
            ->setPermission(Action::DELETE, User::ROLE_ADMIN)
            ->setPermission(Action::BATCH_DELETE, User::ROLE_ADMIN);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->hideOnForm();
        yield AssociationField::new('course')
            ->setDisabled()
            ->hideOnForm();
        yield TextField::new('academicYear')
            ->hideOnForm();
        yield TextField::new('period.value', 'Period')
            ->setSortable(false)
            ->hideOnForm();
        yield Field::new('editable', 'Status')
            ->formatValue(static fn($value): string => $value ? 'Open' : 'Locked')
            ->setSortable(false)
            ->hideOnForm();
        yield DateTimeField::new('editableUntil', 'Editable until')
            ->setHelp(
                'Everyone can edit until this moment; after it the reconstruction is read-only. '
                . 'People who have it open are reconnected when you save.'
            );
        yield IntegerField::new('id', 'Questions')
            ->formatValue(
                fn($value, Exam $exam): int => ExamContent::countQuestions(
                    $this->documents->findOneByName($exam->getDocumentName())?->getContent()
                )
            )
            ->setSortable(false)
            ->onlyOnIndex();
        yield AssociationField::new('copiedFrom', 'Copied from')
            ->onlyOnDetail();
        yield AssociationField::new('creator', 'Started by')
            ->onlyOnDetail();
        yield DateTimeField::new('createdAt', 'Started at')
            ->hideOnForm();
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(EntityContainsFilter::new('course', Course::class))
            ->add('academicYear')
            ->add('editableUntil')
            ->add('createdAt');
    }

    /**
     * Adds the questions as they are now and the revision history to the detail page.
     */
    public function configureResponseParameters(KeyValueStore $responseParameters): KeyValueStore
    {
        if (Crud::PAGE_DETAIL !== $responseParameters->get('pageName')) {
            return $responseParameters;
        }

        $entity = $responseParameters->get('entity');
        $exam = $entity instanceof EntityDto ? $entity->getInstance() : null;
        if (!$exam instanceof Exam) {
            return $responseParameters;
        }

        $document = $this->documents->findOneByName($exam->getDocumentName());
        $revisions = null === $document ? [] : $this->revisions->findForDocument($document);
        $names = $this->contributorNames($document, $revisions);

        $responseParameters->set(
            'exam_current',
            null === $document ? null : [
            'updatedAt' => $document->getUpdatedAt(),
            'questions' => ExamContent::questionTexts($document->getContent()),
            'sittings' => ExamContent::sittings($document->getFields()),
            'contributors' => $this->userNames($document->getPendingContributors(), $names),
            ]
        );
        $responseParameters->set(
            'exam_revisions',
            array_map(
                fn(CollabDocumentRevision $revision): array => [
                    'id' => $revision->getId(),
                    'createdAt' => $revision->getCreatedAt(),
                    'note' => $revision->getNote(),
                    'questions' => ExamContent::questionTexts($revision->getContent()),
                    'sittings' => ExamContent::sittings($revision->getFields()),
                    'contributors' => $this->userNames($revision->getContributors(), $names),
                    'restoreUrl' => $this->adminUrlGenerator
                        ->unsetAll()
                        ->setController(self::class)
                        ->setAction('restoreRevision')
                        ->setEntityId($exam->getId())
                        ->set('revisionId', $revision->getId())
                        ->generateUrl(),
                ],
                $revisions
            )
        );

        return $responseParameters;
    }

    public function updateEntity(EntityManagerInterface $entityManager, object $entityInstance): void
    {
        parent::updateEntity($entityManager, $entityInstance);

        assert($entityInstance instanceof Exam);
        $this->reconnectEveryone($entityInstance);
    }

    /**
     * Also drops everyone who has the exam open. Their browsers reconnect at once and are refused,
     * so the page stops accepting edits that could no longer be stored. Only once the delete is
     * committed: before that, the reconnect would still be handed a token.
     */
    public function deleteEntity(EntityManagerInterface $entityManager, object $entityInstance): void
    {
        assert($entityInstance instanceof Exam);
        // The id, and so the name, is gone from the entity once it is deleted.
        $documentName = $entityInstance->getDocumentName();

        parent::deleteEntity($entityManager, $entityInstance);

        try {
            $this->collab->disconnect($documentName);
        } catch (CollabServerException $exception) {
            $this->addFlash(
                'warning',
                'Deleted, but people who have it open are not told until they reload: ' . $exception->getMessage()
            );
        }
    }

    #[AdminRoute('/access/lock', name: 'lock', options: ['methods' => ['POST']])]
    public function lock(AdminContext $context, EntityManagerInterface $entityManager): RedirectResponse
    {
        $exam = $this->loadExam($context, $entityManager);
        if ($invalid = $this->assertCsrf($context, $exam)) {
            return $invalid;
        }

        $exam->setEditableUntil(new DateTimeImmutable());
        $entityManager->flush();
        $this->reconnectEveryone($exam);

        $this->addFlash('success', 'Locked. It is read-only for everyone now.');

        return $this->redirectToDetail($exam);
    }

    #[AdminRoute('/access/reopen', name: 'reopen', options: ['methods' => ['POST']])]
    public function reopen(AdminContext $context, EntityManagerInterface $entityManager): RedirectResponse
    {
        $exam = $this->loadExam($context, $entityManager);
        if ($invalid = $this->assertCsrf($context, $exam)) {
            return $invalid;
        }

        $exam->setEditableUntil((new DateTimeImmutable())->modify(Exam::EDITABLE_FOR));
        $entityManager->flush();
        $this->reconnectEveryone($exam);

        $this->addFlash(
            'success',
            sprintf(
                'Reopened. Everyone can edit it until %s.',
                $exam->getEditableUntil()->format('j M Y H:i')
            )
        );

        return $this->redirectToDetail($exam);
    }

    /**
     * Rolls the live document back to a revision. The current version is kept as a revision
     * first, so this can be undone the same way.
     */
    #[AdminRoute('/history/restore', name: 'restoreRevision', options: ['methods' => ['POST']])]
    public function restoreRevision(AdminContext $context, EntityManagerInterface $entityManager): RedirectResponse
    {
        $exam = $this->loadExam($context, $entityManager);
        if ($invalid = $this->assertCsrf($context, $exam)) {
            return $invalid;
        }

        $document = $this->documents->findOneByName($exam->getDocumentName());

        $revision = $this->revisions->find((int) $context->getRequest()->query->get('revisionId'));
        if (null === $document || null === $revision || $revision->getDocument() !== $document) {
            throw $this->createNotFoundException('This version does not belong to this exam.');
        }

        $moderator = $this->getUser();
        assert($moderator instanceof User);

        $this->store->snapshot(
            $document,
            sprintf(
                'Before %s restored the version of %s',
                $moderator->getFullName(),
                $revision->getCreatedAt()->format('j M Y H:i')
            )
        );
        $entityManager->flush();

        try {
            $this->collab->restore($exam->getDocumentName(), $revision->getState());
        } catch (CollabServerException $exception) {
            $this->addFlash('danger', 'Nothing was restored: ' . $exception->getMessage());

            return $this->redirectToDetail($exam);
        }

        $this->addFlash(
            'success',
            sprintf(
                'Restored the version of %s. Everyone who has it open sees it now.',
                $revision->getCreatedAt()->format('j M Y H:i')
            )
        );

        return $this->redirectToDetail($exam);
    }

    private function reconnectEveryone(Exam $exam): void
    {
        try {
            $this->collab->disconnect($exam->getDocumentName());
        } catch (CollabServerException $exception) {
            $this->addFlash(
                'warning',
                'Saved, but people who have it open keep their current access until they reload: '
                . $exception->getMessage()
            );
        }
    }

    /**
     * Everyone who changed the exam in the versions shown, looked up in one query rather than one
     * per version.
     *
     * @param CollabDocumentRevision[] $revisions
     *
     * @return array<int, string> "Full Name (username)" by user id
     */
    private function contributorNames(?CollabDocument $document, array $revisions): array
    {
        $userIds = array_merge(
            $document?->getPendingContributors() ?? [],
            ...array_map(
                static fn(CollabDocumentRevision $revision): array => $revision->getContributors(),
                $revisions
            )
        );
        if ([] === $userIds) {
            return [];
        }

        $names = [];
        foreach ($this->users->findBy(['id' => array_unique($userIds)]) as $user) {
            $names[(int) $user->getId()] = sprintf('%s (%s)', $user->getFullName(), $user->getUsername());
        }

        return $names;
    }

    /**
     * @param int[]              $userIds
     * @param array<int, string> $names   from contributorNames()
     *
     * @return list<string>
     */
    private function userNames(array $userIds, array $names): array
    {
        $found = array_values(array_intersect_key($names, array_flip($userIds)));
        sort($found);

        return $found;
    }

    private function siteUrl(Exam $exam): string
    {
        return sprintf(
            '%s/course/%d/exams/%d',
            rtrim((string) $this->getParameter('app.frontend_url'), '/'),
            $exam->getCourse()->getId(),
            $exam->getId()
        );
    }

    /**
     * Refuses a POST that did not come from a button on this admin. Returns the redirect to send
     * back instead, like the other ways an action can fail here, or null when the token is good.
     */
    private function assertCsrf(AdminContext $context, Exam $exam): ?RedirectResponse
    {
        $token = (string) $context->getRequest()->request->get('_token');
        if ($this->isCsrfTokenValid(AdminActionCsrf::INTENTION, $token)) {
            return null;
        }

        $this->addFlash('danger', 'Invalid CSRF token, nothing was changed.');

        return $this->redirectToDetail($exam);
    }

    /**
     * In EasyAdmin 4.26+ the entity is not in the context when POSTing to a custom action.
     * @see FaqQuestionCrudController::loadQuestion()
     */
    private function loadExam(AdminContext $context, EntityManagerInterface $entityManager): Exam
    {
        $entityId = $context->getRequest()->query->get('entityId');
        $exam = $entityId ? $entityManager->getRepository(Exam::class)->find($entityId) : null;
        if (!$exam instanceof Exam) {
            throw $this->createNotFoundException('Exam reconstruction not found.');
        }

        return $exam;
    }

    private function redirectToDetail(Exam $exam): RedirectResponse
    {
        return $this->redirect(
            $this->adminUrlGenerator
                ->unsetAll()
                ->setController(self::class)
                ->setAction(Crud::PAGE_DETAIL)
                ->setEntityId($exam->getId())
                ->generateUrl()
        );
    }
}
