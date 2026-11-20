<?php

namespace App\Tests\Api;

use App\Factory\UserFactory;
use App\Service\VtkService\VtkPolls;
use App\Service\VtkService\VtkServiceSignature;
use Psr\Log\NullLogger;
use Symfony\Component\HttpClient\Exception\TransportException;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Zenstruck\Browser\KernelBrowser;

/**
 * The POC polls of the VTK website, asked on the member's behalf (VtkPolls). vtk.be is mocked; what
 * it receives is checked as vtk.be checks it.
 */
class VtkPollsTest extends ApiTestCase
{
    private const SECRET = 'a-secret-only-these-tests-know-000000000';

    /** @var list<array{method: string, url: string, headers: array<string, string>, body: string}> */
    private array $vtkRequests = [];

    /** @var callable(string, string): MockResponse */
    private $vtk;

    private function poll(array $overrides = []): array
    {
        return $overrides + [
            'id' => 'poll-1',
            'title' => 'Hoe liep het eerste semester?',
            'askedBy' => 'POC Computerwetenschappen',
            'openUntil' => 'Open tot vrijdag 27 november',
            'lead' => 'Op 1 december zitten je RiVers met je proffen rond de tafel.',
            'thanks' => 'Je RiVers nemen je antwoorden mee.',
            'anonymous' => 'Niemand ziet wie wat antwoordde.',
            'closesAt' => '2026-11-27T22:59:00.000Z',
            'answered' => false,
            'questions' => [
                ['id' => 'q1', 'kind' => 'SCORE', 'text' => 'Was de werkdruk haalbaar?', 'low' => null, 'high' => null],
                ['id' => 'q2', 'kind' => 'OPEN', 'text' => 'Wat moet anders?', 'low' => null, 'high' => null],
            ],
            'answers' => [],
        ];
    }

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
                $this->vtkRequests[] = ['method' => $method, 'url' => $url, 'headers' => $headers, 'body' => $body];

