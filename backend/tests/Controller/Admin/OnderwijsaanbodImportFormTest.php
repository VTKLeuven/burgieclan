<?php

namespace App\Tests\Controller\Admin;

use PHPUnit\Framework\TestCase;

/**
 * The import preview holds two independent forms: the structure controls (which re-post to the
 * preview) and the confirm button (which posts to the commit route). Commit is a fresh request that
 * re-reads every option from scratch, so any control the confirm form forgets to replay silently
 * falls back to its default — the import then writes a tree that does not match the preview the
 * admin just approved, and saves those wrong settings onto the Program.
 *
 * That is exactly what happened when "Dissolve to semesters" (semesterFlat[]) was added: the
 * checkbox worked, the preview was correct, and the commit quietly dropped it. Nothing failed
 * loudly. This test is what notices the next time an option is added.
 */
class OnderwijsaanbodImportFormTest extends TestCase
{
    private const TEMPLATE = __DIR__ . '/../../../templates/admin/onderwijsaanbod/preview.html.twig';

    public function testTheConfirmFormReplaysEveryStructureOption(): void
    {
        $optionsForm = $this->formBody('admin_onderwijsaanbod_import_preview');
        $commitForm = $this->formBody('admin_onderwijsaanbod_import_commit');

        $missing = array_diff($this->inputNames($optionsForm), $this->inputNames($commitForm));

        self::assertSame(
            [],
            array_values($missing),
            'the confirm form must re-post every option the structure form can set, or committing '
            . 'silently reverts it to the default',
        );
    }

    /**
     * Guards the specific regression, so the intent survives even if the generic check above is
     * ever loosened.
     */
    public function testTheConfirmFormReplaysSemesterFlat(): void
    {
        self::assertContains(
            'semesterFlat[]',
            $this->inputNames($this->formBody('admin_onderwijsaanbod_import_commit')),
        );
    }

    private function formBody(string $route): string
    {
        $template = file_get_contents(self::TEMPLATE);
        self::assertIsString($template, 'preview template should be readable');

        $start = strpos($template, sprintf("path('%s')", $route));
        self::assertNotFalse($start, sprintf('no form posting to %s', $route));

        $end = strpos($template, '</form>', $start);
        self::assertNotFalse($end, sprintf('form posting to %s is never closed', $route));

        return substr($template, $start, $end - $start);
    }

    /**
     * @return list<string> the name attributes of every input in one form, minus the CSRF token and
     *                      the "configured" marker, which are not user-settable options
     */
    private function inputNames(string $form): array
    {
        preg_match_all('/name="([^"]+)"/', $form, $matches);

        $names = array_values(array_unique(array_diff($matches[1], ['_token', 'configured'])));
        sort($names);

        return $names;
    }
}
