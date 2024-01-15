<?php

namespace App\OauthProvider\Exception;

use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use Psr\Http\Message\ResponseInterface;

class LitusIdentityProviderException extends IdentityProviderException
{
    /**
     * Creates client exception from response
     *
     * @param ResponseInterface $response
     * @param array $data Parsed response data
     * @return IdentityProviderException
     */
    public static function clientException(ResponseInterface $response, array $data): IdentityProviderException
    {
        return static::fromResponse(
            $response,
            $data['message'] ?? json_encode($data)
        );
    }

    /**
     * Creates identity exception from response
     *
     * @param ResponseInterface $response
     * @param string|null $message
     * @return IdentityProviderException
     */
    protected static function fromResponse(ResponseInterface $response, string $message = null)
    {
        return new static($message, $response->getStatusCode(), (string)$response->getBody());
    }
}
