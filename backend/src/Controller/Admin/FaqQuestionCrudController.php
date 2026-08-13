<?php

namespace App\Controller\Admin;

use App\Entity\FaqItem;
use App\Entity\FaqQuestion;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Config\Option\EA;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The inbox for questions asked from the FAQ page.
 *
 * Questions are never created here — they arrive over the API — so NEW is disabled and the two
 * actions that matter are "promote" (turn it into a published FAQ item) and "mark handled".
 */
#[IsGranted(User::ROLE_ADMIN)]
class FaqQuestionCrudController extends AbstractCrudController
{
    /**
     * Query parameter carrying the question to prefill a new FaqItem with.
     * @see FaqItemCrudController::createEntity()
     */
    public const PROMOTE_PARAM = 'promoteFaqQuestion';

    public static function getEntityFqcn(): string
    {
        return FaqQuestion::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            // Newest first: this is an inbox, not a catalogue.
            ->setDefaultSort(['createdAt' => 'DESC'])
            ->setEntityLabelInSingular('FAQ Question')
            ->setEntityLabelInPlural('FAQ Questions')
            ->setPageTitle(Crud::PAGE_INDEX, 'FAQ Questions')
            ->showEntityActionsInlined();
    }

    public function configureActions(Actions $actions): Actions
    {
        $promoteAction = Action::new('promote', 'Promote')
            ->linkToCrudAction('promote')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-success')
            ->setIcon('fa fa-circle-question')
            ->setHtmlAttributes(['title' => 'Create a published FAQ item from this question'])
            ->displayIf(static fn(FaqQuestion $question) => $question->isNew())
            ->renderAsButton();

        $markHandledAction = Action::new('markHandled', 'Mark handled')
            ->linkToCrudAction('markHandled')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-secondary')
            ->setIcon('fa fa-check')
            ->displayIf(static fn(FaqQuestion $question) => $question->isNew())
            ->renderAsButton();

        return $actions
            ->add(Crud::PAGE_INDEX, $promoteAction)
            ->add(Crud::PAGE_INDEX, $markHandledAction)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_DETAIL, $promoteAction)
            // Questions come in over the API; there is nothing to create by hand.
            ->disable(Action::NEW);
    }

    public function configureFields(string $pageName): iterable
    {
        yield DateTimeField::new('createdAt')
            ->setLabel('Asked at')
            ->hideOnForm();

        // Truncated in the list so a rambling question does not stretch the row, in full everywhere
        // else. renderAsHtml stays off in both: this is user-submitted text.
        yield TextareaField::new('question')
            ->setLabel('Question')
            ->setMaxLength(120)
            ->renderAsHtml(false)
            ->onlyOnIndex();
        yield TextareaField::new('question')
            ->setLabel('Question')
            ->renderAsHtml(false)
            ->hideOnIndex();

        yield AssociationField::new('author')
            ->setLabel('Asked by')
            ->setHelp('Empty when the account that asked has since been deleted')
            ->hideOnForm();

        yield ChoiceField::new('locale')
            ->setLabel('Language')
            // FaqItem::$AVAILABLE_LANGUAGES is value => label; ChoiceField wants label => value.
            ->setChoices(array_flip(FaqItem::$AVAILABLE_LANGUAGES))
            ->hideOnForm();

        yield ChoiceField::new('type')
            ->setLabel('Category')
            ->setChoices(FaqQuestion::$TYPES)
            ->renderAsBadges(
                [
                    FaqQuestion::TYPE_GENERAL => 'info',
                    FaqQuestion::TYPE_COURSE_ISSUE => 'danger',
                    FaqQuestion::TYPE_EXAM => 'warning',
                    FaqQuestion::TYPE_OTHER => 'secondary',
                ]
            );

        yield ChoiceField::new('status')
            ->setLabel('Status')
            ->setChoices(FaqQuestion::$STATUSES)
            ->renderAsBadges(
                [
                    FaqQuestion::STATUS_NEW => 'warning',
                    FaqQuestion::STATUS_HANDLED => 'success',
                    FaqQuestion::STATUS_ARCHIVED => 'secondary',
                ]
            );
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('question')
            ->add('type')
            ->add('status')
            ->add('locale')
            ->add('author')
            ->add('createdAt');
    }

    /**
     * Turn a question into a published FAQ item: mark it handled, then hand the admin a new
     * FaqItem form with the question already filled in for the language it was asked in.
     */
    #[AdminRoute('/promote', name: 'promote')]
    public function promote(
        AdminContext $adminContext,
        EntityManagerInterface $entityManager,
        AdminUrlGenerator $adminUrlGenerator,
    ): RedirectResponse {
        $question = $this->loadQuestion($adminContext, $entityManager);

        $question->setStatus(FaqQuestion::STATUS_HANDLED);
        $entityManager->flush();

        $this->addFlash(
            'info',
            'Question marked handled. Fill in the answer below to publish it — if you abandon this '
            . 'form, set the question back to "new" in the FAQ Questions list.'
        );

        $targetUrl = $adminUrlGenerator
            ->setController(FaqItemCrudController::class)
            ->setAction(Crud::PAGE_NEW)
            // AdminUrlGenerator carries the current request's params over, and this request has an
            // entityId (the question). Left in place, the NEW page would try to load a FaqItem
            // with that id and 404.
            ->unset(EA::ENTITY_ID)
            ->set(self::PROMOTE_PARAM, $question->getId())
            ->generateUrl();

        return $this->redirect($targetUrl);
    }

    #[AdminRoute('/mark-handled', name: 'markHandled')]
    public function markHandled(
        AdminContext $adminContext,
        EntityManagerInterface $entityManager,
        AdminUrlGenerator $adminUrlGenerator,
    ): RedirectResponse {
        $question = $this->loadQuestion($adminContext, $entityManager);

        $question->setStatus(FaqQuestion::STATUS_HANDLED);
        $entityManager->flush();

        $targetUrl = $adminUrlGenerator
            ->setController(self::class)
            ->setAction(Crud::PAGE_INDEX)
            ->generateUrl();

        return $this->redirect($targetUrl);
    }

    /**
     * In EasyAdmin 4.26+ the entity is not in the context when POSTing to a custom action, so it
     * has to be loaded from the request by hand. @see DocumentPendingCrudController::approve()
     */
    private function loadQuestion(AdminContext $adminContext, EntityManagerInterface $entityManager): FaqQuestion
    {
        $entityId = $adminContext->getRequest()->query->get('entityId');
        if (!$entityId) {
            throw new LogicException('Entity ID is missing from the request');
        }

        $question = $entityManager->getRepository(FaqQuestion::class)->find($entityId);
        if (!$question instanceof FaqQuestion) {
            throw new LogicException('FAQ question not found with ID: ' . $entityId);
        }

        return $question;
    }
}
