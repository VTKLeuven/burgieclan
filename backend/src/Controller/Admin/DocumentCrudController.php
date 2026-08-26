<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\Tag;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\PropertyAccess\PropertyPath;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Vich\UploaderBundle\Form\Type\VichFileType;

#[IsGranted(User::ROLE_MODERATOR)]
class DocumentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Document::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        // Inherited by DocumentPendingCrudController, so both the regular and the
        // pending document edit pages get the inline preview panel.
        return $crud
            ->overrideTemplate('crud/edit', 'admin/document_edit_with_preview.html.twig');
    }

    public function createEntity(string $entityFqcn): Document
    {
        $user = $this->getUser();
        assert($user instanceof User);
        $document = new Document($user);
        $document->setUnderReview(false); // Default is false
        $document->setAnonymous(true); // Default is true
        return $document;
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');
        yield DateTimeField::new('createdAt')
            ->hideOnForm();
        yield DateTimeField::new('updatedAt')
            ->hideOnForm();
        yield AssociationField::new('course')
            ->autocomplete();
        yield AssociationField::new('category')
            ->autocomplete();
        $instance = $this->getContext()->getEntity()->getInstance();
        $firstYear = $instance ? $instance->getYear() : null;
        yield ChoiceField::new('year')
            ->setChoices(Document::getAcademicYearChoices(amountOfYears: 50, firstYear: $firstYear))
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
            ->renderAsSwitch(false);
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
