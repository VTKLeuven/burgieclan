<?php

namespace App\Controller\Admin;

use App\Entity\Course;
use App\Repository\CourseRepository;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ArrayField;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class CourseCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Course::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield TextField::new('name');
        yield TextField::new('code');
        yield AssociationField::new('modules')
            ->setFormTypeOption('by_reference', false);
        yield ArrayField::new('professors');
        yield ChoiceField::new('semesters')
            ->setChoices(Course::SEMESTERS)
            ->allowMultipleChoices()
            ->renderExpanded()
            ->setTemplatePath('admin/field/semesters.html.twig');
        yield IntegerField::new('credits');
        yield AssociationField::new('oldCourses')
            ->autocomplete()
            ->setFormTypeOption('by_reference', false);
        yield AssociationField::new('newCourses')
            ->autocomplete()
            ->setFormTypeOption('by_reference', false);
    }
}