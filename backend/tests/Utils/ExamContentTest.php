<?php

namespace App\Tests\Utils;

use App\Utils\ExamContent;
use PHPUnit\Framework\TestCase;

class ExamContentTest extends TestCase
{
    private const CONTENT = [
        'type' => 'doc',
        'content' => [
            ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Algemene info']]],
            [
                'type' => 'examQuestion',
                'attrs' => ['id' => 'q1', 'sittings' => ['a']],
                'content' => [
                    [
                        'type' => 'paragraph',
                        'content' => [
                            ['type' => 'text', 'text' => 'Bereken '],
                            ['type' => 'inlineMath', 'attrs' => ['latex' => '\\int_0^1 x\\,dx']],
                        ],
                    ],
                    [
                        'type' => 'bulletList',
                        'content' => [
                            ['type' => 'listItem', 'content' => [
                                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'deel a']]],
                            ]],
                            ['type' => 'listItem', 'content' => [
                                ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'deel b']]],
                            ]],
                        ],
                    ],
                ],
            ],
            ['type' => 'examQuestion', 'attrs' => ['id' => 'q2', 'sittings' => []], 'content' => [['type' => 'paragraph']]],
        ],
    ];

    public function testCountsOnlyQuestions(): void
    {
        $this->assertSame(2, ExamContent::countQuestions(self::CONTENT));
        $this->assertSame(0, ExamContent::countQuestions(null));
        $this->assertSame(0, ExamContent::countQuestions(['type' => 'doc', 'content' => 'nonsense']));
    }

    public function testQuestionTexts(): void
    {
        $this->assertSame(
            ['Bereken $\\int_0^1 x\\,dx$ deel a deel b', ''],
            ExamContent::questionTexts(self::CONTENT)
        );
        $this->assertSame(['Bereken $\\int…'], ExamContent::questionTexts(['content' => [self::CONTENT['content'][1]]], 14));
    }

    public function testSittingsSkipsMalformedEntries(): void
    {
        $fields = ['sittings' => [
            ['id' => 'a', 'label' => 'ma 20 jan'],
            ['id' => 'b'],
            'junk',
            ['id' => 'c', 'label' => 'mondeling dag 2'],
        ]];

        $this->assertSame(
            [['id' => 'a', 'label' => 'ma 20 jan'], ['id' => 'c', 'label' => 'mondeling dag 2']],
            ExamContent::sittings($fields)
        );
        $this->assertSame([], ExamContent::sittings(null));
    }
}
