<?php

namespace App\Utils;

/**
 * A short piece of a longer text around the first place a search matched, for a search result.
 */
final class SearchSnippet
{
    /** How much text to show before the match, so it reads in context. */
    private const LEAD = 40;

    /**
     * Up to $length characters of $text, starting a little before the earliest of $query's terms
     * (case-insensitive), with "…" where text was cut off. From the start when nothing matches.
     */
    public static function around(string $text, string $query, int $length = 160): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', $text));
        if (mb_strlen($text) <= $length) {
            return $text;
        }

        $first = null;
        foreach (preg_split('/\s+/u', mb_strtolower(trim($query))) ?: [] as $term) {
            $position = '' === $term ? false : mb_stripos($text, $term);
            if (false !== $position && (null === $first || $position < $first)) {
                $first = $position;
            }
        }

        $start = max(0, min((int) $first - self::LEAD, mb_strlen($text) - $length));
        if ($start > 0) {
            // Start at a word, not halfway through one.
            $space = mb_strpos($text, ' ', $start);
            if (false !== $space && $space - $start < 15) {
                $start = $space + 1;
            }
        }

        $snippet = mb_substr($text, $start, $length);

        return ($start > 0 ? '…' : '') . trim($snippet) . ($start + $length < mb_strlen($text) ? '…' : '');
    }
}
