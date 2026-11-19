<?php

namespace App\Tests\Controller\Api;

use App\Constants\FluxusOAuthCookies;
use App\Controller\Api\FluxusOAuthInitiateController;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Zenstruck\Browser\Test\HasBrowser;

class FluxusOAuthInitiateControllerTest extends KernelTestCase
{
    use HasBrowser;

    #[DataProvider('provideRedirectToCases')]
    public function testSanitizeRedirectTo(mixed $input, string $expected): void
    {
        $this->assertSame($expected, FluxusOAuthInitiateController::sanitizeRedirectTo($input));
    }

    /**
     * @return iterable<string, array{mixed, string}>
     */
    public static function provideRedirectToCases(): iterable
    {
        yield 'null falls back to root' => [null, '/'];
        yield 'empty string falls back to root' => ['', '/'];
        yield 'non-string falls back to root' => [123, '/'];
        yield 'root path is allowed' => ['/', '/'];
        yield 'relative path with query and fragment is allowed' => [
            '/courses/123?tab=exams#top',
            '/courses/123?tab=exams#top',
        ];
        yield 'https URL is rejected' => ['https://evil.com/phish', '/'];
        yield 'http URL is rejected' => ['http://evil.com', '/'];
        yield 'scheme-relative URL is rejected' => ['//evil.com', '/'];
        yield 'triple-slash URL is rejected' => ['///evil.com', '/'];
        yield 'slash-backslash URL is rejected' => ['/\\evil.com', '/'];
        yield 'backslash anywhere is rejected' => ['/courses\\evil', '/'];
        yield 'relative path without leading slash is rejected' => ['courses/123', '/'];
        yield 'javascript scheme is rejected' => ['javascript:alert(1)', '/'];
        yield 'control characters are rejected' => ["/courses\nSet-Cookie: a=b", '/'];
        yield 'null byte is rejected' => ["/courses\x00", '/'];
    }

    public function testInitiateSetsSanitizedRedirectCookie(): void
    {
        $browser = $this->browser([], ['HTTPS' => 'on'])
            ->interceptRedirects()
            ->get('/api/auth/oauth/initiate?redirect_to=' . urlencode('//evil.com'))
            ->assertStatus(302);

        $setCookies = $browser->client()->getInternalResponse()->getHeaders()['set-cookie'] ?? [];
        $this->assertNotEmpty($setCookies);
        $this->assertStringContainsString(
            FluxusOAuthCookies::FRONTEND_REDIRECT . '=%2F;',
            implode("\n", $setCookies)
        );
    }

    public function testInitiatePreservesValidRelativeRedirectCookie(): void
    {
        $browser = $this->browser([], ['HTTPS' => 'on'])
            ->interceptRedirects()
            ->get('/api/auth/oauth/initiate?redirect_to=' . urlencode('/courses/42?tab=docs'))
            ->assertStatus(302);

        $setCookies = $browser->client()->getInternalResponse()->getHeaders()['set-cookie'] ?? [];
        $this->assertNotEmpty($setCookies);
        $this->assertStringContainsString(
            FluxusOAuthCookies::FRONTEND_REDIRECT . '=' . rawurlencode('/courses/42?tab=docs') . ';',
            implode("\n", $setCookies)
        );
    }
}
