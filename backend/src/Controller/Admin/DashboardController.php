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
use App\Entity\QuickLink;
use App\Entity\Tag;
use App\Entity\User;
use App\Repository\DocumentRepository;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminDashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\UserMenu;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\User\UserInterface;

#[AdminDashboard(routePath: '/admin', routeName: 'admin')]
class DashboardController extends AbstractDashboardController
{
    public function __construct(private readonly DocumentRepository $documentRepository)
    {
    }

    public function index(): Response
    {
        return $this->redirectToRoute('admin_document_pending_index');
    }

    public function configureDashboard(): Dashboard
    {
        // admin-assets is not proxied to the frontend, so it is accessible
        return Dashboard::new()
            ->setTitle('<img src="/admin-assets/images/logo.png" alt="Icon" style="height: 20px; margin-right: 10px;"> Burgieclan');
        //TODO add Burgieclan logo here
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
        yield MenuItem::linkToCrud('Announcements', "fa-solid fa-bullhorn", Announcement::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkToCrud('Programs', 'fa fa-briefcase', Program::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkToCrud('Modules', 'fa fa-folder', Module::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::subMenu('Courses', 'fa-solid fa-book')
            ->setSubItems(
                [
                    MenuItem::linkToCrud('Courses', 'fa fa-book', Course::class)
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkToCrud('Comment Categories', 'fa fa-tags', CommentCategory::class)
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkToCrud('Comments', 'fa fa-comments', CourseComment::class)
                        ->setPermission(User::ROLE_ADMIN)
                ]
            );
        $pendingDocumentsMenu = MenuItem::linkToCrud('Pending Documents', 'fa-regular fa-file', Document::class)
            ->setController(DocumentPendingCrudController::class);
        $documentsMenu = MenuItem::subMenu('Documents', 'fa-solid fa-file')
            ->setSubItems(
                [
                    MenuItem::linkToCrud('Documents', 'fa fa-file', Document::class)
                        ->setController(DocumentCrudController::class),
                    $pendingDocumentsMenu,
                    MenuItem::linkToRoute('Bulk Upload', 'fa fa-upload', 'admin_bulk_upload_index'),
                    MenuItem::linkToCrud('Categories', 'fa fa-tags', DocumentCategory::class)
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkToCrud('Comments', 'fa-solid fa-comments', DocumentComment::class)
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkToCrud('Tags', 'fa-solid fa-tags', Tag::class)
                ]
            );
        $amountPending = $this->documentRepository->getAmountPending();
        if ($amountPending > 0) {
            $documentsMenu->setBadge($amountPending, 'danger');
            $pendingDocumentsMenu->setBadge($amountPending, 'danger');
        }
        yield $documentsMenu;
        yield MenuItem::linkToCrud('Pages', 'fa-solid fa-newspaper', Page::class)
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkToCrud('Quick Links', 'fa-solid fa-link', QuickLink::class)
            ->setPermission(User::ROLE_ADMIN);

        yield MenuItem::section('Frontend');
        yield MenuItem::linkToUrl('Home', 'fa fa-window-maximize', '/');

        $commitHash = getenv('COMMIT_HASH') ?: 'dev';
        $version = getenv('VERSION') ?: '';
        // Display version if available
        if ($version) {
            yield MenuItem::section('Version: ' . $version, 'fa fa-tag')
                ->setCssClass('text-muted small');
        }
        // Display commit hash
        yield MenuItem::section('Commit: ' . substr($commitHash, 0, 7), 'fa fa-code-commit')
            ->setCssClass('text-muted small');
    }
}
