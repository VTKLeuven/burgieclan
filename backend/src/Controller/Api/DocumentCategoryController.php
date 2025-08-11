<?php

namespace App\Controller\Api;

use App\Entity\DocumentCategory;
use App\Repository\DocumentCategoryRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class DocumentCategoryController extends AbstractController
{
    #[Route('/api/document-category/{id}/tree', name: 'api_document_category_tree', methods: ['GET'])]
    public function getCategoryTree(DocumentCategory $category, DocumentCategoryRepository $repository): JsonResponse
    {
        $tree = $this->buildCategoryTree($category, $repository);
        return new JsonResponse($tree);
    }

    private function buildCategoryTree(DocumentCategory $category, DocumentCategoryRepository $repository): array
    {
        $subcategories = $repository->findBy(['parent' => $category]);

        $tree = [
            'id' => $category->getId(),
            'name' => $category->getName(),
            'documents' => array_map(fn($document) => [
                'id' => $document->getId(),
                'name' => $document->getName(),
            ], $category->getDocuments()->toArray()),
            'subcategories' => array_map(fn($subcategory)
            => $this->buildCategoryTree($subcategory, $repository), $subcategories),
        ];

        return $tree;
    }
}
