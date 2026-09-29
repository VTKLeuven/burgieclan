<?php

namespace App\Service\Collab;

use App\Entity\Exam;
use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The name other people see on someone's cursor in a live document.
 *
 * In an exam reconstruction this follows the account setting `defaultAnonymous` (on for new
 * accounts), the same one that decides whether uploads and comments are anonymous. Anonymous
 * students show under a pseudonym like "Anonieme Pinguïn". It is stable per exam, so a question
 * can be followed up with "the Pinguïn who added question 3", but differs between exams, so it
 * cannot be used to follow one student around the site. Moderators still see real names in the
 * history (CollabDocumentRevision contributors are user ids).
 *
 * The pseudonym is a keyed hash of the user and the document: without the kernel secret nobody
 * can work out which user id is behind it.
 */
class CollabDisplayName
{
    /**
     * Dutch, like the rest of the pseudonym: the collab token carries one finished name, and the
     * site's default language is Dutch.
     */
    public const PSEUDONYM_PREFIX = 'Anonieme';

    public const ANIMALS = [
        'Alpaca', 'Axolotl', 'Bever', 'Bij', 'Bizon', 'Das', 'Dolfijn', 'Eekhoorn', 'Egel', 'Eland',
        'Ekster', 'Flamingo', 'Gems', 'Giraf', 'Haas', 'Hamster', 'Hert', 'IJsbeer', 'Kameel',
        'Kangoeroe', 'Kikker', 'Koala', 'Kolibrie', 'Kraai', 'Krab', 'Kreeft', 'Kwal', 'Lama',
        'Leeuw', 'Libel', 'Luipaard', 'Lynx', 'Marmot', 'Meerkoet', 'Merel', 'Mier', 'Mol', 'Mus',
        'Neushoorn', 'Octopus', 'Olifant', 'Ooievaar', 'Otter', 'Panda', 'Papegaai', 'Pauw',
        'Pelikaan', 'Pinguïn', 'Reiger', 'Ree', 'Salamander', 'Schildpad', 'Specht', 'Spreeuw',
        'Stokstaartje', 'Tapir', 'Tijger', 'Toekan', 'Uil', 'Valk', 'Vlinder', 'Vos', 'Walrus',
        'Walvis', 'Wasbeer', 'Wolf', 'Zebra', 'Zeehond', 'Zeepaardje', 'Zwaan',
    ];

    public function __construct(
        #[Autowire('%kernel.secret%')]
        private readonly string $secret,
    ) {}

    public function for(User $user, string $documentName): string
    {
        if (null === Exam::idFromDocumentName($documentName) || !$user->isDefaultAnonymous()) {
            return $user->getFullName();
        }

        return $this->pseudonym((int) $user->getId(), $documentName);
    }

    public function pseudonym(int $userId, string $documentName): string
    {
        $hash = hash_hmac('sha256', $documentName . "\n" . $userId, $this->secret);
        $index = (int) hexdec(substr($hash, 0, 8)) % count(self::ANIMALS);

        return self::PSEUDONYM_PREFIX . ' ' . self::ANIMALS[$index];
    }
}
