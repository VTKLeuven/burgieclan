<?php

namespace App\Service\Collab;

use App\Entity\User;
use DateTimeImmutable;
use Lcobucci\JWT\Builder;
use Lcobucci\JWT\JwtFacade;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Issues the short-lived token a browser presents to the collab server when it opens a live
 * document.
 *
 * Symfony has already decided who the user is and what they may do (CollabDocumentVoter); the
 * token carries that decision, so the collab server only has to check the signature. It is signed
 * with COLLAB_SECRET, deliberately not with the Lexik keypair: a token signed with that key would
 * also be accepted by the API as a login.
 *
 * The token only needs to live long enough to open the websocket. The provider asks for a fresh
 * one on every reconnect.
 */
class CollabTokenIssuer
{
    public const ISSUER = 'burgieclan-backend';
    public const AUDIENCE = 'burgieclan-collab';
    public const TTL = '+10 minutes';

    public const MODE_EDIT = 'edit';
    public const MODE_VIEW = 'view';

    /** HS256 needs a key of at least 256 bits. */
    private const MIN_SECRET_BYTES = 32;

    public function __construct(
        #[Autowire(env: 'COLLAB_SECRET')]
        private readonly string $secret,
    ) {}

    public function isConfigured(): bool
    {
        return strlen($this->secret) >= self::MIN_SECRET_BYTES;
    }

    /**
     * @param self::MODE_* $mode
     * @param string $name shown on this user's cursor (CollabDisplayName)
     * @param DateTimeImmutable|null $editableUntil for an edit token on a document that locks at
     *     some point: the collab server drops the connection to read-only once this passes, even
     *     if it was opened before.
     *
     * @return array{token: string, expiresAt: DateTimeImmutable}
     */
    public function issue(
        User $user,
        string $documentName,
        string $mode,
        string $name,
        ?DateTimeImmutable $editableUntil = null
    ): array {
        if (!$this->isConfigured()) {
            throw new CollabNotConfiguredException();
        }

        $secret = $this->secret;
        assert('' !== $secret);

        $claims = ['doc' => $documentName, 'mode' => $mode, 'name' => $name];
        if (self::MODE_EDIT === $mode && null !== $editableUntil) {
            $claims['until'] = $editableUntil->getTimestamp();
        }

        $token = (new JwtFacade())->issue(
            new Sha256(),
            InMemory::plainText($secret),
            static function (Builder $builder, DateTimeImmutable $issuedAt) use ($user, $claims): Builder {
                $builder = $builder
                    ->issuedBy(self::ISSUER)
                    ->permittedFor(self::AUDIENCE)
                    ->relatedTo((string) $user->getId())
                    ->expiresAt($issuedAt->modify(self::TTL));

                foreach ($claims as $claim => $value) {
                    $builder = $builder->withClaim($claim, $value);
                }

                return $builder;
            }
        );

        $expiresAt = $token->claims()->get('exp');
        assert($expiresAt instanceof DateTimeImmutable);

        return ['token' => $token->toString(), 'expiresAt' => $expiresAt];
    }
}
