<?php

namespace App\Controller\Admin;

use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\CommentCategory;
use App\Entity\DocumentCategory;
use App\Entity\Document;
use App\Entity\DocumentComment;
use App\Entity\Post;
use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\UserMenu;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\User\UserInterface;

class DashboardController extends AbstractDashboardController
{
    #[Route('/admin', name: 'admin')]
    public function index(): Response
    {
        $adminUrlGenerator = $this->container->get(AdminUrlGenerator::class);

        return $this->redirect($adminUrlGenerator->setController(PostCrudController::class)->generateUrl());
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('Burgieclan');
    }

    public function configureCrud(): Crud
    {
        return Crud::new()
            ->setDateTimeFormat('medium', 'short');
    }

    public function configureUserMenu(UserInterface $user): UserMenu
    {
        return parent::configureUserMenu($user)
            ->setName($user->getUserIdentifier());
    }

    public function configureMenuItems(): iterable
    {
        yield MenuItem::linktoDashboard('Dashboard', 'fa fa-home');
        yield MenuItem::linkToCrud('Users', 'fa fa-users', User::class);
        yield MenuItem::linkToCrud('Courses', 'fa fa-book', Course::class);
        yield MenuItem::linkToCrud('Blog Posts', 'fa fa-file-text-o', Post::class);
        yield MenuItem::linkToCrud('Comments', 'far fa-comments', CourseComment::class);
        yield MenuItem::linkToCrud('Categories', 'fas fa-tags', CommentCategory::class);
        yield MenuItem::subMenu('Documents', 'fa-solid fa-file')
            ->setSubItems([
            MenuItem::linkToCrud('Categories', 'fa fa-tags', DocumentCategory::class),
            MenuItem::linkToCrud('Documents', 'fa fa-file', Document::class),
            MenuItem::linkToCrud('Comments', 'fa-solid fa-comments', DocumentComment::class)

        ]);

        yield MenuItem::section('Frontend');
        yield MenuItem::linkToUrl('Home', 'fa fa-window-maximize', '/');

        yield MenuItem::section('Resources');
        yield MenuItem::linkToUrl(
            'EasyAdmin Docs',
            'fas fa-book',
            'https://symfony.com/doc/current/bundles/EasyAdminBundle/index.html'
        )->setLinkTarget('_blank');

        yield MenuItem::section('Links');
        yield MenuItem::linkToUrl('Symfony Demo', 'fab fa-symfony', 'https://github.com/symfony/demo')
            ->setLinkTarget('_blank');
        yield MenuItem::linkToUrl(
            'Symfony Cast - Easy Admin',
            'fab fa-symfony',
            'https://symfonycasts.com/screencast/easyadminbundle'
        )
            ->setLinkTarget('_blank');
    }
}
