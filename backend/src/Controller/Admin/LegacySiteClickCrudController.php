<?php

namespace App\Controller\Admin;

use App\Entity\LegacySiteClick;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class LegacySiteClickCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return LegacySiteClick::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Old Burgieclan visitor')
            ->setEntityLabelInPlural('Old Burgieclan usage')
            ->setDefaultSort(['lastClickedAt' => 'DESC'])
            ->setSearchFields(['user.fullName', 'user.username']);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions->disable(Action::NEW, Action::EDIT, Action::DELETE, Action::BATCH_DELETE);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield AssociationField::new('user');
        yield IntegerField::new('clickCount', 'Clicks');
        yield DateTimeField::new('createdAt', 'First click');
        yield DateTimeField::new('lastClickedAt', 'Last click');
    }
}
