<?php

namespace App\Tests\Api;

use App\Entity\Course;
use App\Entity\Exam;
use App\Entity\ExamImage;
use App\Factory\ExamFactory;
use App\Repository\ExamImageRepository;
use App\Service\Exam\ExamImageStore;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use League\Flysystem\FilesystemOperator;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Zenstruck\Browser\KernelBrowser;

/**
 * Images in exam reconstructions: uploading through POST /api/exams/{id}/images, the short-lived
 * links from GET /api/exams/{id}/image-urls, and serving them (locally) through those links.
 */
class ExamImageResourceTest extends ApiTestCase
{
    private static function png(int $width, int $height): string
    {
        $image = imagecreatetruecolor($width, $height);
        imagefill($image, 0, 0, (int) imagecolorallocate($image, 20, 120, 200));
        ob_start();
        imagepng($image);

        return (string) ob_get_clean();
    }

    /**
     * A JPEG whose EXIF says to show it turned a quarter clockwise (orientation 6), the way a
     * phone held upright stores a photo.
     */
    private static function sidewaysJpeg(int $width, int $height): string
    {
        $image = imagecreatetruecolor($width, $height);
        ob_start();
        imagejpeg($image);
        $jpeg = (string) ob_get_clean();

        $tiff = "MM\x00\x2A\x00\x00\x00\x08"    // big-endian TIFF header, first IFD at offset 8
            . "\x00\x01"                          // one entry
            . "\x01\x12\x00\x03\x00\x00\x00\x01\x00\x06\x00\x00" // Orientation, SHORT, 1, 6
            . "\x00\x00\x00\x00";                 // no next IFD
        $payload = "Exif\x00\x00" . $tiff;
        $app1 = "\xFF\xE1" . pack('n', strlen($payload) + 2) . $payload;

        // Right after the start-of-image marker.
        return substr($jpeg, 0, 2) . $app1 . substr($jpeg, 2);
    }

    private static function file(string $bytes, string $name): UploadedFile
    {
        $path = (string) tempnam(sys_get_temp_dir(), 'exam-image-test');
        file_put_contents($path, $bytes);

        return new UploadedFile($path, $name, null, null, true);
    }

    private function upload(Exam $exam, string $bytes, string $name = 'figuur.png', ?KernelBrowser $browser = null): KernelBrowser
    {
        return ($browser ?? $this->browser())->post(
            '/api/exams/' . $exam->getId() . '/images',
            [
                'headers' => ['Authorization' => 'Bearer ' . $this->token],
                'files' => ['file' => self::file($bytes, $name)],
            ]
        );
    }

    private function serve(string $url): KernelBrowser
    {
        // No token: the editor shows images with a plain <img>; the signed link is enough.
        return $this->browser()->get($url);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function links(Exam $exam): array
    {
        return $this->browser()
            ->get('/api/exams/' . $exam->getId() . '/image-urls', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])
            ->assertStatus(200)
            ->assertHeaderContains('Cache-Control', 'no-store')
            ->json()
            ->decoded()['images'];
    }

    public function testUploadingAnImageAndServingIt(): void
    {
        $exam = ExamFactory::createOne();

        $json = $this->upload($exam, self::png(300, 200))
            ->assertStatus(201)
            ->json()
            ->decoded();
        $this->assertMatchesRegularExpression('#^[0-9a-f-]{36}$#', $json['uuid']);
        $this->assertStringStartsWith('/files/exam-images/' . $json['uuid'] . '.png?', $json['url']);
        $this->assertSame([300, 200], [$json['width'], $json['height']]);

        $served = $this->serve($json['url'])
            ->assertStatus(200)
            ->assertHeaderContains('Content-Type', 'image/png')
            ->assertHeaderContains('Cache-Control', 'private')
            ->assertHeaderEquals('X-Content-Type-Options', 'nosniff')
            ->client()
            ->getInternalResponse()
            ->getContent();
        $this->assertSame([300, 200], array_slice((array) getimagesizefromstring($served), 0, 2));
    }

    public function testLargeImagesAreScaledDownAndPhotosStoredUprightWithoutMetadata(): void
    {
        $exam = ExamFactory::createOne();

        $wide = $this->upload($exam, self::png(3000, 1500))->assertStatus(201)->json()->decoded();
        $this->assertSame([2000, 1000], [$wide['width'], $wide['height']]);

        $photo = $this->upload($exam, self::sidewaysJpeg(200, 100), 'foto.jpg')->assertStatus(201)->json()->decoded();
        $this->assertSame([100, 200], [$photo['width'], $photo['height']]);

        $served = $this->serve($photo['url'])->assertStatus(200)->client()->getInternalResponse()->getContent();
        $this->assertStringNotContainsString('Exif', $served);
    }

