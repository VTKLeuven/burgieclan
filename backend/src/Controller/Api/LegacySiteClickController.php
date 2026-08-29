<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\LegacySiteClickRepository;
use DateTimeImmutable;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_USER)]
class LegacySiteClickController extends AbstractController
{
    #[Route('/api/analytics/old-burgieclan-click', name: 'api_legacy_site_click', methods: ['POST'])]
    public function __invoke(LegacySiteClickRepository $repository): Response
    {
        $user = $this->getUser();
        assert($user instanceof User);

        $repository->recordClick($user, new DateTimeImmutable());

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}
