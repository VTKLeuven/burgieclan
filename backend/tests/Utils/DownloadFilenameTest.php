<?php

namespace App\Tests\Utils;

use App\Entity\Document;
use App\Entity\User;
use App\Utils\DownloadFilename;
use PHPUnit\Framework\TestCase;

class DownloadFilenameTest extends TestCase
{
    private function document(string $name, ?string $storedFileName): Document
    {
        $document = new Document($this->createStub(User::class));
        $document->setName($name);
        $document->setFileName($storedFileName);

        return $document;
    }

    public function testDropsTheUniqidTheNamerAppendedOnUpload(): void
    {
        $document = $this->document(
            'Oefenzitting 4 2020',
            'oefenzitting4-2020-6a641a9a023cf688284941.pdf'
        );

        $this->assertSame('Oefenzitting 4 2020.pdf', DownloadFilename::forDocument($document));
    }

    public function testDropsAUniqidPrefixLeftByTheBulkUploader(): void
    {
        $document = $this->document(
            'Oefenzitting 4 2020',
            '6a641a964257e-oefenzitting4-2020-6a641a9a023cf688284941.pdf'
        );

        $this->assertSame('Oefenzitting 4 2020.pdf', DownloadFilename::forDocument($document));
    }

    public function testKeepsAccents(): void
    {
        $document = $this->document('Résumé Analyse I', 'resume-analyse-i-6a641a9a023cf6.pdf');

        $this->assertSame('Résumé Analyse I.pdf', DownloadFilename::forDocument($document));
    }

    public function testDoesNotDoubleTheExtensionWhenTheNameAlreadyCarriesIt(): void
    {
        $document = $this->document('Formularium.pdf', 'formularium-6a641a9a023cf6.pdf');

        $this->assertSame('Formularium.pdf', DownloadFilename::forDocument($document));
    }

    public function testStripsPathSeparatorsAndHeaderBreakingCharacters(): void
    {
        $document = $this->document('../../etc/"passwd"', 'notes-6a641a9a023cf6.txt');

        $this->assertSame('etc-passwd.txt', DownloadFilename::forDocument($document));
    }

    public function testFallsBackToTheStoredNameWhenNothingUsableIsLeft(): void
    {
        $document = $this->document('..', 'notes-6a641a9a023cf6.txt');

        $this->assertSame('notes-6a641a9a023cf6.txt', DownloadFilename::forDocument($document));
    }

    public function testKeepsExtensionlessFilesExtensionless(): void
    {
        $document = $this->document('Readme', 'readme-6a641a9a023cf6');

        $this->assertSame('Readme', DownloadFilename::forDocument($document));
    }

    public function testTruncatesNamesThatWouldOverrunTheFilesystemLimit(): void
    {
        $document = $this->document(str_repeat('a', 300), 'long-6a641a9a023cf6.pdf');

        $result = DownloadFilename::forDocument($document);

        $this->assertLessThanOrEqual(255, strlen($result));
        $this->assertStringEndsWith('.pdf', $result);
    }
}
