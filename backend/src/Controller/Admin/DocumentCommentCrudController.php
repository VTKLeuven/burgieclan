<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\DocumentComment;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class DocumentCommentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return DocumentComment::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Document Comment')
            ->setEntityLabelInPlural('Document Comments');
    }

    public function createEntity(string $entityFqcn): DocumentComment
    {
        $user = $this->getUser();
        assert($user instanceof User);
        return new DocumentComment($user);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextEditorField::new('content')
            ->setTemplatePath('admin/text_editor.html.twig');
        yield AssociationField::new('creator')
            ->hideOnForm();
        yield BooleanField::new('anonymous')
            ->renderAsSwitch(false);
        yield AssociationField::new('document')
            ->autocomplete()
            ->setCrudController(DocumentCrudController::class);
            // Explicit reference needed because there are multiple crudcontrollers for Document
            // See https://symfonycasts.com/screencast/easyadminbundle/multiple-crud#autocomplete-and-multiple-crud-controllers
        yield DateTimeField::new('createDate')
            ->hideOnForm();
        yield DateTimeField::new('updateDate')
            ->hideOnForm();
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('content')
            ->add(EntityContainsFilter::new('creator', User::class))
            ->add('anonymous')
            ->add(EntityContainsFilter::new('document', DocumentComment::class))
            ->add('createDate')
            ->add('updateDate');
    }
}
