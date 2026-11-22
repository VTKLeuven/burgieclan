<?php

namespace App\Controller\Admin;

use App\Constants\AdminActionCsrf;
use App\Constants\AthensTopic;
use App\Constants\ExchangeProgram;
use App\Entity\AthensReview;
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
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Reviews of ATHENS courses, the ones waiting for review first. Students write them on the
 * site; moderators read them, fix what needs fixing, and approve them.
 */
#[IsGranted(User::ROLE_MODERATOR)]
class AthensReviewCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AthensReview::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setDefaultSort(['underReview' => 'DESC', 'createdAt' => 'DESC'])
            ->setEntityLabelInSingular('ATHENS review')
            ->setEntityLabelInPlural('ATHENS reviews')
            ->showEntityActionsInlined();
    }

    public function configureActions(Actions $actions): Actions
    {
        $approve = Action::new('approve', 'Approve')
            ->linkToCrudAction('approve')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-success')
            ->setIcon('fa fa-check-circle')
            ->displayIf(static fn (AthensReview $review): bool => $review->isUnderReview())
            ->renderAsButton();

        return $actions
            ->add(Crud::PAGE_INDEX, $approve)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_DETAIL, $approve)
            // Reviews are written on the site.
            ->disable(Action::NEW);
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('course')->setFormTypeOption('disabled', true);
        yield TextField::new('session')->setHelp('Year and month of the ATHENS week: 2025-11 or 2026-03');
        yield ChoiceField::new('program')->setChoices(ExchangeProgram::choices());
        yield IntegerField::new('rating')->setHelp('1 to 5');
        yield AssociationField::new('author')->hideOnForm();
        yield BooleanField::new('underReview')->renderAsSwitch(false)->hideOnForm();
        yield DateTimeField::new('createdAt')->hideOnForm();

        yield FormField::addFieldset('Texts')->hideOnIndex();
        // User-submitted text: never rendered as HTML.
        foreach (AthensTopic::cases() as $topic) {
            yield TextareaField::new($topic->value . 'Text', $topic->label())->renderAsHtml(false)->hideOnIndex();
        }

        yield FormField::addFieldset('Visibility')->hideOnIndex();
        yield BooleanField::new('contactable')->setHelp('Signed-in students see the author\'s e-mail address.')->hideOnIndex();
        yield BooleanField::new('showName')->setHelp('The author\'s name is shown with the review.')->hideOnIndex();
        yield BooleanField::new('underReview')->onlyOnForms();
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters->add('underReview')->add('program')->add('session');
    }

    /** POST-only with a CSRF token, like the other approve buttons. @see AdminActionCsrf */
    #[AdminRoute('/approve', name: 'approve', options: ['methods' => ['POST']])]
    public function approve(
        AdminContext $adminContext,
        EntityManagerInterface $entityManager,
        AdminUrlGenerator $adminUrlGenerator,
    ): RedirectResponse {
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
        $review = $entityManager->getRepository(AthensReview::class)->find($entityId);
        if (!$review instanceof AthensReview) {
            throw $this->createNotFoundException('ATHENS review not found with ID: ' . $entityId);
        }

        $review->setUnderReview(false);
        $entityManager->flush();
        $this->addFlash('success', 'Approved. The review is now on the site.');

        return $this->redirect($index);
    }
}
