<?php

namespace App\Tests\Constants;

use App\Constants\PreviewableFile;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PreviewableFileTest extends TestCase
{
    /**
     * @return array<string, array{string, string|null}>
     */
    public static function kindProvider(): array
    {
        return [
            'pdf' => ['thesis.pdf', PreviewableFile::KIND_PDF],
            'png' => ['scan.png', PreviewableFile::KIND_IMAGE],
            'jpeg' => ['scan.JPEG', PreviewableFile::KIND_IMAGE],
            // Reviewing source means reading it, so these render rather than download.
            'matlab source' => ['oefening.m', PreviewableFile::KIND_TEXT],
            'python source' => ['solver.py', PreviewableFile::KIND_TEXT],
            'plain text' => ['notes.txt', PreviewableFile::KIND_TEXT],
            // Matlab binaries that sit next to .m in the upload allowlist.
            'matlab data' => ['run.mat', null],
            'matlab p-code' => ['secret.p', null],
            'matlab live script' => ['demo.mlx', null],
            'zip' => ['thesis.zip', null],
            'word' => ['summary.docx', null],
            'cad part' => ['bracket.sldprt', null],
            // Script-capable: never rendered inline, see the class docblock.
            'svg' => ['diagram.svg', null],
            'html' => ['page.html', null],
            'no extension' => ['README', null],
        ];
    }

    #[DataProvider('kindProvider')]
    public function testPreviewKind(string $filename, ?string $expected): void
    {
        self::assertSame($expected, PreviewableFile::previewKind($filename));
    }

    #[DataProvider('kindProvider')]
    public function testOnlyDrawableFilesGetAContentType(string $filename, ?string $expected): void
    {
        self::assertSame(
            null !== $expected,
            null !== PreviewableFile::contentTypeFor($filename),
            'contentTypeFor() and previewKind() must agree, or the controller and the templates disagree.'
        );
        self::assertSame(null !== $expected, PreviewableFile::isPreviewable($filename));
    }

    public function testTextTypesCarryACharsetSoAccentsSurvive(): void
    {
        self::assertSame('text/plain; charset=utf-8', PreviewableFile::contentTypeFor('oefening.m'));
    }

    public function testExtensionMatchingIsCaseInsensitive(): void
    {
        self::assertSame(PreviewableFile::KIND_PDF, PreviewableFile::previewKind('THESIS.PDF'));
        self::assertSame(PreviewableFile::KIND_TEXT, PreviewableFile::previewKind('Oefening.M'));
    }
}
