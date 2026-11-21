<?php

namespace App\Controller\Admin;

use App\Constants\AdminActionCsrf;
use App\Constants\ExchangeProgram;
use App\Entity\ExchangeProgramSuggestion;
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
 * Students' suggestions that a destination is (no longer) open to a programme, pending first.
 * Accepting one changes the destination's programmes; check the faculty's list of preferred
 * destinations or ask the exchange coordinator when in doubt.
 */
#[IsGranted(User::ROLE_MODERATOR)]
class ExchangeProgramSuggestionCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return ExchangeProgramSuggestion::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setDefaultSort(['status' => 'DESC', 'createdAt' => 'DESC'])
            ->setEntityLabelInSingular('Programme suggestion')
            ->setEntityLabelInPlural('Programme suggestions')
            ->showEntityActionsInlined();
    }

    public function configureActions(Actions $actions): Actions
    {
        $accept = Action::new('accept', 'Accept')
            ->linkToCrudAction('accept')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-success')
            ->setIcon('fa fa-check')
            ->displayIf(static fn (ExchangeProgramSuggestion $suggestion): bool => $suggestion->isPending())
            ->renderAsButton();
        $reject = Action::new('reject', 'Reject')
            ->linkToCrudAction('reject')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-secondary')
            ->setIcon('fa fa-xmark')
            ->displayIf(static fn (ExchangeProgramSuggestion $suggestion): bool => $suggestion->isPending())
            ->renderAsButton();

        return $actions
            ->add(Crud::PAGE_INDEX, $accept)
            ->add(Crud::PAGE_INDEX, $reject)
            ->disable(Action::NEW, Action::EDIT);
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('destination');
        yield ChoiceField::new('action')->setChoices(['Add' => ExchangeProgramSuggestion::ACTION_ADD, 'Remove' => ExchangeProgramSuggestion::ACTION_REMOVE])
            ->renderAsBadges([ExchangeProgramSuggestion::ACTION_ADD => 'success', ExchangeProgramSuggestion::ACTION_REMOVE => 'danger']);
        yield ChoiceField::new('program')->setChoices(ExchangeProgram::choices());
        yield TextareaField::new('note')->renderAsHtml(false);
        yield AssociationField::new('author');
        yield ChoiceField::new('status')
            ->setChoices(['Pending' => ExchangeProgramSuggestion::STATUS_PENDING, 'Accepted' => ExchangeProgramSuggestion::STATUS_ACCEPTED, 'Rejected' => ExchangeProgramSuggestion::STATUS_REJECTED])
            ->renderAsBadges([ExchangeProgramSuggestion::STATUS_PENDING => 'warning', ExchangeProgramSuggestion::STATUS_ACCEPTED => 'success', ExchangeProgramSuggestion::STATUS_REJECTED => 'secondary']);
        yield DateTimeField::new('createdAt');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters->add('status')->add('destination');
    }

    /** POST-only with a CSRF token. @see AdminActionCsrf */
    #[AdminRoute('/accept', name: 'accept', options: ['methods' => ['POST']])]
    public function accept(AdminContext $adminContext, EntityManagerInterface $entityManager, AdminUrlGenerator $adminUrlGenerator): RedirectResponse
    {
        return $this->decide($adminContext, $entityManager, $adminUrlGenerator, true);
    }

    /** POST-only with a CSRF token. @see AdminActionCsrf */
    #[AdminRoute('/reject', name: 'reject', options: ['methods' => ['POST']])]
    public function reject(AdminContext $adminContext, EntityManagerInterface $entityManager, AdminUrlGenerator $adminUrlGenerator): RedirectResponse
    {
        return $this->decide($adminContext, $entityManager, $adminUrlGenerator, false);
    }

    private function decide(AdminContext $adminContext, EntityManagerInterface $entityManager, AdminUrlGenerator $adminUrlGenerator, bool $accept): RedirectResponse
    {
        $index = $adminUrlGenerator->setController(self::class)->setAction(Crud::PAGE_INDEX)->unset(EA::ENTITY_ID)->generateUrl();

        $token = (string) $adminContext->getRequest()->request->get('_token');
        if (!$this->isCsrfTokenValid(AdminActionCsrf::INTENTION, $token)) {
            $this->addFlash('danger', 'Invalid CSRF token, nothing was changed.');

            return $this->redirect($index);
        }

        $entityId = $adminContext->getRequest()->query->get('entityId');
        if (!$entityId) {
            throw new LogicException('Entity ID is missing from the request');
        }
        $suggestion = $entityManager->getRepository(ExchangeProgramSuggestion::class)->find($entityId);
        if (!$suggestion instanceof ExchangeProgramSuggestion) {
            throw $this->createNotFoundException('Suggestion not found with ID: ' . $entityId);
        }

        if ($suggestion->isPending()) {
            $accept ? $suggestion->accept() : $suggestion->reject();
            $entityManager->flush();
        }
        $this->addFlash('success', $accept ? 'Accepted: the destination\'s programmes are updated.' : 'Rejected.');

        return $this->redirect($index);
    }
}
