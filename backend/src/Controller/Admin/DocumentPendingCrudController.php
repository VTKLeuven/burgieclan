<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\Tag;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FieldCollection;
use EasyCorp\Bundle\EasyAdminBundle\Collection\FilterCollection;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Dto\SearchDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use LogicException;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\PropertyAccess\PropertyPath;
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
            ->renderAsButton();

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
        // The crud/edit override comes from the parent.
        return parent::configureCrud($crud)
            ->setPageTitle(Crud::PAGE_INDEX, 'Pending Documents')
            ->showEntityActionsInlined();
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');
        yield DateTimeField::new('createdAt')
            ->hideOnForm();
        yield DateTimeField::new('updatedAt')
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
        yield TextField::new('author', 'Original author')
            ->setHelp(
                'Only set on files migrated from the old archive: the person who '
                . 'originally wrote them. Those were all uploaded by one archive account, '
                . 'so the uploader says nothing useful and this is the real credit. '
                . 'Leave it empty for anything uploaded through the site - there the '
                . 'uploader is the author, and the site never asks for this field.'
            )
            ->hideOnIndex();
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
            ->setFormTypeOptions(
                [
                    // Not `true`: in Vich that means "label the link with the mapping's
                    // originalName", and this mapping has no originalName property, so the
                    // anchor came out empty - a zero-width, invisible link. The stored name
                    // is the one thing we always have.
                    'download_label' => new PropertyPath('file_name'),
                    // Vich would otherwise build /files/download/..., which sits behind the
                    // stateless JWT firewall and answers 401 to a session-authenticated
                    // moderator. admin_document_preview is the same file under /admin.
                    'download_uri' => fn(Document $document): ?string => null === $document->getFileName()
                        ? null
                        : $this->generateUrl(
                            'admin_document_preview',
                            ['filename' => $document->getFileName()]
                        ),
                    'allow_delete' => false,
                ]
            )
            ->hideOnIndex();
        yield TextField::new('file_name', 'File Name')
            ->onlyOnIndex();
        yield TextField::new('file_name', 'Preview')
            ->setTemplatePath('admin/field/file_preview_toggle.html.twig')
            ->onlyOnIndex();
    }

    #[AdminRoute('/approve', name: 'approve')]
    public function approve(
        AdminContext $adminContext,
        EntityManagerInterface $entityManagerInterface,
        AdminUrlGenerator $adminUrlGenerator
    ): RedirectResponse {
        // In EasyAdmin 4.26+, when POSTing to a custom action, the entity might not be in the context
        // We need to retrieve the entity ID from the request and load it manually
        $entityId = $adminContext->getRequest()->query->get('entityId');
        if (!$entityId) {
            throw new LogicException('Entity ID is missing from the request');
        }

        // Load the entity manually
        $document = $entityManagerInterface->getRepository(Document::class)->find($entityId);
        if (!$document instanceof Document) {
            throw new LogicException('Document not found with ID: ' . $entityId);
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

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('name')
            ->add('year')
            ->add(EntityContainsFilter::new('course', Course::class))
            ->add(EntityContainsFilter::new('category', DocumentCategory::class))
            ->add(EntityContainsFilter::new('tags', Tag::class))
            ->add('under_review')
            ->add('anonymous');
    }
}
