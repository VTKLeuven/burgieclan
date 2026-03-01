<?php

namespace App\Controller\Admin;

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
        yield MenuItem::linkTo(UserCrudController::class, 'Users', 'fa fa-users')
            ->setPermission(User::ROLE_SUPER_ADMIN);
        yield MenuItem::linkTo(AnnouncementCrudController::class, 'Announcements', "fa-solid fa-bullhorn")
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkTo(ProgramCrudController::class, 'Programs', 'fa fa-briefcase')
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkTo(ModuleCrudController::class, 'Modules', 'fa fa-folder')
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::subMenu('Courses', 'fa-solid fa-book')
            ->setSubItems(
                [
                    MenuItem::linkTo(CourseCrudController::class, 'Courses', 'fa fa-book')
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkTo(CommentCategoryCrudController::class, 'Comment Categories', 'fa fa-tags')
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkTo(CourseCommentCrudController::class, 'Comments', 'fa fa-comments')
                        ->setPermission(User::ROLE_ADMIN)
                ]
            );
        $pendingDocumentsMenu = MenuItem::linkTo(DocumentPendingCrudController::class, 'Pending Documents', 'fa-regular fa-file');
        $documentsMenu = MenuItem::subMenu('Documents', 'fa-solid fa-file')
            ->setSubItems(
                [
                    MenuItem::linkTo(DocumentCrudController::class, 'Documents', 'fa fa-file'),
                    $pendingDocumentsMenu,
                    MenuItem::linkToRoute('Bulk Upload', 'fa fa-upload', 'admin_bulk_upload_index'),
                    MenuItem::linkTo(DocumentCategoryCrudController::class, 'Categories', 'fa fa-tags')
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkTo(DocumentCommentCrudController::class, 'Comments', 'fa-solid fa-comments')
                        ->setPermission(User::ROLE_ADMIN),
                    MenuItem::linkTo(TagCrudController::class, 'Tags', 'fa-solid fa-tags')
                ]
            );
        $amountPending = $this->documentRepository->getAmountPending();
        if ($amountPending > 0) {
            $documentsMenu->setBadge($amountPending, 'danger');
            $pendingDocumentsMenu->setBadge($amountPending, 'danger');
        }
        yield $documentsMenu;
        yield MenuItem::linkTo(PageCrudController::class, 'Pages', 'fa-solid fa-newspaper')
            ->setPermission(User::ROLE_ADMIN);
        yield MenuItem::linkTo(QuickLinkCrudController::class, 'Quick Links', 'fa-solid fa-link')
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
