<?php

namespace App\Controller\Api;

use ApiPlatform\Metadata\IriConverterInterface;
use App\ApiResource\DocumentApi;
use App\Entity\Document;
use App\Entity\User;
use App\Repository\UserDocumentViewRepository;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;

class AddDocumentViewToUserController extends AbstractController
{
    public function __construct(
        private readonly Security               $security,
        private readonly MicroMapperInterface   $microMapper,
        private readonly EntityManagerInterface $entityManager,
        private readonly IriConverterInterface  $iriConverter,
        private readonly UserDocumentViewRepository $viewRepository,
    ) {
    }

    /**
     * @throws Exception
     */
    public function __invoke(Request $request)
    {
        $user = $this->security->getUser();
        assert($user instanceof User);

        $requestBody = json_decode($request->getContent(), true);
        $viewsToAdd = $requestBody['userDocumentViews'] ??
            throw new HttpException(422, 'No valid document views provided');

        foreach ($viewsToAdd as $view) {
            $documentApiIri = $view['document'];

            $documentApi = $this->iriConverter->getResourceFromIri($documentApiIri);
            assert($documentApi instanceof DocumentApi);

            $document = $this->microMapper->map($documentApi, Document::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);

            $this->viewRepository->recordView(
                $user,
                $document,
                new \DateTime($view['lastViewed']),
                false
            );
        }

        $this->entityManager->flush();

        return new Response(null, Response::HTTP_NO_CONTENT);
    }
}
