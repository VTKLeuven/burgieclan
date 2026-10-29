<?php

namespace App\ApiResource;

use App\Constants\SerializationGroups;
use Symfony\Component\Serializer\Attribute\Groups;

/**
 * One question of an exam reconstruction in the search results (SearchApi::$examQuestions): a
 * piece of its text, and what the page needs to link to it at
 * /course/{course}/exams/{examId}#q-{uid}.
 */
class ExamQuestionSearchResult
{
    /** The question's permanent id, for the #q-{uid} anchor on the exam page. */
    #[Groups(SerializationGroups::SEARCH)]
    public string $uid = '';

    /** A short piece of the question around what matched, as plain text. */
    #[Groups(SerializationGroups::SEARCH)]
    public string $snippet = '';

    #[Groups(SerializationGroups::SEARCH)]
    public int $examId = 0;

    /** E.g. "2025 - 2026". */
    #[Groups(SerializationGroups::SEARCH)]
    public string $academicYear = '';

    /** "january", "june" or "august". */
    #[Groups(SerializationGroups::SEARCH)]
    public string $period = '';

    #[Groups(SerializationGroups::SEARCH)]
    public ?CourseApi $course = null;
}
