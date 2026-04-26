<?php

namespace App\Factory;

use App\Entity\User;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Zenstruck\Foundry\Persistence\PersistentObjectFactory;

/**
 * @extends PersistentObjectFactory<User>
 */
final class UserFactory extends PersistentObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct(private readonly UserPasswordHasherInterface $passwordHasher) {}

    #[\Override]
    public static function class(): string
    {
        return User::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        return [
            'email' => self::faker()->email(),
            'fullName' => self::faker()->name(),
            'plainPassword' => self::faker()->password(),
            'roles' => [User::ROLE_USER],
            'username' => self::faker()->numerify('r0######'),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            ->afterInstantiate(
                function (User $user) {
                    if ($user->getPlainPassword()) {
                        $user->setPassword(
                            $this->passwordHasher->hashPassword($user, $user->getPlainPassword())
                        );
                    }
                }
            );
    }
}
