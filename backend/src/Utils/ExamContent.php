<?php

namespace App\Utils;

/**
 * Reads the stored JSON copy of an exam reconstruction (CollabDocument content and fields).
 *
 * The editor schema lives in the frontend (components/exam); this only knows the few things the
 * backend needs: questions are top-level `examQuestion` nodes, each listing in `attrs.sittings`
 * the ids of the days it came up on, and the days themselves are the `sittings` field.
 */
final class ExamContent
{
    public const QUESTION_NODE = 'examQuestion';

    /**
     * @param array<string, mixed>|null $content TipTap JSON
     */
    public static function countQuestions(?array $content): int
    {
        return count(self::questionNodes($content));
    }

    /**
     * The days the exam was given on, e.g. [["id" => "…", "label" => "ma 20 jan"]]. Malformed
     * entries are skipped: this is a copy written by browsers, so it is never trusted.
     *
     * @param array<string, mixed>|null $fields
     *
     * @return list<array{id: string, label: string}>
     */
    public static function sittings(?array $fields): array
    {
        $sittings = [];
        foreach ((array) ($fields['sittings'] ?? []) as $sitting) {
            if (is_array($sitting) && is_string($sitting['id'] ?? null) && is_string($sitting['label'] ?? null)) {
                $sittings[] = ['id' => $sitting['id'], 'label' => $sitting['label']];
            }
        }

        return $sittings;
    }

    /**
     * Each question as plain text, shortened to $maxLength characters, for a quick look in the
     * admin (e.g. to compare revisions). Math shows as its LaTeX source between dollar signs.
     *
     * @param array<string, mixed>|null $content
     *
     * @return list<string>
     */
    public static function questionTexts(?array $content, int $maxLength = 160): array
    {
        return array_map(
            static function (array $question) use ($maxLength): string {
                $text = self::plainText($question);

                return mb_strlen($text) > $maxLength ? mb_substr($text, 0, $maxLength - 1) . '…' : $text;
            },
            self::questionNodes($content)
        );
    }

    /**
     * Each question in order with its permanent id (`uid`, null when it has none), its whole text
     * and the ids of the days it is marked with.
     *
     * @param array<string, mixed>|null $content
     *
     * @return list<array{uid: string|null, text: string, sittings: list<string>}>
     */
    public static function questions(?array $content): array
    {
        return array_map(
            static function (array $question): array {
                $uid = $question['attrs']['id'] ?? null;
                $sittings = $question['attrs']['sittings'] ?? [];

                return [
                    'uid' => is_string($uid) && '' !== $uid ? $uid : null,
                    'text' => self::plainText($question),
                    'sittings' => is_array($sittings)
                        ? array_values(array_unique(array_filter($sittings, 'is_string')))
                        : [],
                ];
            },
            self::questionNodes($content)
        );
    }

    /**
     * @param array<string, mixed>|null $content
     *
     * @return list<array<string, mixed>>
     */
    private static function questionNodes(?array $content): array
    {
        $questions = [];
        foreach ((array) ($content['content'] ?? []) as $node) {
            if (is_array($node) && self::QUESTION_NODE === ($node['type'] ?? null)) {
                $questions[] = $node;
            }
        }

        return $questions;
    }

    /**
     * @param array<mixed> $node
     */
    private static function plainText(array $node): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', self::text($node)));
    }

    /**
     * @param array<mixed> $node
     */
    private static function text(array $node): string
    {
        $type = $node['type'] ?? null;
        $latex = $node['attrs']['latex'] ?? null;

        if ('text' === $type) {
            return is_string($node['text'] ?? null) ? $node['text'] : '';
        }
        if (('inlineMath' === $type || 'blockMath' === $type) && is_string($latex)) {
            return ' $' . $latex . '$ ';
        }

        $parts = [];
        foreach ((array) ($node['content'] ?? []) as $child) {
            if (is_array($child)) {
                $parts[] = self::text($child);
            }
        }

        // Text inside one paragraph joins up as it is; between blocks goes a space, so the words
        // of two paragraphs or list items do not run together.
        $textblock = in_array($type, ['paragraph', 'heading', 'codeBlock'], true);

        return implode($textblock ? '' : ' ', $parts);
    }
}
