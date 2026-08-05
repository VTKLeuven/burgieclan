<?php

namespace App\OauthProvider;

use App\OauthProvider\Exception\FluxusIdentityProviderException;
use InvalidArgumentException;
use League\OAuth2\Client\Provider\AbstractProvider;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use League\OAuth2\Client\Token\AccessToken;
use League\OAuth2\Client\Tool\BearerAuthorizationTrait;
use Psr\Http\Message\ResponseInterface;

/**
 * Fluxus, the OAuth2/OIDC provider of the VTK website, which acts as the
 * authorization server for all VTK applications. Replaces Litus on the old site.
 *
 * The three endpoints all live under one issuer base path (`/api/auth/better`), so
 * they are derived from a single `issuer` option instead of being configured one by
 * one. Discovery is available at `<issuer>/.well-known/openid-configuration`.
 */
class FluxusProvider extends AbstractProvider
{
    use BearerAuthorizationTrait;

    /**
     * Base URL of the authorization server, e.g. https://vtk.be/api/auth/better
     *
     * @var string
     */
    public string $issuer;

    public function __construct(array $options = [], array $collaborators = [])
    {
        $this->assertRequiredOptions($options);

        $this->issuer = rtrim($options['issuer'], '/');

        parent::__construct($options, $collaborators);
    }

    /**
     * Verifies that all required options have been passed.
     *
     * @param  array $options
     * @return void
     * @throws InvalidArgumentException
     */
    private function assertRequiredOptions(array $options): void
    {
        $missing = array_diff_key(array_flip($this->getRequiredOptions()), $options);

        if (!empty($missing)) {
            throw new InvalidArgumentException(
                'Required options not defined: ' . implode(', ', array_keys($missing))
            );
        }
    }

    /**
     * Returns all options that are required.
     *
     * @return array
     */
    protected function getRequiredOptions(): array
    {
        return [
            'issuer',
        ];
    }

    /**
     * Get authorization URL to begin OAuth flow
     *
     * @return string
     */
    public function getBaseAuthorizationUrl(): string
    {
        return $this->issuer . '/oauth2/authorize';
    }

    /**
     * Get access token URL to retrieve token
     *
     * @param  array $params
     * @return string
     */
    public function getBaseAccessTokenUrl(array $params): string
    {
        return $this->issuer . '/oauth2/token';
    }

    /**
     * Get provider URL to retrieve user details
     *
     * @param  AccessToken $token
     * @return string
     */
    public function getResourceOwnerDetailsUrl(AccessToken $token): string
    {
        return $this->issuer . '/oauth2/userinfo';
    }

    /**
     * Returns the string that should be used to separate scopes when building
     * the URL for requesting an access token.
     *
     * @return string Scope separator
     */
    protected function getScopeSeparator(): string
    {
        return ' ';
    }

    /**
     * The default scopes used by this provider.
     *
     * Study programme, year and student number are split into separate scopes on
     * the VTK side on purpose. We ask for all three: `vtk:student_number` carries
     * the r-number that new accounts are named after.
     *
     * That last one is the only sensitive scope here: it gets its own checkbox on
     * VTK's consent screen, so a member can grant everything else and refuse this
     * one. Nothing may depend on it arriving; see UserRepository::generateUsername().
     *
     * `entitlements` is what unlocks the `permissions` claim on UserInfo, which is
     * where our moderator/admin roles come from. Note that a token carrying that
     * scope expires after ten minutes by design.
     *
     * @return array
     */
    protected function getDefaultScopes(): array
    {
        return [
            'openid',
            'profile',
            'email',
            'entitlements',
            'vtk:study_programme',
            'vtk:study_year',
            'vtk:student_number',
        ];
    }

    /**
     * PKCE is mandatory for every client on the VTK authorization server.
     *
     * @return string|null
     */
    protected function getPkceMethod(): ?string
    {
        return static::PKCE_METHOD_S256;
    }

    /**
     * Check a provider response for errors.
     *
     * @param  ResponseInterface $response
     * @param  array $data Parsed response data
     * @return void
     *
     * @throws IdentityProviderException
     */
    protected function checkResponse(ResponseInterface $response, $data): void
    {
        if ($response->getStatusCode() >= 400) {
            throw FluxusIdentityProviderException::clientException($response, $data);
        }
    }

    /**
     * Generate a user object from a successful user details request.
     *
     * @param  array $response
     * @param  AccessToken $token
     * @return FluxusResourceOwner
     */
    protected function createResourceOwner(array $response, AccessToken $token): FluxusResourceOwner
    {
        return new FluxusResourceOwner($response);
    }

    protected function getAuthorizationHeaders($token = null): array
    {
        return ['Authorization' => 'Bearer ' . $token];
    }
}
