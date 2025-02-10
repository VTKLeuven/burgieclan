<?php

namespace App\Validator;

use Doctrine\Common\Collections\Collection;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class UniqueTranslationLanguageValidator extends ConstraintValidator
{
    public function validate($value, Constraint $constraint): void
    {
        if (!$constraint instanceof UniqueTranslationLanguage) {
            throw new UnexpectedTypeException($constraint, UniqueTranslationLanguage::class);
        }

        if (!$value instanceof Collection) {
            return;
        }

        $languages = [];
        foreach ($value as $translation) {
            if (in_array($translation->getLang(), $languages)) {
                $this->context->buildViolation($constraint->message)
                    ->setParameter('{{ lang }}', $translation->getLang())
                    ->addViolation();
                return;
            }
            $languages[] = $translation->getLang();
        }
    }
}
