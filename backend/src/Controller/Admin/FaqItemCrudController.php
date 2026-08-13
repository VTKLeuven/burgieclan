<?php

namespace App\Controller\Admin;

use App\Entity\FaqItem;
use App\Entity\FaqQuestion;
use App\Entity\User;
use App\Repository\FaqQuestionRepository;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted(User::ROLE_ADMIN)]
class FaqItemCrudController extends AbstractCrudController
{
    public function __construct(private readonly FaqQuestionRepository $faqQuestionRepository) {}

    public static function getEntityFqcn(): string
    {
        return FaqItem::class;
    }

    /**
     * Prefills the question when an admin got here through "Promote" in the FAQ Questions inbox,
     * so the wording a user actually asked in carries over instead of being retyped.
     *
     * @see FaqQuestionCrudController::promote()
     */
    public function createEntity(string $entityFqcn): object
    {
        $faqItem = new FaqItem();

        $questionId = $this->getContext()?->getRequest()->query->get(FaqQuestionCrudController::PROMOTE_PARAM);
        if (!$questionId) {
            return $faqItem;
        }

        $question = $this->faqQuestionRepository->find($questionId);
        if (!$question instanceof FaqQuestion) {
            return $faqItem;
        }

        // Dutch is the required field and the fallback the frontend reads, so an English question
        // fills the English field and leaves the Dutch one for the admin to write.
        if ($question->getLocale() === 'en') {
            $faqItem->setQuestionEn($question->getQuestion());
        } else {
            $faqItem->setQuestionNl($question->getQuestion());
        }

        return $faqItem;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setDefaultSort(['position' => 'ASC'])
            ->setEntityLabelInSingular('FAQ Item')
            ->setEntityLabelInPlural('FAQ Items');
    }

    public function configureFields(string $pageName): iterable
    {
        yield BooleanField::new('published')
            ->renderAsSwitch(false)
            ->setLabel('Published');

        yield IntegerField::new('position')
            ->setLabel('Position')
            ->setHelp('Lower numbers appear first');

        yield TextField::new('question_nl')
            ->setRequired(true)
            ->setLabel('Question (Dutch)');
        yield TextEditorField::new('answer_nl')
            ->setLabel('Answer (Dutch)')
            ->setTemplatePath('admin/text_editor.html.twig');

        yield FormField::addFieldset('English Content')->setIcon('fa fa-language')
            ->collapsible();
        yield TextField::new('question_en')
            ->setLabel('Question (English)');
        yield TextEditorField::new('answer_en')
            ->setLabel('Answer (English)')
            ->setTemplatePath('admin/text_editor.html.twig');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add('question_nl')
            ->add('published')
            ->add('position');
    }
}
