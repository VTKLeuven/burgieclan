<?php

namespace App\Controller\Admin;

use App\Constants\AdminActionCsrf;
use App\Constants\ExchangeProgram;
use App\Entity\ExchangeDestination;
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
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Exchange destinations. The faculty's own come from `app:exchange:seed-destinations`; students
 * add missing ones from the report form, and those wait here (unapproved first) until a moderator
 * checks the name, city and country and approves them. A duplicate is best deleted, which also
 * deletes its reports, after moving those to the right destination in Exchange reports.
 */
#[IsGranted(User::ROLE_MODERATOR)]
class ExchangeDestinationCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return ExchangeDestination::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setDefaultSort(['approved' => 'ASC', 'name' => 'ASC'])
            ->setEntityLabelInSingular('Exchange destination')
            ->setEntityLabelInPlural('Exchange destinations')
            ->setSearchFields(['name', 'city', 'country'])
            ->showEntityActionsInlined();
    }

    public function configureActions(Actions $actions): Actions
    {
        $approve = Action::new('approve', 'Approve')
            ->linkToCrudAction('approve')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-success')
            ->setIcon('fa fa-check-circle')
            ->displayIf(static fn (ExchangeDestination $destination): bool => !$destination->isApproved())
            ->renderAsButton();

        return $actions->add(Crud::PAGE_INDEX, $approve);
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');
        yield TextField::new('city');
        yield TextField::new('country')->setHelp('Two-letter ISO code, e.g. CH, DE or US.');
        yield UrlField::new('website')->hideOnIndex();
        yield ChoiceField::new('programs')
            ->setChoices(ExchangeProgram::choices())
            ->allowMultipleChoices()
            ->setHelp('The programmes this university is open to. Ignored when "All programmes" is on.');
        yield BooleanField::new('allPrograms', 'All programmes')->renderAsSwitch(false);
        yield ChoiceField::new('source')->setChoices(
            [
            'Faculty' => ExchangeDestination::SOURCE_FACULTY,
            'Old wiki' => ExchangeDestination::SOURCE_WIKI,
            'Student' => ExchangeDestination::SOURCE_STUDENT,
            ]
        )->setHelp('Destinations from the old wiki are marked as possibly out of date on the site.');
        yield BooleanField::new('approved')->renderAsSwitch(false);
        yield AssociationField::new('suggestedBy')->setHelp('Empty for the faculty\'s own destinations.')->hideOnForm();
        yield DateTimeField::new('createdAt')->hideOnForm()->hideOnIndex();
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters->add('approved')->add('country');
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
        $destination = $entityManager->getRepository(ExchangeDestination::class)->find($entityId);
        if (!$destination instanceof ExchangeDestination) {
            throw $this->createNotFoundException('Exchange destination not found with ID: ' . $entityId);
        }

        $destination->setApproved(true);
        $entityManager->flush();
        $this->addFlash('success', sprintf('"%s" is now listed. Its approved reports show with it.', $destination->getName()));

        return $this->redirect($index);
    }
}
