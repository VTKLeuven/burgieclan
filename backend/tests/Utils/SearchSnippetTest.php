<?php

namespace App\Tests\Utils;

use App\Utils\SearchSnippet;
use PHPUnit\Framework\TestCase;

class SearchSnippetTest extends TestCase
{
    public function testShortTextIsShownWhole(): void
    {
        $this->assertSame('Bewijs de stelling.', SearchSnippet::around("  Bewijs   de\nstelling. ", 'stelling'));
    }

    public function testLongTextIsCutAroundTheFirstMatch(): void
    {
        $text = str_repeat('inleiding ', 30) . 'Bewijs de stelling van Rolle. ' . str_repeat('uitleg ', 30);

        $snippet = SearchSnippet::around($text, 'xyz ROLLE', 80);

        $this->assertStringStartsWith('…', $snippet);
        $this->assertStringEndsWith('…', $snippet);
        $this->assertStringContainsString('stelling van Rolle', $snippet);
        // Starts at a word, and is no longer than asked plus the two ellipses.
        $this->assertMatchesRegularExpression('/^…inleiding /', $snippet);
        $this->assertLessThanOrEqual(82, mb_strlen($snippet));
    }

    public function testWithoutAMatchItShowsTheStart(): void
    {
        $text = 'Begin van de vraag. ' . str_repeat('meer tekst ', 30);

        $this->assertStringStartsWith('Begin van de vraag.', SearchSnippet::around($text, 'nergens', 40));
    }

    public function testAMatchNearTheEndShowsTheEnd(): void
    {
        $text = str_repeat('tekst ', 40) . 'slot';

        $this->assertStringEndsWith('tekst slot', SearchSnippet::around($text, 'slot', 50));
    }
}
