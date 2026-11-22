<?php

namespace App\Controller\Admin;

use App\Constants\AdminActionCsrf;
use App\Constants\ExchangeProgram;
use App\Entity\ExchangeReport;
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
use EasyCorp\Bundle\EasyAdminBundle\Field\Field;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Exchange reports, with the ones waiting for review first. Students write them on the site;
 * moderators read them, fix what needs fixing, and approve them. Approving a report on a
 * destination a student added does not approve that destination: see ExchangeDestinationCrudController.
 */
#[IsGranted(User::ROLE_MODERATOR)]
class ExchangeReportCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return ExchangeReport::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setDefaultSort(['underReview' => 'DESC', 'createdAt' => 'DESC'])
            ->setEntityLabelInSingular('Exchange report')
            ->setEntityLabelInPlural('Exchange reports')
            ->showEntityActionsInlined();
    }

    public function configureActions(Actions $actions): Actions
    {
        $approve = Action::new('approve', 'Approve')
            ->linkToCrudAction('approve')
            ->setTemplatePath('admin/approve_action.html.twig')
            ->addCssClass('btn btn-success')
            ->setIcon('fa fa-check-circle')
            ->displayIf(static fn (ExchangeReport $report): bool => $report->isUnderReview())
            ->renderAsButton();

        return $actions
            ->add(Crud::PAGE_INDEX, $approve)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_DETAIL, $approve)
            // Reports are written on the site.
            ->disable(Action::NEW);
    }

    public function configureFields(string $pageName): iterable
    {
        yield AssociationField::new('destination')->autocomplete();
        yield TextField::new('academicYear')->setHelp('Format: 2024 - 2025');
        yield ChoiceField::new('phase')->setChoices(array_combine(ExchangeReport::PHASES, ExchangeReport::PHASES));
        yield ChoiceField::new('period')->setChoices(['First semester' => 'S1', 'Second semester' => 'S2', 'Whole year' => 'J']);
        yield ChoiceField::new('program')->setChoices(ExchangeProgram::choices());
        yield AssociationField::new('author')->hideOnForm();
        yield BooleanField::new('underReview')->renderAsSwitch(false)->hideOnForm();
        yield DateTimeField::new('createdAt')->hideOnForm();

        yield FormField::addFieldset('Texts')->hideOnIndex();
        // User-submitted text: never rendered as HTML.
        foreach (
            [
            'generalText' => 'Algemeen',
            'educationText' => 'Onderwijs',
            'housingText' => 'Wonen',
            'lifeText' => 'Leven',
            'transportText' => 'Transport',
            'otherText' => 'Andere',
            ] as $property => $label
        ) {
            yield TextareaField::new($property, $label)->renderAsHtml(false)->hideOnIndex();
        }
        yield TextareaField::new('coursesSummary', 'Courses')->renderAsHtml(false)->onlyOnDetail();
        yield Field::new('files', 'Files')
            ->setTemplatePath('admin/field/exchange_report_files.html.twig')
            ->setHelp('Usually the course package of the master at the host. Delete the report to remove them.')
            ->onlyOnDetail();

        yield FormField::addFieldset('Visibility')->hideOnIndex();
        yield BooleanField::new('contactable')->setHelp('Signed-in students see the author\'s e-mail address.')->hideOnIndex();
        yield BooleanField::new('showName')->setHelp('The author\'s name is shown with the report.')->hideOnIndex();
        yield BooleanField::new('underReview')->onlyOnForms();
        yield TextField::new('legacyAuthorName', 'Name (wiki)')->setHelp('Only for reports imported from the old wiki.')->hideOnIndex();
        yield TextField::new('legacyContactEmail', 'E-mail (wiki)')->hideOnIndex();
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('underReview')
            ->add('destination')
            ->add('program')
            ->add('academicYear');
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
        $report = $entityManager->getRepository(ExchangeReport::class)->find($entityId);
        if (!$report instanceof ExchangeReport) {
            throw $this->createNotFoundException('Exchange report not found with ID: ' . $entityId);
        }

        $report->setUnderReview(false);
        $entityManager->flush();

        if (!$report->getDestination()->isApproved()) {
            $this->addFlash('warning', sprintf('Approved. "%s" was added by a student and is not approved yet, so the report only shows once that destination is.', $report->getDestination()->getName()));
        } else {
            $this->addFlash('success', 'Approved. The report is now on the site.');
        }

        return $this->redirect($index);
    }
}
