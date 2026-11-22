<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * A university of the ATHENS network that hosts courses. Comes from the catalogue file
 * (resources/athens/catalogue.json, `app:exchange:import-athens`), by its slug there; the import
 * keeps name, city and country in line with the file.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'athens_university_slug_unique', columns: ['slug'])]
class AthensUniversity extends BaseEntity
{
    #[ORM\Column(length: 60)]
    private string $slug;

    #[ORM\Column(length: 160)]
    private string $name = '';

    #[ORM\Column(length: 100)]
    private string $city = '';

    /** ISO 3166-1 alpha-2. */
    #[ORM\Column(length: 2)]
    private string $country = '';

    public function __construct(string $slug)
    {
        $this->slug = $slug;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function setCity(string $city): static
    {
        $this->city = $city;

        return $this;
    }

    public function getCountry(): string
    {
        return $this->country;
    }

    public function setCountry(string $country): static
    {
        $this->country = $country;

        return $this;
    }

    public function __toString(): string
    {
        return $this->name;
    }
}
