<?php

declare(strict_types=1);

namespace App\OauthProvider;

use League\OAuth2\Client\Provider\ResourceOwnerInterface;
use League\OAuth2\Client\Tool\ArrayAccessorTrait;

class LitusResourceOwner implements ResourceOwnerInterface
{
    use ArrayAccessorTrait;

    /**
     * Raw response.
     *
     * @var array
     */
    protected array $response;

    /**
     * Creates new resource owner.
     *
     * @param array $response
     *
     * @return void
     */
    public function __construct(array $response = [])
    {
        $this->response = $response;
    }

    /**
     * Get resource owner ID.
     *
     * @return string|null
     */
    public function getId(): ?string
    {
        return $this->getUsername();
    }

    /**
     * Get resource owner username.
     *
     * @return string|null
     */
    public function getUsername(): ?string
    {
        return $this->getValueByKey($this->response, 'username');
    }

    /**
     * Get resource owner full name.
     *
     * @return string|null
     */
    public function getFullName(): ?string
    {
        return $this->getValueByKey($this->response, 'full_name');
    }

    /**
     * Get resource owner email.
     *
     * @return string|null
     */
    public function getEmail(): ?string
    {
        return $this->getValueByKey($this->response, 'email');
    }

    /**
     * Returns the raw resource owner response.
     *
     * @return array
     */
    public function toArray(): array
    {
        return $this->response;
    }
}
