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

use App\Entity\Course;
use App\Entity\FaqQuestion;
use App\Entity\User;
use App\Factory\AnnouncementFactory;
use App\Factory\CommentCategoryFactory;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseCommentVoteFactory;
use App\Factory\CourseFactory;
use App\Factory\DocumentCategoryFactory;
use App\Factory\DocumentCommentFactory;
use App\Factory\DocumentCommentVoteFactory;
use App\Factory\DocumentFactory;
use App\Factory\DocumentVoteFactory;
use App\Factory\FaqItemFactory;
use App\Factory\FaqQuestionFactory;
use App\Factory\ModuleFactory;
use App\Factory\PageFactory;
use App\Factory\ProgramFactory;
use App\Factory\QuickLinkFactory;
use App\Factory\TagFactory;
use App\Factory\UserDocumentViewFactory;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AppFixtures extends Fixture
{
    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {}

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
        FaqItemFactory::createMany(8);
        // A spread of statuses so the admin inbox shows both a populated badge and rows that have
        // already been dealt with — the "new" ones are the ones with Promote/Mark handled buttons.
        FaqQuestionFactory::createMany(6);
        FaqQuestionFactory::createMany(3, ['status' => FaqQuestion::STATUS_HANDLED]);
        FaqQuestionFactory::createMany(2, ['status' => FaqQuestion::STATUS_ARCHIVED]);
        // Create unique UserDocumentView combinations to avoid violating unique constraint
        $uniqueUserDocumentViews = UserDocumentViewFactory::createUniqueSequence(100);
        UserDocumentViewFactory::createSequence($uniqueUserDocumentViews);

        // Create unique vote combinations to avoid violating unique constraints
        $uniqueDocumentVotes = DocumentVoteFactory::createUniqueSequence(100);
        DocumentVoteFactory::createSequence($uniqueDocumentVotes);

        $uniqueDocumentCommentVotes = DocumentCommentVoteFactory::createUniqueSequence(100);
        DocumentCommentVoteFactory::createSequence($uniqueDocumentCommentVotes);

        $uniqueCourseCommentVotes = CourseCommentVoteFactory::createUniqueSequence(100);
        CourseCommentVoteFactory::createSequence($uniqueCourseCommentVotes);

        $this->linkRelatedCourses($manager);
    }

    /**
     * Wires a few predecessor/successor and equivalence links between courses.
     *
     * Curriculum reforms rename, split and merge courses, and the course page renders those
     * links as badges. Without a seeded example the feature is invisible locally, so the
     * first handful of courses are chained into the three shapes it has to handle: a plain
     * rename, a merge of two predecessors into one successor, and an equivalence pair.
     */
    private function linkRelatedCourses(ObjectManager $manager): void
    {
        $courses = $manager->getRepository(Course::class)->findBy([], ['id' => 'ASC'], 6);
        if (count($courses) < 6) {
            return;
        }

        [$renamed, $predecessor, $merged, $firstMergedFrom, $secondMergedFrom, $equivalent] = $courses;

        // Plain rename: one predecessor, one successor.
        $renamed->addOldCourse($predecessor);

        // Merge: two former courses now taught as one.
        $merged->addOldCourse($firstMergedFrom);
        $merged->addOldCourse($secondMergedFrom);

        // Equivalence: same subject under another faculty's code. addIdenticalCourse()
        // writes both sides itself, so one call is enough.
        $merged->addIdenticalCourse($equivalent);

        $manager->flush();
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
