<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\Course;
use App\Entity\Module;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class ModuleCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Module::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextField::new('name');
        yield AssociationField::new('program');
        yield AssociationField::new('modules');
        yield AssociationField::new('courses');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('name')
            ->add('program')
            ->add(EntityContainsFilter::new('modules', Module::class))
            ->add(EntityContainsFilter::new('courses', Course::class));
    }
}
