<?php

namespace App\OauthProvider\Exception;

use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use Psr\Http\Message\ResponseInterface;

class FluxusIdentityProviderException extends IdentityProviderException
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
        // OAuth2 error responses carry `error_description`/`error` (RFC 6749 §5.2); the
        // better-auth provider follows that, so prefer those over a generic dump.
        $message = $data['error_description']
            ?? $data['error']
            ?? $data['message']
            ?? json_encode($data);

        return static::fromResponse($response, is_string($message) ? $message : json_encode($data));
    }

    /**
     * Creates identity exception from response
     *
     * @param ResponseInterface $response
     * @param string|null $message
     * @return IdentityProviderException
     */
    protected static function fromResponse(ResponseInterface $response, ?string $message = null)
    {
        return new self($message ?? 'Unknown error', $response->getStatusCode(), (string)$response->getBody());
    }
}
