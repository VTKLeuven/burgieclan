<?php

namespace App\Controller\Admin;

use App\Entity\Course;
use App\Repository\CourseRepository;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
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
        yield ChoiceField::new('modules')
            ->setChoices(array('Module 1', 'Module 2', 'Module 3'))
            ->allowMultipleChoices();   // TODO: change to autocomplete with module association
        yield ChoiceField::new('professors')
            ->setChoices(array('Professor 1', 'Professor 2', 'Professor 3'))
            ->allowMultipleChoices();   // TODO: change to list autocomplete with all professors
        yield ChoiceField::new('semesters')
            ->setChoices(Course::SEMESTERS)
            ->allowMultipleChoices()
            ->renderExpanded()
            ->setTemplatePath('admin/field/semesters.html.twig');
        yield IntegerField::new('credits');
        yield AssociationField::new('old_courses')
            ->autocomplete()
            ->setFormTypeOption('by_reference', false);
        yield AssociationField::new('new_courses')
            ->autocomplete()
            ->setFormTypeOption('by_reference', false);
        yield AssociationField::new('courseComments')
            ->hideOnForm();
    }
}
