<?php

namespace App\Controller\Admin;

use App\Entity\Professor;
use App\Entity\User;
use App\Service\ProfessorService;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ImageField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class ProfessorCrudController extends AbstractCrudController
{
    public function __construct(
        private ProfessorService $professorService,
        private AdminUrlGenerator $adminUrlGenerator
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return Professor::class;
    }

    public function configureActions(Actions $actions): Actions
    {
        $updateFromKul = Action::new('updateFromKul', 'Update from KUL', 'fa fa-refresh')
            ->linkToCrudAction('updateFromKul')
            ->displayAsButton();

        $updateAllFromKul = Action::new('updateAllFromKul', 'Update All from KUL', 'fa fa-refresh')
            ->linkToCrudAction('updateAllFromKul')
            ->displayAsButton()
            ->createAsGlobalAction();

        return $actions
            ->add(Crud::PAGE_DETAIL, $updateFromKul)
            ->add(Crud::PAGE_INDEX, $updateAllFromKul);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextField::new('uNumber', 'U-Number')
            ->setHelp('Format: u1234567');
        yield TextField::new('name');
        yield EmailField::new('email');
        yield ImageField::new('pictureUrl', 'Picture')
            ->hideOnForm();
        yield TextField::new('department');
        yield TextField::new('title');
        yield DateTimeField::new('lastUpdated', 'Last Updated')
            ->hideOnForm();
        yield AssociationField::new('courses')
            ->hideOnForm();
    }

    public function updateFromKul(): Response
    {
        $professor = $this->getContext()->getEntity()->getInstance();
        
        if (!$professor instanceof Professor) {
            $this->addFlash('error', 'Invalid professor entity');
            return $this->redirectToRoute('admin');
        }

        $updated = $this->professorService->fetchAndUpdateProfessor($professor->getUNumber());
        
        if ($updated) {
            $this->addFlash('success', sprintf('Professor %s updated successfully from KUL', $professor->getName()));
        } else {
            $this->addFlash('error', sprintf('Failed to update professor %s from KUL', $professor->getUNumber()));
        }

        $url = $this->adminUrlGenerator
            ->setController(ProfessorCrudController::class)
            ->setAction(Action::DETAIL)
            ->setEntityId($professor->getId())
            ->generateUrl();

        return $this->redirect($url);
    }

    public function updateAllFromKul(): Response
    {
        $results = $this->professorService->updateAllProfessors();
        
        $this->addFlash('success', sprintf(
            'Updated %d professors successfully. %d failed.',
            $results['updated'],
            $results['failed']
        ));

        $url = $this->adminUrlGenerator
            ->setController(ProfessorCrudController::class)
            ->setAction(Action::INDEX)
            ->generateUrl();

        return $this->redirect($url);
    }
}