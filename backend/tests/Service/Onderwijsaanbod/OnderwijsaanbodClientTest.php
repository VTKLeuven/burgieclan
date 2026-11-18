<?php

namespace App\Tests\Service\Onderwijsaanbod;

use App\Service\Onderwijsaanbod\OnderwijsaanbodClient;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\Exception\TransportException;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

class OnderwijsaanbodClientTest extends TestCase
{
    public function testSearchProgramsUsesProgrammeOriginalLanguageTitleAndRanksCleanly(): void
    {
        $searchPayload = json_encode(
            [
                'hits' => [
                    'hits' => [
                        [
                            '_source' => [
                                'qualificationId' => '50268954',
                                'qualificationOriginalLangu' => 'NL',
                                'programSet' => [[
                                    'programId' => '51016866',
                                    'inProgramGuide' => 'True',
                                    'programLanguageSet' => [
                                        [
                                            'programLangu' => 'NL',
                                            'programTitleSet' => [[
                                                'description' => 'Master in de ingenieurswetenschappen: '
                                                    . 'energie (Leuven)',
                                            ]],
                                        ],
                                        [
                                            'programLangu' => 'EN',
                                            'programTitleSet' => [[
                                                'description' => 'Master of Engineering: Energy (Leuven)',
                                            ]],
                                        ],
                                    ],
                                ]],
                            ],
                        ],
                        [
                            '_source' => [
                                'qualificationId' => '51384404',
                                'qualificationOriginalLangu' => 'EN',
                                'programSet' => [[
                                    'programId' => '51384442',
                                    'inProgramGuide' => 'True',
                                    'programLanguageSet' => [
                                        [
                                            'programLangu' => 'NL',
                                            'programTitleSet' => [[
                                                'description' => 'Master in de ingenieurswetenschappen: '
                                                    . 'energie (Leuven)',
                                            ]],
                                        ],
                                        [
                                            'programLangu' => 'EN',
                                            'programTitleSet' => [[
                                                'description' => 'Master of Engineering: Energy (Leuven)',
                                            ]],
                                        ],
                                    ],
                                ]],
                            ],
                        ],
                        [
                            '_source' => [
                                'qualificationId' => '50362492',
                                'qualificationOriginalLangu' => 'NL',
                                'programSet' => [[
                                    'programId' => '57861104',
                                    'inProgramGuide' => 'True',
                                    'programLanguageSet' => [
                                        [
                                            'programLangu' => 'NL',
                                            'programTitleSet' => [[
                                                'description' => 'Bachelor in de ingenieurswetenschappen '
                                                    . '(programma voor studenten gestart in 2024-2025 of later) '
                                                    . '(Leuven)',
                                            ]],
                                        ],
                                    ],
                                ]],
                            ],
                        ],
                    ],
                ],
            ],
            JSON_THROW_ON_ERROR
        );

        $client = new OnderwijsaanbodClient(new MockHttpClient([new MockResponse($searchPayload)]));
        $results = $client->searchPrograms('ingenieurswetenschappen');

        $summary = array_map(
            static fn (array $r): array => [
                'programId' => $r['programId'],
                'language' => $r['language'],
                'title' => $r['title'],
            ],
            $results,
        );

        self::assertNotEmpty($summary);
        self::assertSame('57861104', $summary[0]['programId'], 'parenthetical year text should not sink rank');
        self::assertContains(
            [
                'programId' => '51016866',
                'language' => 'nl',
                'title' => 'Master in de ingenieurswetenschappen: energie (Leuven)',
            ],
            $summary,
        );
        self::assertContains(
            [
                'programId' => '51384442',
                'language' => 'en',
                'title' => 'Master of Engineering: Energy (Leuven)',
            ],
            $summary,
        );
    }

    public function testGetLastErrorTracksFailureAndResetsOnSuccess(): void
    {
        $calls = 0;
        $httpClient = new MockHttpClient(
            function () use (&$calls): MockResponse {
                $calls++;
                if ($calls === 1) {
                    throw new TransportException('network timeout');
                }

                return new MockResponse(json_encode(['hits' => ['hits' => []]], JSON_THROW_ON_ERROR));
            }
        );

        $client = new OnderwijsaanbodClient($httpClient);

        self::assertNull($client->fetchProgramSource('55036830'));
        self::assertNotNull($client->getLastError());
        self::assertStringContainsString('network timeout', $client->getLastError());

        self::assertNull($client->fetchProgramSource('55036830'));
        self::assertNull($client->getLastError(), 'lastError clears on a subsequent successful response');
    }
}
