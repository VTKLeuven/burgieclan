<?php

namespace App\Mapper;

use App\ApiResource\ProfessorApi;
use App\Entity\Professor;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;

#[AsMapper(from: ProfessorApi::class, to: Professor::class)]
class ProfessorApiToEntityMapper implements MapperInterface
{
    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof ProfessorApi);

        return $context['object_to_populate'] ?? new Professor();
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof ProfessorApi);
        assert($to instanceof Professor);

        $to->setUNumber($from->uNumber);
        $to->setName($from->name);
        $to->setEmail($from->email);
        $to->setPictureUrl($from->pictureUrl);
        $to->setDepartment($from->department);
        $to->setTitle($from->title);

        return $to;
    }
}