<?php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\State\ProviderInterface;
use ApiPlatform\Metadata\Operation;
use App\ApiResource\PageApi;
use App\Entity\Page;
use App\Repository\PageRepository;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfonycasts\MicroMapper\MicroMapperInterface;

/**
 * Custom provider for PageApi because it uses urlKey as identifier, while Page uses id as identifier
 */
class PageApiProvider implements ProviderInterface
{
    public function __construct(
        private readonly PageRepository $pageRepository,
        private readonly MicroMapperInterface $microMapper,
        private readonly RequestStack $requestStack,
    ) {
    }

    /*
     * Retrieves a page by unique urlKey and returns the converted PageApi object
     */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): PageApi | array
    {
        $request = $this->requestStack->getCurrentRequest();
        $lang = $request->query->get('lang', Page::$DEFAULT_LANGUAGE);
        if ($operation instanceof CollectionOperationInterface) {
            $pages = $this->pageRepository->findAllPublicAvailable();
            $pagesApi = [];
            foreach ($pages as $page) {
                $pagesApi[] = $this->microMapper->map($page, PageApi::class, ["lang"=>$lang]);
            }
            return $pagesApi;
        }

        $urlKey = $uriVariables['urlKey'] ?? null;
        if (!$urlKey) {
            throw new NotFoundHttpException('UrlKey is missing');
        }

        $page = $this->pageRepository->findOneByUrlKey($urlKey);
        if (!$page) {
            throw new NotFoundHttpException(sprintf('Page not found for urlKey: %s', $urlKey));
        }

        return $this->microMapper->map($page, PageApi::class, ["lang"=>$lang]);
    }
}
