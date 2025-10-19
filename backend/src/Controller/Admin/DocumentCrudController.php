<?php

namespace App\Controller\Admin;

use App\Controller\Admin\Filter\EntityContainsFilter;
use App\Entity\Course;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\Tag;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Vich\UploaderBundle\Form\Type\VichFileType;

#[IsGranted(User::ROLE_MODERATOR)]
class DocumentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Document::class;
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
        yield DateTimeField::new('createDate')
            ->hideOnForm();
        yield DateTimeField::new('updateDate')
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
            ->setFormTypeOptions([
                'download_label' => true,
                'allow_delete' => false,
            ])
            ->hideOnIndex();
        yield TextField::new('file_name')
            ->onlyOnIndex();
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('name')
            ->add('year')
            ->add(EntityContainsFilter::new('course', Course::class))
            ->add(EntityContainsFilter::new('category', DocumentCategory::class))
            ->add(EntityContainsFilter::new('tags', Tag ::class))
            ->add('under_review')
            ->add('anonymous');
    }
}
