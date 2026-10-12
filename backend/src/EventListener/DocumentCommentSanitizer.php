<?php

namespace App\EventListener;

use App\Entity\DocumentComment;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerInterface;

/**
 * Document comments are HTML from the editor and the frontend renders them as HTML, so whatever
 * is written goes through the `document_comment` sanitizer (config/packages/html_sanitizer.yaml)
 * first: anyone can post a comment straight to the API, bypassing the editor.
 *
 * A Doctrine listener rather than the API mapper, so that the admin and fixtures are covered too.
 * Course and exam question comments are plain text and rendered as text; they are left alone.
 *
 * Comments stored before this listener existed: app:document-comments:sanitize.
 */
#[AsEntityListener(event: Events::prePersist, method: 'prePersist', entity: DocumentComment::class)]
#[AsEntityListener(event: Events::preUpdate, method: 'preUpdate', entity: DocumentComment::class)]
class DocumentCommentSanitizer
{
    public function __construct(
        #[Target('document_comment')]
        private readonly HtmlSanitizerInterface $sanitizer,
    ) {}

    public function sanitize(string $content): string
    {
        return $this->sanitizer->sanitize($content);
    }

    public function prePersist(DocumentComment $comment): void
    {
        $comment->setContent($this->sanitize($comment->getContent()));
    }

    public function preUpdate(DocumentComment $comment, PreUpdateEventArgs $args): void
    {
        if (!$args->hasChangedField('content')) {
            return;
        }

        // The change set is what gets written; the entity itself is what the API response is read from
        $content = $this->sanitize($comment->getContent());
        $args->setNewValue('content', $content);
        $comment->setContent($content);
    }
}
