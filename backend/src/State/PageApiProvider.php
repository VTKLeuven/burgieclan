<?php

namespace App\State;

use ApiPlatform\State\ProviderInterface;
use ApiPlatform\Metadata\Operation;
use App\ApiResource\PageApi;
use App\Mapper\PageEntityToApiMapper;
use App\Repository\PageRepository;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;
use LogicException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Custom provider for PageApi because it uses urlKey as identifier, while Page uses id as identifier
 */
class PageApiProvider implements ProviderInterface
{
    public function __construct(
        private readonly PageRepository $pageRepository,
        private readonly PageEntityToApiMapper $mapper,
        private readonly MicroMapperInterface $microMapper,
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
//        $pageApiObject = $this->microMapper->map($page, PageApi::class, [
//            MicroMapperInterface::MAX_DEPTH => 0,
//        ]);
        if (!$pageApiObject instanceof PageApi) {
            throw new HttpException(500, 'Page could not be converted to PageApi object');
        }

        return $pageApiObject;
    }
}
