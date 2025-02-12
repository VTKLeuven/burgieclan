<?php

namespace App\Validator;

use Attribute;
use Symfony\Component\Validator\Constraint;

#[Attribute]
class UniqueTranslationLanguage extends Constraint
{
    public string $message = 'The language "{{ lang }}" is already used for another translation.';
}
