<?php

namespace App\Validator;

use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Doctrine\Common\Collections\Collection;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use App\Entity\PageTranslation;

class HasDefaultTranslationValidator extends ConstraintValidator
{
    public function validate($value, Constraint $constraint): void
    {
        if (!$constraint instanceof HasDefaultTranslation) {
            throw new UnexpectedTypeException($constraint, HasDefaultTranslation::class);
        }

        if (!$value instanceof Collection) {
            return;
        }

        $defaultLanguage = PageTranslation::$DEFAULT_LANGUAGE;
        $hasDefaultTranslation = false;
        foreach ($value as $translation) {
            if ($translation->getLang() === $defaultLanguage) {
                $hasDefaultTranslation = true;
                break;
            }
        }

        if (!$hasDefaultTranslation) {
            $this->context->buildViolation($constraint->message)
                ->addViolation();
        }
    }
}
