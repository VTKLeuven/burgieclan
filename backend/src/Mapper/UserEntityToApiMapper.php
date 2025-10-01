<?php

namespace App\Mapper;

use App\ApiResource\CourseApi;
use App\ApiResource\CourseCommentVoteApi;
use App\ApiResource\DocumentApi;
use App\ApiResource\DocumentCommentVoteApi;
use App\ApiResource\DocumentVoteApi;
use App\ApiResource\ModuleApi;
use App\ApiResource\ProgramApi;
use App\ApiResource\UserApi;
use App\Entity\Course;
use App\Entity\CourseCommentVote;
use App\Entity\Document;
use App\Entity\DocumentCommentVote;
use App\Entity\DocumentVote;
use App\Entity\Module;
use App\Entity\Program;
use App\Entity\User;
use Symfonycasts\MicroMapper\AsMapper;
use Symfonycasts\MicroMapper\MapperInterface;
use Symfonycasts\MicroMapper\MicroMapperInterface;

#[AsMapper(from: User::class, to: UserApi::class)]
class UserEntityToApiMapper implements MapperInterface
{
    public function __construct(
        private readonly MicroMapperInterface      $microMapper,
    ) {
    }

    public function load(object $from, string $toClass, array $context): object
    {
        assert($from instanceof User);

        $dto = new UserApi();
        $dto->id = $from->getId();

        return $dto;
    }

    public function populate(object $from, object $to, array $context): object
    {
        assert($from instanceof User);
        assert($to instanceof UserApi);

        $to->fullName = $from->getFullName();
        $to->username = $from->getUsername();
        $to->email = $from->getEmail();
        $to->favoriteCourses = array_map(function (Course $course) {
            return $this->microMapper->map($course, CourseApi::class, [
                MicroMapperInterface::MAX_DEPTH => 1,
            ]);
        }, $from->getFavoriteCourses()->getValues());
        $to->favoriteModules = array_map(function (Module $module) {
            return $this->microMapper->map($module, ModuleApi::class, [
                MicroMapperInterface::MAX_DEPTH => 1,
            ]);
        }, $from->getFavoriteModules()->getValues());
        $to->favoritePrograms = array_map(function (Program $program) {
            return $this->microMapper->map($program, ProgramApi::class, [
                MicroMapperInterface::MAX_DEPTH => 1,
            ]);
        }, $from->getFavoritePrograms()->getValues());
        $to->favoriteDocuments = array_map(function (Document $document) {
            return $this->microMapper->map($document, DocumentApi::class, [
                MicroMapperInterface::MAX_DEPTH => 1,
            ]);
        }, $from->getFavoriteDocuments()->getValues());
        $to->defaultAnonymous = $from->isDefaultAnonymous();
        $to->documentVotes = array_map(function (DocumentVote $documentVote) {
            return $this->microMapper->map($documentVote, DocumentVoteApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getDocumentVotes()->getValues());
        $to->documentCommentVotes = array_map(function (DocumentCommentVote $documentCommentVote) {
            return $this->microMapper->map($documentCommentVote, DocumentCommentVoteApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getDocumentCommentVotes()->getValues());
        $to->courseCommentVotes = array_map(function (CourseCommentVote $courseCommentVote) {
            return $this->microMapper->map($courseCommentVote, CourseCommentVoteApi::class, [
                MicroMapperInterface::MAX_DEPTH => 0,
            ]);
        }, $from->getCourseCommentVotes()->getValues());

        return $to;
    }
}
