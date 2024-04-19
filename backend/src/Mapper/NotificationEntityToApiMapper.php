<?php

namespace App\Mapper;

use App\ApiResource\NotificationApi;
use App\Entity\Notification;
use Nette\Utils\DateTime;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: Notification::class, to: NotificationApi::class)]
class NotificationEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof Notification);

        $dto = new NotificationApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof Notification);
        assert($to instanceof NotificationApi);

        $to->title = $from->getTitle();
        $to->content = $from->getContent();

        /*
         * TODO when UserApi is available
        $to->creator = $this->microMapper->map($from->getUser(), UserApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        */

        $to->startTime = $from->getStartTime()->format('Y-m-d H:i:s');
        $to->endTime = $from->getEndTime()->format('Y-m-d H:i:s');
        $to->createdAt = DateTime::createFromInterface($from->getCreateDate());
        $to->updatedAt = DateTime::createFromInterface($from->getUpdateDate());

        return $to;
    }
}
