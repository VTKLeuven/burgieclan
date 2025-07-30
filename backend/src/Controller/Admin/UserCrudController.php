<?php

namespace App\Controller\Admin;

use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AvatarField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_SUPER_ADMIN)]
class UserCrudController extends AbstractCrudController
{
    public function __construct(
        private UserPasswordHasherInterface $passwordHasher
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return User::class;
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnDetail();
        yield AvatarField::new('email')->setIsGravatarEmail()->hideOnForm();
        yield TextField::new('fullName');
        yield TextField::new('username');
        yield EmailField::new('email');

        // Show password field on new and edit pages
        if (in_array($pageName, [Crud::PAGE_NEW, Crud::PAGE_EDIT])) {
            yield TextField::new('plainPassword')
                ->setFormType(PasswordType::class)
                ->setRequired($pageName === Crud::PAGE_NEW)
                ->setLabel($pageName === Crud::PAGE_NEW ? 'Password' : 'New Password (leave empty to keep current)');
        }

        yield ChoiceField::new('roles')
            ->setChoices(array_combine(User::getAvailableRoles(), User::getAvailableRoles()))
            ->allowMultipleChoices()
            ->renderExpanded()
            ->renderAsBadges();
        yield AssociationField::new('favoritePrograms')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Programs');
        yield AssociationField::new('favoriteModules')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Modules');
        yield AssociationField::new('favoriteCourses')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Courses');
        yield AssociationField::new('favoriteDocuments')
            ->setFormTypeOptions(['by_reference' => false])
            ->autocomplete()
            ->setLabel('Favorite Documents');
    }

    public function createEntity(string $entityFqcn)
    {
        $user = new User();
        // Set a temporary password that will be replaced by the form submission
        $user->setPassword('temp');
        return $user;
    }

    public function persistEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        /** @var User $user */
        $user = $entityInstance;
        if (!$user->getPlainPassword()) {
            throw new \RuntimeException('Password is required for new users');
        }
        $this->hashPassword($user);
        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        $this->hashPassword($entityInstance);
        parent::updateEntity($entityManager, $entityInstance);
    }

    private function hashPassword(User $user): void
    {
        if ($plainPassword = $user->getPlainPassword()) {
            $hashedPassword = $this->passwordHasher->hashPassword($user, $plainPassword);
            $user->setPassword($hashedPassword);
            $user->eraseCredentials();
        }
    }
}
