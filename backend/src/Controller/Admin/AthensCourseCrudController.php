<?php

namespace App\Controller\Admin;

use App\Entity\AthensCourse;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The ATHENS courses, to look up. Read-only: they come from resources/athens/catalogue.json
 * (`app:exchange:import-athens`, run on every deploy), so a change made here would be undone.
 * Fix the file instead.
 */
#[IsGranted(User::ROLE_MODERATOR)]
class AthensCourseCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AthensCourse::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setDefaultSort(['active' => 'DESC', 'code' => 'ASC'])
            ->setEntityLabelInSingular('ATHENS course')
            ->setEntityLabelInPlural('ATHENS courses')
            ->setSearchFields(['code', 'title', 'evaluation'])
            ->setHelp(Crud::PAGE_INDEX, 'From the faculty\'s catalogue, through resources/athens/catalogue.json. Courses that left the catalogue are inactive: hidden on the site, reviews kept.');
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->disable(Action::NEW, Action::EDIT, Action::DELETE);
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('code');
        yield TextField::new('title');
        yield AssociationField::new('university');
        yield TextField::new('evaluation');
        yield TextField::new('programsSummary', 'Positive advice');
        yield BooleanField::new('active')->renderAsSwitch(false);
        yield TextField::new('firstEdition')->onlyOnDetail();
        yield TextField::new('lastEdition');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters->add('active')->add('university');
    }
}
