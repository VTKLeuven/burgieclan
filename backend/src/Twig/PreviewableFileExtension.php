<?php

namespace App\Twig;

use App\Constants\PreviewableFile;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Exposes {@see PreviewableFile} to the admin templates, so the list of previewable
 * extensions is not spelled out a second time in Twig.
 */
class PreviewableFileExtension extends AbstractExtension
{
    /**
     * @return TwigFunction[]
     */
    public function getFunctions(): array
    {
        return [
            new TwigFunction('is_previewable_pdf', [$this, 'isPdf']),
            new TwigFunction('is_previewable_image', [$this, 'isImage']),
            new TwigFunction('is_previewable', [$this, 'isPreviewable']),
        ];
    }

    public function isPdf(?string $filename): bool
    {
        return null !== $filename && PreviewableFile::isPdf($filename);
    }

    public function isImage(?string $filename): bool
    {
        return null !== $filename && PreviewableFile::isImage($filename);
    }

    public function isPreviewable(?string $filename): bool
    {
        return null !== $filename && PreviewableFile::isPreviewable($filename);
    }
}