                return ($this->vtk)($method, $body);
            }
        );
        $container = self::getContainer();
        $container->set(
            VtkPolls::class,
            // Its own secret: the container's comes from the environment, which docker compose sets.
            new VtkPolls($client, new VtkServiceSignature(self::SECRET), new NullLogger(), 'http://vtk.test')
        );

        return $browser;
    }

    /** A member who signed in through VTK, so vtk.be can tell who they are. */
    private function vtkMemberToken(): string
    {
        $user = UserFactory::createOne(
            [
            'username' => 'ada',
            'email' => 'r0123456@student.kuleuven.be',
            'fullName' => 'Ada Lövelace',
            'plainPassword' => 'password',
            'fluxusSub' => 'vtk-user-1',
            ]
        );

        return $this->getToken($user->getUsername(), 'password');
    }

    /** What vtk.be does with the headers: recompute the signature and read the member. */
    private function assertSignedForMember(array $request, string $method): void
    {
        $signature = new VtkServiceSignature(self::SECRET);
        $user = $request['headers']['x-vtk-user'];
        $this->assertSame(
            $signature->sign($method, VtkPolls::PATH, (int) $request['headers']['x-vtk-timestamp'], $user, $request['body']),
            $request['headers']['x-vtk-signature']
        );
        $this->assertSame(
            ['sub' => 'vtk-user-1', 'email' => 'r0123456@student.kuleuven.be', 'name' => 'Ada Lövelace'],
            json_decode((string) base64_decode(strtr($user, '-_', '+/')), true)
        );
    }

    public function testListsThePollsVtkHasForTheMember(): void
    {
        $this->vtk = fn (): MockResponse => new MockResponse(
            (string) json_encode(
                [
                'missingProgramme' => false,
                'polls' => [
                $this->poll(['answered' => true, 'answers' => ['q1' => ['value' => 4, 'text' => null]]]),
                // Missing fields: left out rather than half drawn.
                ['id' => 'broken'],
                ],
                ]
            )
        );
        // Before the browser: logging in boots a fresh kernel, which would drop the mocked vtk.be.
        $token = $this->vtkMemberToken();
        $browser = $this->browserWithVtk();

        $json = $browser
            ->get('/api/vtk_polls?locale=en', ['headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(200)
            ->assertHeaderContains('Cache-Control', 'no-store')
            ->json()
            ->decoded();

        $this->assertTrue($json['available']);
        $this->assertCount(1, $json['polls']);
        $this->assertSame('poll-1', $json['polls'][0]['id']);
        $this->assertTrue($json['polls'][0]['answered']);
        $this->assertSame(['q1' => ['value' => 4, 'text' => null]], $json['polls'][0]['answers']);

        $this->assertCount(1, $this->vtkRequests);
        $this->assertSame('GET', $this->vtkRequests[0]['method']);
        $this->assertSame('http://vtk.test/api/burgieclan/v1/polls?locale=en', $this->vtkRequests[0]['url']);
        $this->assertSignedForMember($this->vtkRequests[0], 'GET');
    }

    public function testAnAccountVtkCannotIdentifyHasNoPollsAndNeverAsks(): void
    {
        $this->vtk = fn (): MockResponse => new MockResponse('{}');
        $browser = $this->browserWithVtk();

        // The account ApiTestCase logs in with never signed in through VTK.
        $browser
            ->get('/api/vtk_polls', ['headers' => ['Authorization' => 'Bearer ' . $this->token]])
            ->assertStatus(200)
            ->assertJsonMatches('available', false)
            ->assertJsonMatches('length(polls)', 0);
        $this->assertSame([], $this->vtkRequests);
    }

    public function testAnUnreachableVtkIsABadGatewayNotAnError(): void
    {
        $this->vtk = fn (): MockResponse => throw new TransportException('Connection refused');
        $token = $this->vtkMemberToken();
        $browser = $this->browserWithVtk();

        $browser
            ->get('/api/vtk_polls', ['headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(502);
        $this->assertCount(1, $this->vtkRequests);
    }

    public function testSendsTheAnswersSignedAndPassesARefusalOn(): void
    {
        $this->vtk = fn (): MockResponse => new MockResponse('{"ok":true}');
        // Before the browser: logging in boots a fresh kernel, which would drop the mocked vtk.be.
        $token = $this->vtkMemberToken();
        $browser = $this->browserWithVtk();
        $answers = ['pollId' => 'poll-1', 'answers' => ['q1' => '4', 'q2' => 'Minder deadlines in week 12']];

        $browser
            ->post('/api/vtk_polls/answers', ['json' => $answers, 'headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(204);
        $this->assertSame('POST', $this->vtkRequests[0]['method']);
        $this->assertSame($answers, json_decode($this->vtkRequests[0]['body'], true));
        $this->assertSignedForMember($this->vtkRequests[0], 'POST');

        $this->vtk = fn (): MockResponse => new MockResponse('{"error":"POLL_CLOSED"}', ['http_code' => 409]);
        $browser
            ->post('/api/vtk_polls/answers', ['json' => $answers, 'headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(409)
            ->assertJsonMatches('reason', 'POLL_CLOSED');

        $this->vtk = fn (): MockResponse => new MockResponse('{"error":"SOMETHING_ELSE"}', ['http_code' => 500]);
        $browser
            ->post('/api/vtk_polls/answers', ['json' => $answers, 'headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(422)
            ->assertJsonMatches('reason', 'POLL_FAILED');

        $browser
            ->post('/api/vtk_polls/answers', ['json' => ['pollId' => 'poll-1', 'answers' => ['q1' => 4]], 'headers' => ['Authorization' => 'Bearer ' . $token]])
            ->assertStatus(400);
        $this->assertCount(3, $this->vtkRequests);
    }

    /**
     * The same vector as apps/web/test/burgieclanPolls.test.ts in vtk-website-new, where vtk.be
     * checks what is signed here: change the scheme on one side and one of the two fails, rather
     * than Burgieclan silently showing no polls.
     */
    public function testSignatureMatchesTheVtkWebsite(): void
    {
        $user = 'eyJzdWIiOiJ1MSIsImVtYWlsIjoicjBAa3VsZXV2ZW4uYmUiLCJuYW1lIjoiQWRhIEzDtnZlbGFjZSJ9';
        $this->assertSame(
            'sha256=82b996ba1a98ffbcbfe69324367b74bbacef0f54a88127730d9d38c97a901308',
            (new VtkServiceSignature(str_repeat('x', 40)))->sign('POST', VtkPolls::PATH, 1700000000, $user, '{"pollId":"p1","answers":{"q1":"1"}}')
        );
    }
}
