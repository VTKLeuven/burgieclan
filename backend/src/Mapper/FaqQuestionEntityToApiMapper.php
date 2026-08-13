<?php

namespace App\Mapper;

use App\ApiResource\FaqQuestionApi;
use App\Entity\FaqQuestion;
use Symfonycasts\MicroMapper\AsMapper;

#[AsMapper(from: FaqQuestion::class, to: FaqQuestionApi::class)]
class FaqQuestionEntityToApiMapper extends BaseEntityToApiMapper
{
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof FaqQuestion);

        $dto = new FaqQuestionApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof FaqQuestion);
        assert($to instanceof FaqQuestionApi);

        $to->question = $from->getQuestion();
        $to->locale = $from->getLocale();
        $to->status = $from->getStatus();
        $to->type = $from->getType();

        // The author is intentionally not exposed: the only consumer is the submitting user's own
        // POST response, which would just be telling them who they are.

        return $to;
    }
}
