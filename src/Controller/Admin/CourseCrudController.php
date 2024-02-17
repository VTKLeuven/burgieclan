<?php

namespace App\Controller\Admin;

use App\Entity\Course;
use App\Repository\CourseRepository;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
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
        yield ChoiceField::new('modules')
            ->setChoices(array('Module 1', 'Module 2', 'Module 3'))
            ->allowMultipleChoices()
            ->renderExpanded()
            ->renderAsBadges();
        yield ChoiceField::new('professors')
            ->setChoices(array('Professor 1', 'Professor 2', 'Professor 3'))
            ->allowMultipleChoices()
            ->renderExpanded()
            ->renderAsBadges();
        yield ChoiceField::new('semesters')
            ->setChoices(array('Semester 1', 'Semester 2'))
            ->allowMultipleChoices()
            ->renderExpanded()
            ->renderAsBadges();
        yield TextField::new('code');
        yield ChoiceField::new('old_courses')
            ->setChoices(CourseRepository::class->findAll())
            ->allowMultipleChoices()
            ->renderExpanded()
            ->renderAsBadges();
        yield ChoiceField::new('new_courses')
            ->setChoices(CourseRepository::class->findAll())
            ->allowMultipleChoices()
            ->renderExpanded()
            ->renderAsBadges();
    }
}
