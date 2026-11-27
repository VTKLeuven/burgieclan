<?php

namespace App\Tests\Api;

use App\Entity\User;
use App\Entity\CommentCategory;
use App\Factory\CommentCategoryFactory;
use App\Factory\CourseCommentFactory;
use App\Factory\CourseFactory;
use App\Factory\CourseRatingFactory;
use App\Factory\DocumentFactory;
use App\Factory\UserFactory;
use App\Service\VtkService\VtkServiceSignature;
use Doctrine\ORM\EntityManagerInterface;
use Zenstruck\Browser\KernelBrowser;

/**
 * Burgieclan in the VTK app (VtkAppController): vtk.be speaking for a member with a signed
 * header, on the courses, documents and favourite courses.
 */
class VtkAppTest extends ApiTestCase
{
    private const IDENTITY = ['sub' => 'vtk-app-user', 'email' => 'r0777777@student.kuleuven.be', 'name' => 'Grace Hopper'];

    /**
     * @param array<string, mixed> $identity
     *
     * @return array<string, mixed>
     */
    private function asVtk(KernelBrowser $browser, string $method, string $path, int $status = 200, array $identity = self::IDENTITY): array
    {
        $user = rtrim(strtr(base64_encode((string) json_encode($identity)), '+/', '-_'), '=');
        $timestamp = time();
        // The query string is not signed: Symfony's path info leaves it out, and so does vtk.be.
        $signed = (string) parse_url($path, PHP_URL_PATH);
        $signature = self::getContainer()->get(VtkServiceSignature::class)->sign($method, $signed, $timestamp, $user, '');
        $browser->request(
            $method,
            $path,
            ['headers' => [
            VtkServiceSignature::HEADER_USER => $user,
            VtkServiceSignature::HEADER_TIMESTAMP => (string) $timestamp,
            VtkServiceSignature::HEADER_SIGNATURE => $signature,
            ]]
        )->assertStatus($status);
        $content = $browser->content();

        return '' === $content ? [] : (json_decode($content, true) ?? []);
    }

    private function member(): User
    {
        return self::getContainer()->get(EntityManagerInterface::class)
            ->getRepository(User::class)->findOneBy(['fluxusSub' => self::IDENTITY['sub']]);
    }

    public function testFavouritesRoundTrip(): void
    {
        $browser = $this->browser();
        $course = CourseFactory::createOne(['code' => 'H01A2B', 'name' => 'Analyse, deel 2']);

        $this->assertSame([], $this->asVtk($browser, 'GET', '/api/vtk_app/courses')['courses']);

        $added = $this->asVtk($browser, 'PUT', '/api/vtk_app/courses/' . $course->getId() . '/favorite');
        $this->assertTrue($added['course']['favorite']);

        $list = $this->asVtk($browser, 'GET', '/api/vtk_app/courses')['courses'];
        $this->assertCount(1, $list);
        $this->assertSame('H01A2B', $list[0]['code']);

        $this->asVtk($browser, 'DELETE', '/api/vtk_app/courses/' . $course->getId() . '/favorite');
        $this->assertSame([], $this->asVtk($browser, 'GET', '/api/vtk_app/courses')['courses']);
    }

    public function testCourseTitleIsInItsOwnLanguageWhateverTheReader(): void
    {
        $browser = $this->browser();
        CourseFactory::createOne([
            'code' => 'H04I4A',
            'name' => 'Distributed Systems',
            'nameEn' => 'Distributed Systems',
            'nameNl' => 'Gedistribueerde systemen',
            'language' => 'en',
        ]);

        foreach (['nl', 'en'] as $lang) {
            $found = $this->asVtk($browser, 'GET', '/api/vtk_app/courses/search?q=distributed&lang=' . $lang)['courses'];
            $this->assertSame(['Distributed Systems'], array_column($found, 'name'), $lang);
        }
    }

