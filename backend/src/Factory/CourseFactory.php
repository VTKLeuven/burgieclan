<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace App\Factory;

use App\Entity\Course;
use App\Repository\CourseRepository;
use Doctrine\ORM\EntityRepository;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;
use Zenstruck\Foundry\Persistence\Proxy;
use Zenstruck\Foundry\Persistence\ProxyRepositoryDecorator;

/**
 * @extends PersistentProxyObjectFactory<Course>
 *
 * @method        Course|Proxy                              create(array|callable $attributes = [])
 * @method static Course|Proxy                              createOne(array $attributes = [])
 * @method static Course|Proxy                              find(object|array|mixed $criteria)
 * @method static Course|Proxy                              findOrCreate(array $attributes)
 * @method static Course|Proxy                              first(string $sortedField = 'id')
 * @method static Course|Proxy                              last(string $sortedField = 'id')
 * @method static Course|Proxy                              random(array $attributes = [])
 * @method static Course|Proxy                              randomOrCreate(array $attributes = [])
 * @method static CourseRepository|ProxyRepositoryDecorator repository()
 * @method static Course[]|Proxy[]                          all()
 * @method static Course[]|Proxy[]                          createMany(int $number, array|callable $attributes = [])
 * @method static Course[]|Proxy[]                          createSequence(iterable|callable $sequence)
 * @method static Course[]|Proxy[]                          findBy(array $attributes)
 * @method static Course[]|Proxy[]                          randomRange(int $min, int $max, array $attributes = [])
 * @method static Course[]|Proxy[]                          randomSet(int $number, array $attributes = [])
 *
 * @phpstan-method        Course&Proxy<Course> create(array|callable $attributes = [])
 * @phpstan-method static Course&Proxy<Course> createOne(array $attributes = [])
 * @phpstan-method static Course&Proxy<Course> find(object|array|mixed $criteria)
 * @phpstan-method static Course&Proxy<Course> findOrCreate(array $attributes)
 * @phpstan-method static Course&Proxy<Course> first(string $sortedField = 'id')
 * @phpstan-method static Course&Proxy<Course> last(string $sortedField = 'id')
 * @phpstan-method static Course&Proxy<Course> random(array $attributes = [])
 * @phpstan-method static Course&Proxy<Course> randomOrCreate(array $attributes = [])
 * @phpstan-method static ProxyRepositoryDecorator<Course, EntityRepository> repository()
 * @phpstan-method static list<Course&Proxy<Course>> all()
 * @phpstan-method static list<Course&Proxy<Course>> createMany(int $number, array|callable $attributes = [])
 * @phpstan-method static list<Course&Proxy<Course>> createSequence(iterable|callable $sequence)
 * @phpstan-method static list<Course&Proxy<Course>> findBy(array $attributes)
 * @phpstan-method static list<Course&Proxy<Course>> randomRange(int $min, int $max, array $attributes = [])
 * @phpstan-method static list<Course&Proxy<Course>> randomSet(int $number, array $attributes = [])
 */
final class CourseFactory extends PersistentProxyObjectFactory
{
    private const COURSES = [
        'H00S2A' => 'Sensoren en meetsystemen',
        'H05F7A' => 'Measurement Systems',
        'H03F2A' => 'Meten van fysische grootheden',
        'H04X7A' => 'Sensors and Measurements Systems',
        'H9X39A' => 'Aandrijfsystemen',
        'H9X30A' => 'Electrical Drives',
        'H00P9A' => 'Elektrische aandrijvingen; aanvullingen elektrische machines, m.i.v. gebruiksaspecten',
        'H04A4B' => 'Electrical Drives',
        'H04A4A' => 'Electrical Drives; Advanced Topics in Electrical Machines, including Implementation Aspects',
        'H0T48A' => 'Drive Systems',
        'H02U6A' => 'Polymeercomposieten',
        'H00E4A' => 'Polymer Composites A&B',
        'H01A2B' => 'Analyse, deel 2',
        'H9X37A' => 'Mechatronische aandrijfsystemen',
        'H0T49A' => 'Mechatronic Drive Systems',
        'H04D8A' => 'Expressievaardigheid in de technische bedrijfsomgeving',
        'H01M5A' => 'Halfgeleidercomponenten',
        'H0S07A' => 'Thermische systemen',
        'H9X52A' => 'Thermal Systems: Basic Aspects',
        'H0H00A' => 'Thermal Systems',
        'H0H53A' => 'Technologie van bouwmaterialen',
        'H01G5A' => 'Toegepaste discrete algebra',
        'C00M0A' => 'Recht van de intellectuele eigendom',
        'I0N57C' => 'Statistische proefopzet',
        'I0N57D' => 'Statistische proefopzet',
        'I0N57B' => 'Proeftechniek',
        'G0B68A' => 'Experimental Design',
        'H03I4B' => 'Human System Physiology',
        'H01B2B' => 'Algemene natuurkunde',
        'H01B2A' => 'Algemene natuurkunde',
        'H01D0A' => 'Inleiding tot de materiaalkunde',
        'H01S6B' => 'Westerse architectuurgeschiedenis: Middeleeuwen tot Nieuwste Tijd',
        'H0M72A' => 'Elektriciteit, magnetisme en golven',
        'H07S3A' => 'Elasticiteit en plasticiteit',
        'H03Y1A' => 'Theory of Elasticity and Plasticity',
        'H01G7A' => 'Toegepaste mechanica, deel 3',
        'H00N6B' => 'Total Quality Management',
        'H00N6A' => 'Total Quality Management',
        'H01L4A' => 'Digitale en analoge communicatie',
        'H01Z2A' => 'Elektrische netwerken',
        'H03I5A' => 'Medical Equipment and Regulatory Affairs',
        'D0I69A' => 'ICT Service Management',
        'H01K7A' => 'Scheidingsprocessen',
        'H07Z7A' => 'Fundamentals for Computer Science',
        'H04H0B' => 'Fundamenten voor de computerwetenschappen',
        'H01T1A' => 'Lineaire algebra'
    ];

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     */
    public function __construct()
    {
        parent::__construct();
    }

    public static function class(): string
    {
        return Course::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     */
    protected function defaults(): array|callable
    {
        $code = self::faker()->randomKey(self::COURSES);

        $professors = array();
        for ($i = 0; $i < self::faker()->numberBetween(1, 3); $i++) {
            $professors[] = self::faker()->numerify('u0######');
        }

        if (self::faker()->numberBetween(1, 20) == 1) {
            // 5% chance of having both semesters
            $semesters = array('Semester 1', 'Semester 2');
        } else {
            $semesters = array('Semester ' . self::faker()->numberBetween(1, 2));
        }

        return [
            'code' => self::faker()->regexify('H[A-Z0-9]{5}'),
            'name' => self::COURSES[$code],
            'professors' => $professors,
            'semesters' => $semesters,
            'credits' => self::faker()->numberBetween(1, 12),
            'modules' => [ModuleFactory::randomOrCreate(), ModuleFactory::randomOrCreate()],
            'language' => self::faker()->randomElement(['nl', 'en'])
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Course $course): void {})
        ;
    }
}
