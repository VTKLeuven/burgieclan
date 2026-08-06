<?php

namespace App\Tests\Controller\Admin;

use App\Entity\User;
use App\Factory\CourseFactory;
use App\Factory\DocumentFactory;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use App\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * No admin page may render a style="" attribute.
 *
 * EasyAdmin's _css_assets.html.twig calls csp_nonce('style'), so nelmio emits a nonce on
 * the style-src directive — and per CSP, a nonce makes the browser ignore 'unsafe-inline'
 * for that whole directive. A <style> element can carry the nonce; an attribute has
 * nowhere to put one. So every inline style attribute under /admin is dead on arrival:
 *
 *     Applying inline style violates the following Content Security Policy directive
 *     'style-src 'self' 'unsafe-inline' … 'nonce-…''. The action has been blocked.
 *
 * The failure is silent in the markup — the page renders, just unstyled in that one spot —
 * which is why this is a test and not a code review note. Put the rule in
 * public/admin-assets/css/admin.css instead, or in a <style nonce="{{ csp_nonce('style') }}">
 * block when it is specific to one template.
 *
 * Note that element.style.foo = … from JavaScript is fine: CSP does not govern CSSOM.
 */
class AdminInlineStyleCspTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    public function testNoAdminPageRendersAnInlineStyleAttribute(): void
    {
        $client = static::createClient();
        $client->loginUser(UserFactory::createOne(['roles' => [User::ROLE_SUPER_ADMIN]]));

        DocumentFactory::createOne(['file_name' => 'scan.png', 'under_review' => true]);
        $document = DocumentFactory::createOne(['file_name' => 'notes.pdf']);
        CourseFactory::createOne();
        $program = ProgramFactory::createOne();
        ModuleFactory::createOne(['program' => $program]);
        $user = UserFactory::createOne();

        $urls = [
            '/admin/document-pending',
            '/admin/document',
            '/admin/document/' . $document->getId() . '/edit',
            '/admin/course',
            '/admin/program',
            '/admin/program/' . $program->getId() . '/tree',
            '/admin/user',
            '/admin/user/' . $user->getId() . '/edit',
        ];

        $offenders = [];

        foreach ($urls as $url) {
            $client->request('GET', 'https://localhost' . $url);
            self::assertResponseIsSuccessful($url . ' did not render');

            $html = $client->getResponse()->getContent();

            // Everything the custom templates need lives in this one stylesheet, so if it
            // stops being attached the pages are unstyled rather than blocked — same symptom,
            // different cause, worth catching here too.
            if (!str_contains($html, '/admin-assets/css/admin.css')) {
                $offenders[] = $url . ': admin.css is not linked';
            }

            foreach (explode("\n", $html) as $lineNumber => $line) {
                if (preg_match('/\sstyle\s*=\s*"/', $line)) {
                    $offenders[] = sprintf('%s L%d: %s', $url, $lineNumber + 1, trim(substr($line, 0, 160)));
                }
            }

            // Moving a style into a class is easy to get wrong by appending a second
            // class="" to an element that already had one — the browser keeps the first
            // and drops the second, so the page renders with the styling silently missing.
            preg_match_all('/<[a-zA-Z][^<>]*>/', $html, $tags);
            foreach ($tags[0] as $tag) {
                if (preg_match_all('/\sclass\s*=\s*"/', $tag) > 1) {
                    $offenders[] = sprintf('%s: two class attributes on %s', $url, substr($tag, 0, 160));
                }
            }
        }

        self::assertSame([], $offenders, "inline style attributes are blocked by CSP on /admin:\n");
    }
}
