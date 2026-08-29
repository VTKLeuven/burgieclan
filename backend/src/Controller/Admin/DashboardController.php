<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\DocumentRepository;
use App\Repository\FaqQuestionRepository;
use App\Repository\LegacySiteClickRepository;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminDashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\Option\ColorScheme;
use EasyCorp\Bundle\EasyAdminBundle\Config\UserMenu;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\User\UserInterface;

#[AdminDashboard(routePath: '/admin', routeName: 'admin')]
class DashboardController extends AbstractDashboardController
{
    public function __construct(
        private readonly DocumentRepository $documentRepository,
        private readonly FaqQuestionRepository $faqQuestionRepository,
        private readonly LegacySiteClickRepository $legacySiteClickRepository,
    ) {}

    public function index(): Response
    {
        return $this->redirectToRoute('admin_document_pending_index');
    }

    public function configureDashboard(): Dashboard
    {
        // admin-assets is not proxied to the frontend, so it is accessible.
        // The logo is sized by .bc-dashboard-logo in admin.css, not by a style="" attribute:
        // EasyAdmin nonces style-src, which blocks inline style attributes outright.
        return Dashboard::new()
            ->setTitle('<img src="/admin-assets/images/logo.png" alt="Icon" class="bc-dashboard-logo"> Burgieclan')
            // Follow the OS preference by default; users can switch light/dark from the user menu.
            ->setDefaultColorScheme(ColorScheme::AUTO);
    }

    public function configureAssets(): Assets
    {
        // Styles the custom admin templates rely on. Served straight from public/ rather
        // than through Encore, whose entrypoint the admin does not load. @see admin.css
        return parent::configureAssets()
            ->addCssFile('/admin-assets/css/admin.css');
    }

    public function configureCrud(): Crud
    {
        return Crud::new()
            ->setDateTimeFormat('medium', 'short')
            // Override EasyAdmin's Vich file/image widgets to use CSP-safe
            // nonce'd script tags instead of inline onchange handlers.
            ->addFormTheme('form/easyadmin_vich_csp.html.twig');
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
        yield MenuItem::linkTo(LegacySiteClickCrudController::class, 'Old Burgieclan usage', 'fa-solid fa-chart-column')
            ->setPermission(User::ROLE_ADMIN)
            ->setBadge($this->legacySiteClickRepository->count([]), 'info');
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
        $pendingDocumentsMenu = MenuItem::linkTo(
            DocumentPendingCrudController::class,
            'Pending Documents',
            'fa-regular fa-file'
        );
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
        $faqQuestionsMenu = MenuItem::linkTo(FaqQuestionCrudController::class, 'FAQ Questions', 'fa-solid fa-inbox')
            ->setPermission(User::ROLE_ADMIN);
        $faqMenu = MenuItem::subMenu('FAQ', 'fa-solid fa-circle-question')
            ->setPermission(User::ROLE_ADMIN)
            ->setSubItems(
                [
                    MenuItem::linkTo(FaqItemCrudController::class, 'FAQ Items', 'fa-solid fa-circle-question')
                        ->setPermission(User::ROLE_ADMIN),
                    $faqQuestionsMenu,
                ]
            );
        // Badged on both, like Documents above: the parent is collapsed by default, so a badge only
        // on the child would go unseen.
        $amountNewQuestions = $this->faqQuestionRepository->getAmountNew();
        if ($amountNewQuestions > 0) {
            $faqMenu->setBadge($amountNewQuestions, 'danger');
            $faqQuestionsMenu->setBadge($amountNewQuestions, 'danger');
        }
        yield $faqMenu;

        yield MenuItem::section('Frontend');
        // Was '/', which only worked because nginx puts both apps on one origin in production
        // (@see .docker/nginx.conf) — locally the backend and frontend are separate ports, so '/'
        // hit the backend's own root. The configured URL resolves to the same place in production.
        yield MenuItem::linkToUrl('Home', 'fa fa-window-maximize', $this->getParameter('app.frontend_url'));

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
