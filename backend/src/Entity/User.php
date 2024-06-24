<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\Entity;

use App\Factory\UserFactory;
use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use League\OAuth2\Client\Token\AccessToken;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Defines the properties of the User entity to represent the application users.
 * See https://symfony.com/doc/current/doctrine.html#creating-an-entity-class.
 *
 * Tip: if you have an existing database, you can generate these entity class automatically.
 * See https://symfony.com/doc/current/doctrine/reverse_engineering.html
 *
 * @author Ryan Weaver <weaverryan@gmail.com>
 * @author Javier Eguiluz <javier.eguiluz@gmail.com>
 */
#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'burgieclan_user')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    // We can use constants for roles to find usages all over the application rather
    // than doing a full-text search on the "ROLE_" string.
    // It also prevents from making typo errors.
    final public const ROLE_USER = 'ROLE_USER';
    final public const ROLE_ADMIN = 'ROLE_ADMIN';
    final public const ROLE_SUPER_ADMIN = 'ROLE_SUPER_ADMIN';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING)]
    #[Assert\NotBlank]
    private ?string $fullName = null;

    #[ORM\Column(type: Types::STRING, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 50)]
    private ?string $username = null;

    #[ORM\Column(type: Types::STRING, unique: true)]
    #[Assert\Email]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING)]
    private ?string $password = null;

    /**
     * @var string|null $plainPassword
     * This variable contains the plaintext password during creation. It is needed for the @see UserFactory
     * This isn't saved in the database.
     */
    private ?string $plainPassword;

    /**
     * @var string[]
     */
    #[ORM\Column(type: Types::JSON)]
    private array $roles = [];

    /**
     * @var string|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?string $accesstoken;

    /**
     * @var Collection|Program[]
     */
    #[ORM\ManyToMany(targetEntity: Program::class, inversedBy: 'users')]
    #[ORM\JoinTable(name: 'favorite_user_program')]
    private Collection $favoritePrograms;

    /**
     * @var Collection|Module[]
     */
    #[ORM\ManyToMany(targetEntity: Module::class, inversedBy: 'users')]
    #[ORM\JoinTable(name: 'favorite_user_module')]
    private Collection $favoriteModules;

    /**
     * @var Collection|Course[]
     */
    #[ORM\ManyToMany(targetEntity: Course::class, inversedBy: 'users')]
    #[ORM\JoinTable(name: 'favorite_user_course')]
    private Collection $favoriteCourses;

    /**
     * @var Collection|Document[]
     */
    #[ORM\ManyToMany(targetEntity: Document::class, inversedBy: 'users')]
    #[ORM\JoinTable(name: 'favorite_user_document')]
    private Collection $favoriteDocuments;

    public function __construct()
    {
        $this->favoritePrograms = new ArrayCollection();
        $this->favoriteModules = new ArrayCollection();
        $this->favoriteCourses = new ArrayCollection();
        $this->favoriteDocuments = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setFullName(string $fullName): void
    {
        $this->fullName = $fullName;
    }

    public function getFullName(): ?string
    {
        return $this->fullName;
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->username;
    }

    public function getUsername(): string
    {
        return $this->getUserIdentifier();
    }

    public function setUsername(string $username): void
    {
        $this->username = $username;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): void
    {
        $this->email = $email;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): void
    {
        $this->password = $password;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(string $plainPassword): void
    {
        $this->plainPassword = $plainPassword;
    }

    /**
     * Returns the roles or permissions granted to the user for security.
     */
    public function getRoles(): array
    {
        $roles = $this->roles;

        // guarantees that a user always has at least one role for security
        if (empty($roles)) {
            $roles[] = self::ROLE_USER;
        }

        return array_unique($roles);
    }

    /**
     * @param string[] $roles
     */
    public function setRoles(array $roles): void
    {
        $this->roles = $roles;
    }

    /**
     * @return AccessToken|null
     */
    public function getAccesstoken(): ?AccessToken
    {
        return $this->accesstoken ? new AccessToken(json_decode($this->accesstoken, true)) : null;
    }

    /**
     * @param AccessToken|string $accesstoken
     */
    public function setAccesstoken(AccessToken|string $accesstoken): void
    {
        $this->accesstoken = json_encode($accesstoken);
    }

    /**
     * Returns the salt that was originally used to encode the password.
     *
     * {@inheritdoc}
     */
    public function getSalt(): ?string
    {
        // We're using bcrypt in security.yaml to encode the password, so
        // the salt value is built-in and you don't have to generate one
        // See https://en.wikipedia.org/wiki/Bcrypt

        return null;
    }

    /**
     * Removes sensitive data from the user.
     *
     * {@inheritdoc}
     */
    public function eraseCredentials(): void
    {
         $this->plainPassword = null;
    }

    /**
     * @return array{int|null, string|null, string|null}
     */
    public function __serialize(): array
    {
        // add $this->salt too if you don't use Bcrypt or Argon2i
        return [$this->id, $this->username, $this->password];
    }

    /**
     * @param array{int|null, string, string} $data
     */
    public function __unserialize(array $data): void
    {
        // add $this->salt too if you don't use Bcrypt or Argon2i
        [$this->id, $this->username, $this->password] = $data;
    }

    public function __toString(): string
    {
        return $this->getFullName() ?? '';
    }

    /**
     * Returns the available roles for a user.
     */
    public static function getAvailableRoles(): array
    {
        return array(self::ROLE_USER, self::ROLE_ADMIN, self::ROLE_SUPER_ADMIN);
    }

    /**
     * Get the favorite programs of the user.
     *
     * @return Collection
     */
    public function getFavoritePrograms(): Collection
    {
        return $this->favoritePrograms;
    }

    /**
     * Set the favorite programs of the user.
     *
     * @param Collection $programs
     * @return void
     */
    public function setFavoritePrograms(Collection $programs): void
    {
        $this->favoritePrograms = $programs;
    }

    /**
     * Get the favorite modules of the user.
     *
     * @return Collection
     */
    public function getFavoriteModules(): Collection
    {
        return $this->favoriteModules;
    }

    /**
     * Set the favorite modules of the user.
     *
     * @param Collection $modules
     * @return void
     */
    public function setFavoriteModules(Collection $modules): void
    {
        $this->favoriteModules = $modules;
    }

    /**
     * Get the favorite courses of the user.
     *
     * @return Collection
     */
    public function getFavoriteCourses(): Collection
    {
        return $this->favoriteCourses;
    }

    /**
     * Set the favorite courses of the user.
     *
     * @param Collection $courses
     * @return void
     */
    public function setFavoriteCourses(Collection $courses): void
    {
        $this->favoriteCourses = $courses;
    }

    /**
     * Get the favorite documents of the user.
     *
     * @return Collection
     */
    public function getFavoriteDocuments(): Collection
    {
        return $this->favoriteDocuments;
    }

    /**
     * Set the favorite documents of the user.
     *
     * @param Collection $documents
     * @return void
     */
    public function setFavoriteDocuments(Collection $documents): void
    {
        $this->favoriteDocuments = $documents;
    }
}
