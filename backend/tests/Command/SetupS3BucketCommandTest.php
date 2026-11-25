<?php

namespace App\Tests\Command;

use App\Command\SetupS3BucketCommand;
use Aws\CommandInterface;
use Aws\MockHandler;
use Aws\Result;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;
use GuzzleHttp\Psr7\Response;
use League\Flysystem\FilesystemOperator;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

/**
 * The CORS part of app:s3:setup-bucket against a scripted S3 client: every deploy runs it, so it
 * must not write when nothing changes, and must say why when a write fails.
 */
class SetupS3BucketCommandTest extends TestCase
{
    private const ORIGIN = 'https://dev.burgieclan.vtk.be';

    /** @var list<string> */
    private array $calls = [];

    private function rule(string ...$origins): array
    {
        return [
            'ID' => 'burgieclan-frontend',
            'AllowedOrigins' => $origins,
            // The store may hand the lists back in another order.
            'AllowedMethods' => ['HEAD', 'GET'],
            'AllowedHeaders' => ['*'],
            'ExposeHeaders' => ['Content-Range', 'Accept-Ranges', 'Content-Type', 'Content-Length', 'Content-Disposition'],
            'MaxAgeSeconds' => 3600,
        ];
    }

    /**
     * @param array<string, Result|callable(CommandInterface): S3Exception> $answers by operation name
     */
    private function runCommand(array $answers): CommandTester
    {
        $mock = new MockHandler();
        $handler = function (CommandInterface $command, $request) use ($answers, $mock) {
            $this->calls[] = $command->getName();
            $answer = $answers[$command->getName()] ?? new Result([]);
            $mock->append(is_callable($answer) ? $answer($command) : $answer);

            return $mock($command, $request);
        };
        $client = new S3Client(
            [
            'region' => 'us-east-1',
            'version' => 'latest',
            'credentials' => ['key' => 'k', 'secret' => 's'],
            'handler' => $handler,
            ]
        );
        $command = new SetupS3BucketCommand(
            $client,
            $this->createStub(FilesystemOperator::class),
            $this->createStub(FilesystemOperator::class),
            'burgieclan-test',
            self::ORIGIN . '/',
            'test',
        );
        $tester = new CommandTester($command);
        $tester->execute([]);

        return $tester;
    }

    private static function refused(string $code, int $status, string $message = ''): callable
    {
        return static fn (CommandInterface $command): S3Exception => new S3Exception(
            'Error executing "' . $command->getName() . '"',
            $command,
            ['code' => $code, 'message' => $message, 'response' => new Response($status)],
        );
    }

    public function testLeavesAnUnchangedRuleAlone(): void
    {
        $tester = $this->runCommand(
            [
            'HeadBucket' => new Result([]),
            'GetBucketCors' => new Result(['CORSRules' => [$this->rule(self::ORIGIN)]]),
            // Would fail the deploy, but is never called.
            'PutBucketCors' => self::refused('AccessDenied', 403),
            ]
        );

        $this->assertSame(Command::SUCCESS, $tester->getStatusCode(), $tester->getDisplay());
        $this->assertNotContains('PutBucketCors', $this->calls);
        $this->assertStringContainsString('already allow', $tester->getDisplay());
    }

    public function testAddsTheOriginNextToTheOnesAlreadyAllowed(): void
    {
        $tester = $this->runCommand(
            [
            'HeadBucket' => new Result([]),
            'GetBucketCors' => new Result(['CORSRules' => [$this->rule('https://burgieclan.vtk.be')]]),
            ]
        );

        $this->assertSame(Command::SUCCESS, $tester->getStatusCode(), $tester->getDisplay());
        $this->assertContains('PutBucketCors', $this->calls);
        $this->assertStringContainsString('https://burgieclan.vtk.be, ' . self::ORIGIN, $tester->getDisplay());
    }

    public function testSaysWhyAWriteFailed(): void
    {
        $tester = $this->runCommand(
            [
            'HeadBucket' => new Result([]),
            'GetBucketCors' => self::refused('NoSuchCORSConfiguration', 404),
            'PutBucketCors' => self::refused('AccessDenied', 403),
            ]
        );

        $this->assertSame(Command::FAILURE, $tester->getStatusCode());
        $this->assertStringContainsString('PutBucketCors: AccessDenied (HTTP 403)', $tester->getDisplay());
    }
}
