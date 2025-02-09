<?php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\State\ProviderInterface;
use ApiPlatform\Metadata\Operation;
use App\ApiResource\UserDocumentViewApi;
use App\Entity\User;
use App\Repository\UserDocumentViewRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Custom provider for PageApi because it uses urlKey as identifier, while Page uses id as identifier
 */
class UserDocumentViewProvider implements ProviderInterface
{
    public function __construct(
        private readonly Security               $security,
        private readonly UserDocumentViewRepository $viewRepository,
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function provide(
        Operation $operation,
        array $uriVariables = [],
        array $context = []
    ): UserDocumentViewApi | array {
        if ($operation instanceof CollectionOperationInterface) {
            // Get the user from the security context
            $user = $this->security->getUser();
            assert($user instanceof User);

            // Get the document views for the user
            $documentViews = $this->viewRepository->findRecentDocumentsByUser($user);

            // Map the document views to the API representation
            $documentViewsApi = [];
            foreach ($documentViews as $view) {
                $documentViewsApi[] = $this->microMapper->map($view, UserDocumentViewApi::class, [
                    MicroMapperInterface::MAX_DEPTH => 2, // TODO: This should be checked
                ]);
            }

            // Return the document views
            return $documentViewsApi;
        }

        // If the operation is not a collection operation, throw an exception
        throw new HttpException(500, 'Operation not supported');
    }
}
