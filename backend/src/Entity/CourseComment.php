<?php

namespace App\Entity;

use App\Repository\CourseCommentRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CourseCommentRepository::class)]
class CourseComment extends AbstractComment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'courseComments')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Course $course = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?CommentCategory $category = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCourse(): ?Course
    {
        return $this->course;
    }

    public function setCourse(?Course $course): self
    {
        $this->course = $course;

        return $this;
    }

    public function getCategory(): ?CommentCategory
    {
        return $this->category;
    }

    public function setCategory(?CommentCategory $category): self
    {
        $this->category = $category;

        return $this;
    }
}
