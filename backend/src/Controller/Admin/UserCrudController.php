<?php

namespace App\Controller\Admin;

use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AvatarField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;

class UserCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return User::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield AvatarField::new('email')->setIsGravatarEmail()->hideOnForm();
        yield TextField::new('fullName');
        yield TextField::new('username');
        yield EmailField::new('email');
        yield ChoiceField::new('roles')
            ->setChoices(array_combine(User::getAvailableRoles(), User::getAvailableRoles()))
            ->allowMultipleChoices()
            ->renderExpanded()
            ->renderAsBadges()
            ->setPermission(USER::ROLE_SUPER_ADMIN);
            
        yield AssociationField::new('favoritePrograms')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Programs');
        yield AssociationField::new('favoriteModules')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Modules');
        yield AssociationField::new('favoriteCourses')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Courses');
        yield AssociationField::new('favoriteDocuments')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Documents');
    }
}