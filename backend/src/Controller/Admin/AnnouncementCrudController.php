<?php

namespace App\Controller\Admin;

use App\Entity\Announcement;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class AnnouncementCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Announcement::class;
    }

    public function createEntity(string $entityFqcn): Announcement
    {
        $user = $this->getUser();
        assert($user instanceof User);
        return new Announcement($user);
    }

    public function configureFields(string $pageName): iterable
    {
        yield BooleanField::new('priority')
            ->renderAsSwitch(false)
            ->setLabel('Priority');

        yield TextField::new('title_nl')
            ->setRequired(true)
            ->setLabel('Title (Dutch)');
        yield TextEditorField::new('content_nl')
            ->setLabel('Content (Dutch)')
            ->setTemplatePath('admin/text_editor.html.twig');

        yield DateTimeField::new('startTime');
        yield DateTimeField::new('endTime');

        yield FormField::addPanel('English Content')->setIcon('fa fa-language')
            ->collapsible();
        yield TextField::new('title_en')
            ->setLabel('Title (English)');
        yield TextEditorField::new('content_en')
            ->setLabel('Content (English)')
            ->setTemplatePath('admin/text_editor.html.twig');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('title_nl')
            ->add('content_nl')
            ->add('title_en')
            ->add('content_en')
            ->add('startTime')
            ->add('endTime');
    }
}
