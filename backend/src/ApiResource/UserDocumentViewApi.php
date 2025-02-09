<?php

namespace App\ApiResource;

use ApiPlatform\Doctrine\Orm\State\Options;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Entity\UserDocumentView;
use App\State\UserDocumentViewProvider;
use DateTimeInterface;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'User document views',
    operations: [
        new GetCollection(
            uriTemplate: 'document_views',
            normalizationContext: ['groups' => ['user:document_views']],
            provider: UserDocumentViewProvider::class,
        ),
    ],
    stateOptions: new Options(entityClass: UserDocumentView::class)
)]
class UserDocumentViewApi
{
    #[ApiProperty(readable: false, writable: false, identifier: true)]
    public ?int $id = null;

    #[Assert\NotNull]
    #[ApiProperty(writable: true)]
    #[Groups(['user:document_views', 'user:document_views:batch'])]
    public DocumentApi $document;

    #[Assert\NotNull]
    #[Assert\Type(\DateTimeInterface::class)]
    #[ApiProperty(writable: true)]
    #[Groups(['user:document_views', 'user:document_views:batch'])]
    public DateTimeInterface $lastViewed;
}
