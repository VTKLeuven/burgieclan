<?php

namespace App\Controller\Admin;

use App\Entity\Document;
use EasyCorp\Bundle\EasyAdminBundle\Config\Asset;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Form\Type\FileUploadType;

class DocumentCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Document::class;
    }

    public function createEntity(string $entityFqcn)
    {
        return new Document($this->getUser());
    }

//    COMMENTED BECAUSE NICE TO HAVE FOR TESTING
//    public function configureActions(Actions $actions): Actions
//    {
//        return $actions
//        ->disable(Action::NEW);
//    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('name');
        yield DateTimeField::new('createDate')
        ->hideOnForm();
        yield DateTimeField::new('updateDate')
        ->hideOnForm();
        yield AssociationField::new('course')
            ->autocomplete();
        yield AssociationField::new('category')
        ->autocomplete();
        yield BooleanField::new('under_review')
            ->setLabel('Published')
            ->renderAsSwitch(false);
        yield TextField::new('file_name')
            ->setLabel('File')
            ->setFormType(FileUploadType::class)
            ->setFormTypeOptions([
                'help' => 'Max upload size is '. ini_get('upload_max_filesize') . '.',
                'upload_dir' => 'public/uploads/documents',
                'upload_filename' => '[slug]-[timestamp].[extension]',
            ])
            ->addJsFiles(
                Asset::fromEasyAdminAssetPackage('field-image.js'),
                Asset::fromEasyAdminAssetPackage('field-file-upload.js')
            );
    }
}
