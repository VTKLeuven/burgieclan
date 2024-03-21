<?php


namespace App\Controller\Admin;

use App\Entity\Document;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;


use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;

use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;

use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;

class DocumentPendingCrudController extends DocumentCrudController
{
    public static function getEntityFqcn(): string
    {
        return Document::class;
    }

    public function configureActions(Actions $actions): Actions
    {
        $approveAction = Action::new('approve')
        ->linkToCrudAction('approve')
        ->setTemplatePath('admin/approve_action.html.twig')
        ->addCssClass('btn btn-success')
            ->setIcon('fa fa-check-circle')
            ->displayAsButton();

        return parent::configureActions($actions)
            ->add(Crud::PAGE_INDEX, $approveAction);
    }

    public function createIndexQueryBuilder(
        SearchDto $searchDto,
        EntityDto $entityDto,
        FieldCollection $fields,
        FilterCollection $filters
    ): QueryBuilder {
        return parent::createIndexQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ->andWhere('entity.under_review = :approved')
            ->setParameter('approved', false);
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->showEntityActionsInlined();
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');
        yield DateTimeField::new('createDate')
        ->hideOnForm();
        yield DateTimeField::new('updateDate')
        ->hideOnForm();
        yield AssociationField::new('category')
        ->autocomplete();
        yield AssociationField::new('course')
        ->autocomplete();
    }
    public function approve(AdminContext $adminContext, EntityManagerInterface $entityManagerInterface, AdminUrlGenerator $adminUrlGenerator)
    {
        $document = $adminContext->getEntity()->getInstance();
        if (!$document instanceof Document) {
            throw new \LogicException('Entity is missing or not a Document');
        }
        $document->setUnderReview(true);

        $entityManagerInterface->flush();

        $targetUrl = $adminUrlGenerator
        ->setController(self::class)
        ->setAction(Crud::PAGE_EDIT)
        ->setEntityId($document->getId())
        ->generateUrl();
    return $this->redirect($targetUrl);
    }
}
