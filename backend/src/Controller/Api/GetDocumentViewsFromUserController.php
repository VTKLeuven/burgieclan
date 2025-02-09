<?php

namespace App\Controller\Api;

use App\ApiResource\UserDocumentViewApi;
use App\Entity\User;
use App\Repository\UserDocumentViewRepository;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class GetDocumentViewsFromUserController extends AbstractController
{
    public function __construct(
        private readonly Security               $security,
        private readonly MicroMapperInterface   $microMapper,
        private readonly SerializerInterface    $serializer,
        private readonly UserDocumentViewRepository $viewRepository,
    ) {
    }

    /**
     * @throws Exception
     */
    public function __invoke(UserDocumentViewApi $userDocumentViewApi, Request $request)
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $documentViews = $this->viewRepository->findRecentDocumentsByUser($user);

        $documentViewsApi = [];
        foreach ($documentViews as $view) {
            $documentViewsApi[] = $this->microMapper->map($view, UserDocumentViewApi::class, [
                MicroMapperInterface::MAX_DEPTH => 2, // TODO: This should be checked
            ]);
        }

        $serializedDocumentViewsApi = $this->serializer->serialize(
            $documentViewsApi,
            'json',
        );

        return new Response($serializedDocumentViewsApi, Response::HTTP_OK);
    }
}
