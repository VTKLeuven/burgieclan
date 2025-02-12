<?php

namespace App\Validator;

use App\Entity\PageTranslation;
use Attribute;
use Symfony\Component\Validator\Constraint;

#[Attribute]
class HasDefaultTranslation extends Constraint
{
    public string $message;

    public function __construct()
    {
        parent::__construct();
        $lang = PageTranslation::$AVAILABLE_LANGUAGES[PageTranslation::$DEFAULT_LANGUAGE];
        $this->message = 'A page must have at least one translation with language "' . $lang . '".';
    }
}
