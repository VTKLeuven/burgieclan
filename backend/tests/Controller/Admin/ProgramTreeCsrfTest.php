<?php

namespace App\Tests\Controller\Admin;

use App\Entity\Module;
use App\Entity\User;
use App\Factory\ModuleFactory;
use App\Factory\ProgramFactory;
use App\Factory\UserFactory;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

/**
 * Every mutating route in the tree editor has to reject a request without a valid
 * CSRF token, and every form on the page has to send one.
 *
 * The second half matters more than it looks: the editor renders nine forms across
 * six routes, several of them inside a recursive macro, and a new one that forgets
 * the hidden field fails silently for the admin who added it — the action just
 * redirects with a flash. This test is what notices.
 */
class ProgramTreeCsrfTest extends WebTestCase
{
    use Factories;
    use ResetDatabase;

    private function admin(): User
    {
        return UserFactory::createOne(['roles' => [User::ROLE_SUPER_ADMIN]]);
    }

    /**
     * Reads the position straight from the database, past the identity map.
     */
    private function positionOf(int $moduleId): int
    {
        $entityManager = static::getContainer()->get('doctrine')->getManager();
        $entityManager->clear();

        return $entityManager->getRepository(Module::class)->find($moduleId)->getPosition();
    }

    public function testEveryTreeFormSendsACsrfToken(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $program = ProgramFactory::createOne();
        ModuleFactory::createOne(['program' => $program]);

        $crawler = $client->request('GET', 'https://localhost/admin/program/' . $program->getId() . '/tree');
        self::assertResponseIsSuccessful();

        $forms = $crawler->filter('form[action*="/tree/"]');
        self::assertGreaterThan(0, $forms->count(), 'no tree forms rendered; the selector is probably stale');

        $forms->each(
            function ($form) {
                self::assertGreaterThan(
                    0,
                    $form->filter('input[name="_token"]')->count(),
                    'form is missing its CSRF token: ' . $form->attr('action')
                );
            }
        );
    }

    public function testReorderIsRejectedWithoutAToken(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $program = ProgramFactory::createOne();
        ModuleFactory::createOne(['program' => $program, 'name' => 'AAA', 'position' => 10]);
        $second = ModuleFactory::createOne(['program' => $program, 'name' => 'BBB', 'position' => 20]);

        $client->request(
            'POST',
            'https://localhost/admin/program/' . $program->getId() . '/tree/reorder-module',
            ['module_id' => $second->getId(), 'parent_id' => 'root', 'direction' => 'up']
        );

        self::assertResponseRedirects();
        self::assertSame(20, $this->positionOf($second->getId()), 'the reorder went through without a token');
    }

    public function testReorderSucceedsWithAValidToken(): void
    {
        $client = static::createClient();
        $client->loginUser($this->admin());

        $program = ProgramFactory::createOne();
        $first = ModuleFactory::createOne(['program' => $program, 'name' => 'AAA', 'position' => 10]);
        $second = ModuleFactory::createOne(['program' => $program, 'name' => 'BBB', 'position' => 20]);

        $crawler = $client->request('GET', 'https://localhost/admin/program/' . $program->getId() . '/tree');
        $token = $crawler->filter('input[name="_token"]')->first()->attr('value');

        $client->request(
            'POST',
            'https://localhost/admin/program/' . $program->getId() . '/tree/reorder-module',
            ['_token' => $token, 'module_id' => $second->getId(), 'parent_id' => 'root', 'direction' => 'up']
        );

        self::assertResponseRedirects();
        self::assertLessThan(
            $this->positionOf($first->getId()),
            $this->positionOf($second->getId()),
            'the module did not move up'
        );
    }
}