    public function testOnlyImagesWeAcceptAreStored(): void
    {
        $exam = ExamFactory::createOne();
        $gif = imagecreatetruecolor(10, 10);
        ob_start();
        imagegif($gif);
        $gifBytes = (string) ob_get_clean();

        $this->upload($exam, $gifBytes, 'animatie.gif')->assertStatus(422)->assertJsonMatches('reason', 'type');
        // A name or claimed type proves nothing: the bytes are checked.
        $this->upload($exam, 'gewoon tekst', 'nep.png')->assertStatus(422);
        $this->upload($exam, str_repeat('x', ExamImage::MAX_BYTES + 1), 'groot.png')->assertStatus(413);
        $this->browser()->post(
            '/api/exams/' . $exam->getId() . '/images',
            ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
        )->assertStatus(400);

        $this->assertSame(0, self::getContainer()->get(ExamImageRepository::class)->count([]));
    }

    public function testUploadsNeedAnOpenExamAndALogin(): void
    {
        $locked = ExamFactory::createOne(['editableUntil' => new DateTimeImmutable('-1 day')]);
        $this->upload($locked, self::png(10, 10))->assertStatus(403);

        $this->browser()->post('/api/exams/' . $locked->getId() . '/images')->assertStatus(401);
        $this->browser()->post(
            '/api/exams/999999/images',
            ['headers' => ['Authorization' => 'Bearer ' . $this->token]]
        )->assertStatus(404);
    }

    public function testAReconstructionHoldsALimitedNumberOfImages(): void
    {
        $exam = ExamFactory::createOne();
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        for ($i = 0; $i < ExamImage::MAX_PER_EXAM; $i++) {
            $entityManager->persist(new ExamImage($exam, null, 'image/png', 'png', 1, 1, 1));
        }
        $entityManager->flush();

        $this->upload($exam, self::png(10, 10))->assertStatus(422);
    }

    public function testUploadingIsLimitedPerUser(): void
    {
        $exam = ExamFactory::createOne();
        // One kernel, so the in-memory rate limit adds up (see services.yaml).
        $browser = $this->browser();
        $browser->client()->disableReboot();
        $png = self::png(10, 10);

        for ($i = 0; $i < 30; $i++) {
            $this->upload($exam, $png, 'figuur.png', $browser)->assertStatus(201);
        }
        $response = $this->upload($exam, $png, 'figuur.png', $browser)
            ->assertStatus(429)
            ->client()
            ->getResponse();
        $this->assertGreaterThan(0, (int) $response->headers->get('Retry-After'));
    }

    public function testImagesAreOnlyReachableThroughASignedLink(): void
    {
        $exam = ExamFactory::createOne();
        $uploaded = $this->upload($exam, self::png(10, 10))->assertStatus(201)->json()->decoded();

        $links = $this->links($exam);
        $this->assertSame([$uploaded['uuid']], array_keys($links));
        $this->assertSame([10, 10], [$links[$uploaded['uuid']]['width'], $links[$uploaded['uuid']]['height']]);
        $this->serve($links[$uploaded['uuid']]['url'])->assertStatus(200);

        // Without the signature, or with a tampered one, there is nothing to see.
        $path = (string) parse_url($uploaded['url'], PHP_URL_PATH);
        $this->serve($path)->assertStatus(403);
        $this->serve(str_replace('_hash=', '_hash=x', $uploaded['url']))->assertStatus(403);
        // The links themselves need a login.
        $this->browser()->get('/api/exams/' . $exam->getId() . '/image-urls')->assertStatus(401);
        $this->browser()
            ->get('/api/exams/999999/image-urls', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])
            ->assertStatus(404);
    }

    public function testAnExamWithoutImagesHasAnEmptyListOfLinks(): void
    {
        $exam = ExamFactory::createOne();

        $this->browser()
            ->get('/api/exams/' . $exam->getId() . '/image-urls', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])
            ->assertStatus(200)
            ->assertContains('"images":{}');
    }

    public function testARemovedImageIsGone(): void
    {
        $exam = ExamFactory::createOne();
        $uploaded = $this->upload($exam, self::png(10, 10))->assertStatus(201)->json()->decoded();

        $image = self::getContainer()->get(ExamImageRepository::class)->findOneByUuid($uploaded['uuid']);
        $this->assertInstanceOf(ExamImage::class, $image);
        self::getContainer()->get(ExamImageStore::class)->remove($image);
        self::getContainer()->get(EntityManagerInterface::class)->flush();

        $this->assertSame([$uploaded['uuid'] => ['removed' => true]], $this->links($exam));
        // A link handed out before the removal no longer works either.
        $this->serve($uploaded['url'])->assertStatus(404);
    }

    public function testDeletingACourseDeletesTheImageFilesOfItsExams(): void
    {
        $exam = ExamFactory::createOne();
        $uploaded = $this->upload($exam, self::png(10, 10))->assertStatus(201)->json()->decoded();
        $storage = self::getContainer()->get('exam_images.storage');
        $this->assertInstanceOf(FilesystemOperator::class, $storage);
        $fileName = $uploaded['uuid'] . '.png';
        $this->assertTrue($storage->fileExists($fileName));

        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $entityManager->remove($entityManager->find(Course::class, $exam->getCourse()->getId()));
        $entityManager->flush();

        $this->assertFalse($storage->fileExists($fileName));
    }
}
