<?php

namespace App\Tests\Api;

use App\Factory\UserFactory;
use App\Service\VtkService\VtkServiceSignature;
use App\Service\VtkService\VtkStudy;
use Psr\Log\NullLogger;
use Symfony\Component\HttpClient\Exception\TransportException;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Zenstruck\Browser\KernelBrowser;

/**
 * The study timer as "Samen blokken" on vtk.be (VtkStudy). vtk.be is mocked; what it receives is
 * checked as vtk.be checks it.
 */
class VtkStudyTest extends ApiTestCase
{
    private const SECRET = 'a-secret-only-these-tests-know-000000000';

    /** @var list<array{method: string, headers: array<string, string>, body: string}> */
    private array $vtkRequests = [];

    /** @var callable(string, string): MockResponse */
    private $vtk;

    private function browserWithVtk(): KernelBrowser
    {
        $browser = $this->browser();
        $browser->client()->disableReboot();
        $client = new MockHttpClient(
            function (string $method, string $url, array $options): MockResponse {
                $headers = [];
                foreach ($options['headers'] ?? [] as $line) {
                    [$name, $value] = explode(': ', $line, 2);
                    $headers[strtolower($name)] = $value;
                }
                $body = (string) ($options['body'] ?? '');
                $this->vtkRequests[] = ['method' => $method, 'headers' => $headers, 'body' => $body];

                return ($this->vtk)($method, $body);
            }
        );
        self::getContainer()->set(VtkStudy::class, new VtkStudy($client, new VtkServiceSignature(self::SECRET), new NullLogger(), 'http://vtk.test'));

        return $browser;
    }

    private function token(?string $fluxusSub = 'vtk-user-1'): string
    {
        $user = UserFactory::createOne(['email' => 'r0123456@student.kuleuven.be', 'fullName' => 'Ada', 'plainPassword' => 'password', 'fluxusSub' => $fluxusSub]);

        return $this->getToken($user->getUsername(), 'password');
    }

    /**
     * @param array<string, mixed>|null $json
     *
     * @return array<string, mixed>
     */
    private function call(KernelBrowser $browser, string $token, string $method, ?array $json = null, int $status = 200): array
    {
        $options = ['headers' => ['Authorization' => 'Bearer ' . $token]];
        if (null !== $json) {
            $options['json'] = $json;
        }
        $browser->request($method, '/api/vtk_study', $options)->assertStatus($status);

        return json_decode($browser->content(), true) ?? [];
    }

    private static function state(array $overrides = []): MockResponse
    {
        return new MockResponse(
            (string) json_encode(
                $overrides + [
                'now' => '2027-01-04T12:00:00.000Z',
                'session' => ['id' => 's1', 'startedAt' => '2027-01-04T08:12:00.000Z', 'seconds' => 10033, 'paused' => false, 'pausedAt' => null, 'subject' => null, 'maxSeconds' => 28800],
                'todaySeconds' => 10033,
                'dailyGoalMinutes' => 300,
                'streak' => 6,
                'friendsStudying' => 3,
                'today' => [['startedAt' => '2027-01-04T08:12:00.000Z', 'endedAt' => null, 'seconds' => 10033]],
                'days' => [['date' => '2027-01-03', 'seconds' => 13200], ['date' => 'not a date', 'seconds' => 1]],
                ]
            )
        );
    }

    public function testShowsTheSessionOfSamenBlokken(): void
    {
        $token = $this->token();
        $browser = $this->browserWithVtk();
        $this->vtk = fn (): MockResponse => self::state();

        $state = $this->call($browser, $token, 'GET');

        $this->assertTrue($state['available']);
        $this->assertSame(10033, $state['session']['seconds']);
        $this->assertSame(3, $state['friendsStudying']);
        $this->assertSame([['date' => '2027-01-03', 'seconds' => 13200]], $state['days']);
        $this->assertArrayNotHasKey('id', $state['session']);

        $request = $this->vtkRequests[0];
        $this->assertSame('GET', $request['method']);
        $this->assertSame(
            (new VtkServiceSignature(self::SECRET))->sign('GET', VtkStudy::PATH, (int) $request['headers']['x-vtk-timestamp'], $request['headers']['x-vtk-user'], ''),
            $request['headers']['x-vtk-signature']
        );
    }

    public function testPassesActionsOn(): void
    {
        $token = $this->token();
        $browser = $this->browserWithVtk();
        $this->vtk = fn (): MockResponse => self::state(['session' => null]);

        $state = $this->call($browser, $token, 'POST', ['action' => 'stop']);
        $this->assertNull($state['session']);
        $this->assertSame('{"action":"stop"}', $this->vtkRequests[0]['body']);

        $this->call($browser, $token, 'POST', ['action' => 'nap'], 400);
        $this->assertCount(1, $this->vtkRequests);
    }

    public function testNotForAccountsWithoutTheVtkLogin(): void
    {
        $token = $this->token(null);
        $browser = $this->browserWithVtk();
        $this->vtk = fn (): MockResponse => self::state();

        $this->assertSame(['available' => false], $this->call($browser, $token, 'GET'));
        $this->assertSame([], $this->vtkRequests);
    }

    public function testUnknownMemberOrUnreachable(): void
    {
        $token = $this->token();
        $browser = $this->browserWithVtk();

        $this->vtk = fn (): MockResponse => new MockResponse('{"error":"UNKNOWN_MEMBER"}', ['http_code' => 404]);
        $this->assertSame(['available' => false], $this->call($browser, $token, 'GET'));

        $this->vtk = fn (): MockResponse => throw new TransportException('down');
        $this->call($browser, $token, 'GET', null, 502);
    }

    /** The same vector as apps/web/test/burgieclanStudy.test.ts in vtk-website-new. */
    public function testSignatureMatchesTheVtkWebsite(): void
    {
        $user = 'eyJzdWIiOiJ1MSIsImVtYWlsIjoicjBAa3VsZXV2ZW4uYmUiLCJuYW1lIjoiQWRhIEzDtnZlbGFjZSJ9';
        $this->assertSame(
            'sha256=84f008d04b5d0cd9c0fb858c0865957fe23a9633a0d04b05a7d5000eda30c07f',
            (new VtkServiceSignature(str_repeat('x', 40)))->sign('POST', VtkStudy::PATH, 1700000000, $user, '{"action":"start"}')
        );
    }
}
