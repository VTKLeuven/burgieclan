<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\Property\Factory\PropertyMetadataFactoryInterface;
use App\Entity\Notification;
use RuntimeException;
use Symfony\Component\DependencyInjection\Attribute\AsDecorator;

#[AsDecorator('api_platform.json_schema.metadata.property.metadata_factory.schema')]
class SchemaPropertyMetadataFactoryDecorator implements PropertyMetadataFactoryInterface
{
    private static array $examples = [
        CommentCategoryApi::class => '/api/comment_categories/1',
        CourseApi::class => '/api/courses/1',
        CourseCommentApi::class => '/api/course_comments/1',
        DocumentApi::class => '/api/documents/1',
        DocumentCategoryApi::class => '/api/document_categories/1',
        DocumentCommentApi::class => '/api/document_comments/1',
        ModuleApi::class => '/api/modules/1',
        Notification::class => '/api/notifications/1',
        PageApi::class => '/api/pages/1',
        ProgramApi::class => '/api/programs/1',
        UserApi::class => '/api/users/1',
    ];

    public function __construct(
        private readonly PropertyMetadataFactoryInterface $decorated,
    ) {
    }

    public function create(string $resourceClass, string $property, array $options = []): ApiProperty
    {
        $decorated = $this->decorated->create($resourceClass, $property, $options);
        $schema = $decorated->getSchema();

        if (array_key_exists('format', $schema) && 'iri-reference' === $schema['format']) {
            $class = $decorated->getBuiltinTypes()[0]->getClassName();

            if (!array_key_exists($class, self::$examples)) {
                throw new RuntimeException(
                    sprintf('No example for class %s. Provide an example in %s', $class, __CLASS__)
                );
            }

            $schema['example'] = self::$examples[$class];
            return $decorated->withSchema($schema);
        }

        return $decorated;
    }
}
