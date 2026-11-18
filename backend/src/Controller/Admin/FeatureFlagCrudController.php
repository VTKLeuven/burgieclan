<?php

namespace App\Controller\Admin;

use App\Entity\FeatureFlag;
use App\Entity\User;
use App\Service\Feature\FeatureFlags;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\KeyValueStore;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The feature switches (App\Constants\Feature). The list always shows every feature the code
 * knows; flip the switch in the list to turn one on or off for the whole site.
 */
#[IsGranted(User::ROLE_ADMIN)]
class FeatureFlagCrudController extends AbstractCrudController
{
    public function __construct(private readonly FeatureFlags $flags) {}

    public static function getEntityFqcn(): string
    {
        return FeatureFlag::class;
    }

    public function index(AdminContext $context): KeyValueStore|Response
    {
        $this->flags->ensureRows();

        return parent::index($context);
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Feature')
            ->setEntityLabelInPlural('Features')
            ->setPageTitle(Crud::PAGE_INDEX, 'Features')
            ->setHelp(Crud::PAGE_INDEX, 'Switch parts of the site on or off for everyone. A new feature starts off.')
            ->setDefaultSort(['name' => 'ASC'])
            ->setSearchFields(null);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions->disable(Action::NEW, Action::DELETE, Action::BATCH_DELETE);
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('label', 'Feature')->hideOnForm();
        yield TextField::new('description')->setMaxLength(1024)->hideOnForm();
        yield BooleanField::new('enabled', 'On')->renderAsSwitch();
        yield DateTimeField::new('updatedAt', 'Last changed')->hideOnForm();
    }
}
