<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\DataFixtures;

use App\Entity\User;
use App\Factory\AnnouncementFactory;
use App\Factory\CommentCategoryFactory;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentCommentFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\PageFactory;
use App\Factory\ProgramFactory;
use App\Factory\QuickLinkFactory;
use App\Factory\TagFactory;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AppFixtures extends Fixture
{
    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        $this->loadUsers($manager);

        ProgramFactory::createMany(10);
        ModuleFactory::createMany(30);
        CourseFactory::createMany(80);
        AnnouncementFactory::createMany(10);
        CommentCategoryFactory::createMany(5);
        CourseCommentFactory::createMany(100);
        DocumentCategoryFactory::createMany(5);
        TagFactory::createMany(20);
        DocumentFactory::createMany(100);
        DocumentCommentFactory::createMany(400);
        PageFactory::createMany(20);
        QuickLinkFactory::createMany(10);
    }

    private function loadUsers(ObjectManager $manager): void
    {
        foreach ($this->getUserData() as [$fullname, $username, $password, $email, $roles]) {
            $user = new User();
            $user->setFullName($fullname);
            $user->setUsername($username);
            $user->setPassword($this->passwordHasher->hashPassword($user, $password));
            $user->setEmail($email);
            $user->setRoles($roles);

            $manager->persist($user);
            $this->addReference($username, $user);
        }

        $manager->flush();
    }

    /**
     * @return array<array{string, string, string, string, array<string>}>
     */
    private function getUserData(): array
    {
        return [
            // $userData = [$fullname, $username, $password, $email, $roles];
            ['Jane Doe', 'jane_admin', 'kitten', 'jane_admin@symfony.com', [User::ROLE_SUPER_ADMIN]],
            ['Tom Doe', 'tom_admin', 'kitten', 'tom_admin@symfony.com', [User::ROLE_ADMIN]],
            ['John Doe', 'john_user', 'kitten', 'john_user@symfony.com', [User::ROLE_USER]],
        ];
    }
}
