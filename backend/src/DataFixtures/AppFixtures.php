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

use App\Constants\Feature;
use App\Entity\AthensCourse;
use App\Entity\AthensCourseInterest;
use App\Entity\AthensReview;
use App\Entity\Course;
use App\Entity\ExchangeDestination;
use App\Entity\ExchangeProgramSuggestion;
use App\Entity\ExchangeReport;
use App\Entity\FeatureFlag;
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
use App\Service\Exchange\AthensCatalogue;
use App\Service\Exchange\ExchangeDestinationCatalog;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AppFixtures extends Fixture
{
    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ExchangeDestinationCatalog $exchangeDestinations,
        private readonly AthensCatalogue $athensCatalogue,
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
        $this->loadExchange($manager);
        $this->loadAthens($manager);
    }

    /**
     * The exchange destinations, switched on, with one report, one that still waits for review and
     * a programme suggestion, so the pages and the admin have something to show. The old wiki's
     * reports are not here: they hold names and addresses and stay out of the repository
     * (`app:exchange:import-wiki`).
     */
    private function loadExchange(ObjectManager $manager): void
    {
        $this->exchangeDestinations->seed();
        $manager->persist(new FeatureFlag(Feature::EXCHANGE, true));

        $destinations = $manager->getRepository(ExchangeDestination::class);
        $delft = $destinations->findOneBy(['name' => 'TU Delft']);
        $ntnu = $destinations->findOneBy(['name' => 'NTNU']);
        $john = $this->getReference('john_user', User::class);
        $jane = $this->getReference('jane_admin', User::class);
        if (null === $delft || null === $ntnu) {
            return;
        }

        $manager->persist(
            (new ExchangeReport($delft, $john))
                ->setAcademicYear('2024 - 2025')->setPhase('M1')->setPeriod('S2')->setProgram('MSCE')
                ->setContactable(true)
                ->setShowName(true)
                ->setUnderReview(false)
                ->setSections(
                    [
                    'general' => 'Voorbeeldverslag uit de fixtures. Delft is vlakbij, dus je gaat makkelijk eens naar huis.',
                    'housing' => 'Via DUWO, en begin op tijd: de wachtlijst is lang.',
                    ]
                )
                ->setCourses([['name' => 'Transport Policy', 'code' => 'TIL4010', 'equivalent' => 'Mobility Policy', 'text' => 'Veel groepswerk.']])
        );
        $manager->persist(
            (new ExchangeReport($ntnu, $jane))
                ->setAcademicYear('2025 - 2026')->setPhase('M2')->setPeriod('S1')->setProgram('WTK')
                ->setSections(['housing' => 'Via SiT (de studentenhuisvesting) had ik meteen een kamer in Moholt. Vraag op tijd aan, de goedkoopste kamers zijn snel weg.'])
        );
        $manager->persist(
            (new ExchangeProgramSuggestion($ntnu, $john, 'ELT', ExchangeProgramSuggestion::ACTION_ADD))
                ->setNote('Een vriend uit elektrotechniek ging hier vorig jaar naartoe.')
        );

        $manager->flush();
    }

    /**
     * The real ATHENS catalogue (resources/athens/catalogue.json), with two reviews of one course,
     * one still under review, and a few of John's private stars.
     */
    private function loadAthens(ObjectManager $manager): void
    {
        $this->athensCatalogue->import($this->athensCatalogue->read());

        $courses = $manager->getRepository(AthensCourse::class);
        $delft = $courses->findOneBy(['code' => 'TUD24']);
        $madrid = $courses->findOneBy(['code' => 'UPM189']);
        $john = $this->getReference('john_user', User::class);
        $jane = $this->getReference('jane_admin', User::class);
        if (null === $delft || null === $madrid) {
            return;
        }

        $manager->persist(
            (new AthensReview($delft, $jane))
                ->setSession('2025-11')->setProgram('CW')->setRating(4)
                ->setContactable(true)
                ->setUnderReview(false)
                ->setSections(
                    [
                    'course' => 'Voorbeeldreview uit de fixtures. Een week vol hands-on werk met neurale netwerken, goed te volgen met de basis uit de bachelor.',
                    'exam' => 'Een groepsproject dat je op vrijdag voorstelt. Niet moeilijk als je de week meedoet.',
                    'city' => 'Delft is klein en gezellig; de activiteiten van de European Dimension waren een fietstocht en een cantus.',
                    ]
                )
        );
        $manager->persist(
            (new AthensReview($delft, $john))
                ->setSession('2026-03')->setProgram('WTK')->setRating(3)
                ->setSections(['practical' => 'Hostel in Den Haag, 25 minuten met de tram. Rond €300 voor de week.'])
        );
        $manager->persist(new AthensCourseInterest($john, $delft, 5));
        $manager->persist(new AthensCourseInterest($john, $madrid, 3));
        $manager->flush();
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
