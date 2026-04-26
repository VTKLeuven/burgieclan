<?php

namespace App\Mapper;

use App\ApiResource\AnnouncementApi;
use App\ApiResource\UserApi;
use App\Entity\Announcement;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Announcement::class, to: AnnouncementApi::class)]
class AnnouncementEntityToApiMapper extends BaseEntityToApiMapper
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {}

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Announcement);

        $dto = new AnnouncementApi();
        $this->mapBaseFields($from, $dto);

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Announcement);
        assert($to instanceof AnnouncementApi);

        $lang = $context['lang'] ?? Announcement::$DEFAULT_LANGUAGE;

        $to->title = $from->getTitle($lang);
        $to->content = $from->getContent($lang);
        $to->priority = $from->isPriority();

        $to->creator = $this->microMapper->map(
            $from->getCreator(),
            UserApi::class,
            [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]
        );

        $to->startTime = $from->getStartTime()->format('Y-m-d H:i:s');
        $to->endTime = $from->getEndTime()->format('Y-m-d H:i:s');

        return $to;
    }
}