    public function testSearchNeedsTwoCharacters(): void
    {
        $browser = $this->browser();
        CourseFactory::createOne(['code' => 'H0S07A', 'name' => 'Thermische systemen']);

        $this->assertSame([], $this->asVtk($browser, 'GET', '/api/vtk_app/courses/search?q=t')['courses']);
        $found = $this->asVtk($browser, 'GET', '/api/vtk_app/courses/search?q=thermisch')['courses'];
        $this->assertSame(['H0S07A'], array_column($found, 'code'));
    }

    public function testCourseShowsApprovedDocumentsAndOnlyYourOwnUnderReview(): void
    {
        $browser = $this->browser();
        // The member exists once the first signed request created it.
        $this->asVtk($browser, 'GET', '/api/vtk_app/courses');
        $me = $this->member();
        $someone = UserFactory::createOne();
        $course = CourseFactory::createOne();

        DocumentFactory::createOne(['course' => $course, 'name' => 'Samenvatting', 'under_review' => false, 'creator' => $someone]);
        DocumentFactory::createOne(['course' => $course, 'name' => 'Van iemand anders', 'under_review' => true, 'creator' => $someone]);
        DocumentFactory::createOne(['course' => $course, 'name' => 'Van mij', 'under_review' => true, 'creator' => $me]);

        $detail = $this->asVtk($browser, 'GET', '/api/vtk_app/courses/' . $course->getId());
        $names = array_column($detail['documents'], 'name');
        sort($names);
        $this->assertSame(['Samenvatting', 'Van mij'], $names);
        $this->assertSame(1, $detail['course']['documentCount']);
    }

    public function testFileOfSomeoneElsesDocumentUnderReviewIsNotFound(): void
    {
        $browser = $this->browser();
        $document = DocumentFactory::createOne(['under_review' => true, 'creator' => UserFactory::createOne()]);

        $this->asVtk($browser, 'GET', '/api/vtk_app/documents/' . $document->getId() . '/file-url', 404);
    }

    public function testUnknownCourseIsNotFound(): void
    {
        $this->asVtk($this->browser(), 'GET', '/api/vtk_app/courses/999999', 404);
    }

    public function testRestOfTheApiStaysClosed(): void
    {
        $browser = $this->browser();
        $this->asVtk($browser, 'GET', '/api/courses', 401);
        $this->asVtk($browser, 'GET', '/api/documents', 401);
    }

    public function testCourseShowsItsEvaluations(): void
    {
        $browser = $this->browser();
        $course = CourseFactory::createOne();
        $rated = CommentCategoryFactory::createOne(['name_nl' => 'Algemeen', 'type' => CommentCategory::TYPE_RATED]);
        $discussion = CommentCategoryFactory::createOne(['name_nl' => 'Tips', 'type' => CommentCategory::TYPE_DISCUSSION]);
        CommentCategoryFactory::createOne(['name_nl' => 'Leeg', 'type' => CommentCategory::TYPE_DISCUSSION]);
        foreach ([4, 5, 3] as $value) {
            CourseRatingFactory::createOne(['course' => $course, 'category' => $rated, 'value' => $value, 'creator' => UserFactory::createOne()]);
        }
        CourseCommentFactory::createOne(['course' => $course, 'category' => $discussion, 'content' => 'Maak de oefeningen', 'anonymous' => true]);

        $evaluations = $this->asVtk($browser, 'GET', '/api/vtk_app/courses/' . $course->getId())['evaluations'];
        $byName = array_column($evaluations['sections'], null, 'name');

        $this->assertArrayNotHasKey('Leeg', $byName);
        $this->assertTrue($byName['Algemeen']['rated']);
        $this->assertSame(3, $byName['Algemeen']['allTime']['count']);
        $this->assertEqualsWithDelta(4.0, $byName['Algemeen']['allTime']['average'], 0.01);
        $this->assertSame('Maak de oefeningen', $byName['Tips']['comments'][0]['content']);
        $this->assertNull($byName['Tips']['comments'][0]['author']);
    }
}
