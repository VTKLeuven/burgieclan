<?php

namespace App\Controller\Admin;

use App\Entity\Document;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
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
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Vich\UploaderBundle\Form\Type\VichFileType;

#[IsGranted(User::ROLE_MODERATOR)]
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
            ->add(Crud::PAGE_INDEX, $approveAction)
            ->disable(Action::NEW);
    }

    public function createIndexQueryBuilder(
        SearchDto $searchDto,
        EntityDto $entityDto,
        FieldCollection $fields,
        FilterCollection $filters
    ): QueryBuilder {
        return parent::createIndexQueryBuilder($searchDto, $entityDto, $fields, $filters)
            ->andWhere('entity.under_review = :under_review')
            ->setParameter('under_review', true);
    }

    public function configureCrud(Crud $crud): Crud
    {
        return parent::configureCrud($crud)
            ->setPageTitle(Crud::PAGE_INDEX, 'Pending Documents')
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
        $instance = $this->getContext()->getEntity()->getInstance();
        $firstYear = $instance ? $instance->getYear() : null;
        yield ChoiceField::new('year')
            ->setChoices(Document::getAcademicYearChoices(firstYear: $firstYear))
            ->setLabel('Academic Year')
            ->onlyOnForms();
        yield TextField::new('year')
            ->setLabel('Academic Year')
            ->hideOnForm();
        yield AssociationField::new('tags')
            ->autocomplete()
            ->hideOnIndex()
            ->setFormTypeOption('by_reference', false);
        yield BooleanField::new('under_review')
            ->setLabel('Under review')
            ->renderAsSwitch(false)
            ->hideOnIndex();
        yield BooleanField::new('anonymous')
            ->setLabel('Anonymous')
            ->renderAsSwitch(false);
        yield TextField::new('file')
            ->setFormType(VichFileType::class)
            ->setFormTypeOptions([
                'download_label' => true,
                'allow_delete' => false,
            ])
            ->hideOnIndex();
        yield TextField::new('file_name')
            ->onlyOnIndex();
    }

    public function approve(
        AdminContext $adminContext,
        EntityManagerInterface $entityManagerInterface,
        AdminUrlGenerator $adminUrlGenerator
    ): RedirectResponse {
        $document = $adminContext->getEntity()->getInstance();
        if (!$document instanceof Document) {
            throw new LogicException('Entity is missing or not a Document');
        }
        $document->setUnderReview(false);

        $entityManagerInterface->flush();

        $targetUrl = $adminUrlGenerator
            ->setController(self::class)
            ->setAction(Crud::PAGE_EDIT)
            ->setEntityId($document->getId())
            ->generateUrl();
        return $this->redirect($targetUrl);
    }
}
