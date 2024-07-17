<?php

namespace App\State;

use ApiPlatform\State\ProviderInterface;
use ApiPlatform\Metadata\Operation;
use App\ApiResource\PageApi;
use App\Entity\Page;
use App\Mapper\PageEntityToApiMapper;
use App\Repository\PageRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Custom provider for PageApi because it uses urlKey as identifier, while Page uses id as identifier
 */
class PageApiProvider implements ProviderInterface
{
    public function __construct(
        private readonly PageRepository $pageRepository,
        private readonly PageEntityToApiMapper $mapper,
    ) {
    }

    /*
     * Retrieves a page by unique urlKey and returns the converted PageApi object
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): PageApi
    {
        $urlKey = $uriVariables['urlKey'] ?? null;
        if (!$urlKey) {
            throw new NotFoundHttpException('UrlKey is missing');
        }

        $page = $this->pageRepository->findOneByUrlKey($urlKey);
        if (!$page) {
            throw new NotFoundHttpException(sprintf('Page not found for urlKey: %s', $urlKey));
        }

        $pageApiObject = $this->mapper->map($page, PageApi::class);
        if (!$pageApiObject instanceof PageApi) {
            throw new NotFoundHttpException('Page could not be converted to PageApi object');
        }

        return $pageApiObject;
    }
}
