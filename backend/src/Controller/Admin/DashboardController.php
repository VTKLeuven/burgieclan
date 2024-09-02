<?php

namespace App\Controller\Admin;

use App\Entity\Announcement;
use App\Entity\CommentCategory;
use App\Entity\Course;
use App\Entity\CourseComment;
use App\Entity\Document;
use App\Entity\DocumentCategory;
use App\Entity\DocumentComment;
use App\Entity\Module;
use App\Entity\Page;
use App\Entity\Program;
use App\Entity\User;
use App\Repository\DocumentRepository;
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
    public function __construct(private readonly DocumentRepository $documentRepository)
    {
    }

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
        yield MenuItem::linkToCrud('Users', 'fa fa-users', User::class)
            ->setPermission(User::ROLE_SUPER_ADMIN);

        yield MenuItem::linkToCrud('Announcement', "fa-solid fa-bullhorn", Announcement::class)
            ->setPermission(User::ROLE_ADMIN);

        yield MenuItem::linkToCrud('Programs', 'fa fa-briefcase', Program::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkToCrud('Modules', 'fa fa-folder', Module::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkToCrud('Courses', 'fa fa-book', Course::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkToCrud('Comments', 'far fa-comments', CourseComment::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkToCrud('Categories', 'fas fa-tags', CommentCategory::class)
            ->setPermission(User::ROLE_ADMIN);
        $pendingDocumentsMenu = MenuItem::linkToCrud('Pending Documents', 'fa-regular fa-file', Document::class)
            ->setController(DocumentPendingCrudController::class);
        $documentsMenu = MenuItem::subMenu('Documents', 'fa-solid fa-file')
            ->setSubItems([
                MenuItem::linkToCrud('Categories', 'fa fa-tags', DocumentCategory::class)
                    ->setPermission(User::ROLE_ADMIN),
                MenuItem::linkToCrud('Comments', 'fa-solid fa-comments', DocumentComment::class)
                    ->setPermission(User::ROLE_ADMIN),
                MenuItem::linkToCrud('Documents', 'fa fa-file', Document::class)
                    ->setController(DocumentCrudController::class),
                $pendingDocumentsMenu
            ]);
        $amountPending = $this->documentRepository->getAmountPending();
        if ($amountPending > 0) {
            $documentsMenu->setBadge($amountPending, 'danger');
            $pendingDocumentsMenu->setBadge($amountPending, 'danger');
        }
        yield $documentsMenu;

        yield MenuItem::linkToCrud('Pages', 'fa-solid fa-newspaper', Page::Class)
            ->setPermission(User::ROLE_ADMIN);

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
