<?php

namespace App\Service\Exchange;

use App\Entity\ExchangeDestination;
use App\Repository\ExchangeDestinationRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * The exchange destinations everyone starts from, copied by hand. First the faculty's own, from
 * its website:
 *
 * - the preferred Erasmus destinations per master, eng.kuleuven.be/en/study/internationalisation/
 *   exchange-erasmus-outsideEU/erasmus_preferred_destinations (as of 21 October 2026);
 * - the partner universities outside Europe, eng.kuleuven.be/studeren/internationalisering/
 *   exchange-erasmus-outsideEU/universitiesoutsideeurope (as of 10 February 2025). Those offer
 *   every programme unless the page names some ('all').
 *
 * Then the ones that were only on the old VTK wiki (its Erasmus categories, last edited in 2023),
 * marked as such: they may no longer be partners, and students can say so.
 *
 * The faculty's lists name countries only; the cities are added here. seed() adds what is missing
 * and leaves destinations that exist alone, so a moderator's edits in the admin survive a rerun.
 */
class ExchangeDestinationCatalog
{
    /** @var list<array{string, string, string, list<string>|'all', ?string}> name, city, country, programmes, website */
    public const DESTINATIONS = [
        ['Aalto University', 'Espoo', 'FI', ['AI', 'ELT', 'WIT'], 'https://www.aalto.fi'],
        ['Åbo Akademi', 'Turku', 'FI', ['CIT'], 'https://www.abo.fi'],
        ['Albert-Ludwigs-Universität Freiburg', 'Freiburg', 'DE', ['AI', 'CW'], 'https://uni-freiburg.de'],
        ['Aristotle University of Thessaloniki', 'Thessaloniki', 'GR', ['ARCH'], 'https://www.auth.gr'],
        ['Chalmers University of Technology', 'Göteborg', 'SE', ['ARCH', 'AI', 'CIT', 'ELT', 'NANO', 'WIT'], 'https://www.chalmers.se'],
        ['Charles University', 'Praag', 'CZ', ['AI', 'WIT'], 'https://cuni.cz'],
        ['EPFL', 'Lausanne', 'CH', ['AI', 'BMT', 'BWK', 'CW', 'ELT', 'ENE', 'MTK', 'MSCE', 'NANO', 'WTK'], 'https://www.epfl.ch'],
        ['ETH Zürich', 'Zürich', 'CH', ['AI', 'BMT', 'CW'], 'https://ethz.ch'],
        ['Grenoble INP', 'Grenoble', 'FR', ['ELT', 'ENE', 'MTK'], 'https://www.grenoble-inp.fr'],
        ['Imperial College London', 'Londen', 'GB', ['ELT'], 'https://www.imperial.ac.uk'],
        ['INSA Lyon', 'Lyon', 'FR', ['WTK'], 'https://www.insa-lyon.fr'],
        ['INSA Strasbourg', 'Straatsburg', 'FR', ['ARCH'], 'https://www.insa-strasbourg.fr'],
        ['Instituto Superior Técnico', 'Lissabon', 'PT', ['ARCH', 'BMT', 'BWK', 'WTK'], 'https://tecnico.ulisboa.pt'],
        ['KTH Royal Institute of Technology', 'Stockholm', 'SE', ['BMT', 'BWK', 'CIT', 'ELT', 'ENE', 'MTK', 'MSCE', 'NANO'], 'https://www.kth.se'],
        ['Lorraine INP', 'Nancy', 'FR', ['CIT'], 'https://www.univ-lorraine.fr/lorraine-inp'],
        ['National Technical University of Athens', 'Athene', 'GR', ['CIT'], 'https://www.ntua.gr'],
        ['NTNU', 'Trondheim', 'NO', ['ARCH', 'AI', 'BWK', 'CIT', 'CW', 'MTK', 'WIT', 'WTK'], 'https://www.ntnu.edu'],
        ['Politecnico di Milano', 'Milaan', 'IT', ['ARCH', 'BMT', 'CIT', 'MTK', 'WTK'], 'https://www.polimi.it'],
        ['Politecnico di Torino', 'Turijn', 'IT', ['ARCH'], 'https://www.polito.it'],
        ['RWTH Aachen', 'Aken', 'DE', ['CIT', 'WTK'], 'https://www.rwth-aachen.de'],
        ['Sapienza Università di Roma', 'Rome', 'IT', ['ARCH', 'MSCE'], 'https://www.uniroma1.it'],
        ['Technical University of Denmark (DTU)', 'Kongens Lyngby', 'DK', ['ARCH', 'BMT', 'BWK', 'CIT', 'ELT', 'MTK', 'MSCE'], 'https://www.dtu.dk'],
        ['Trinity College Dublin', 'Dublin', 'IE', ['BMT'], 'https://www.tcd.ie'],
        ['TU Berlin', 'Berlijn', 'DE', ['ENE'], 'https://www.tu.berlin'],
        ['TU Darmstadt', 'Darmstadt', 'DE', ['WTK'], 'https://www.tu-darmstadt.de'],
        ['TU Delft', 'Delft', 'NL', ['ARCH', 'MSCE', 'NANO'], 'https://www.tudelft.nl'],
        ['TU Dresden', 'Dresden', 'DE', ['NANO'], 'https://tu-dresden.de'],
        ['TU München', 'München', 'DE', ['AI', 'MSCE', 'WIT', 'WTK'], 'https://www.tum.de'],
        ['TU Wien', 'Wenen', 'AT', ['ARCH', 'BWK', 'WTK'], 'https://www.tuwien.at'],
        ['UCLouvain', 'Louvain-la-Neuve', 'BE', ['ARCH', 'BMT'], 'https://uclouvain.be'],
        ['Universidad de Zaragoza', 'Zaragoza', 'ES', ['BMT'], 'https://www.unizar.es'],
        ['Universidad Politécnica de Madrid', 'Madrid', 'ES', ['ARCH'], 'https://www.upm.es'],
        ['Universidade do Porto', 'Porto', 'PT', ['BWK'], 'https://www.up.pt'],
        ['Università degli Studi di Trento', 'Trento', 'IT', ['AI', 'WIT'], 'https://www.unitn.it'],
        ['Universitat Autònoma de Barcelona', 'Barcelona', 'ES', ['AI', 'WIT'], 'https://www.uab.cat'],
        ['Universitat Politècnica de Catalunya (UPC)', 'Barcelona', 'ES', ['BWK', 'ELT', 'ENE'], 'https://www.upc.edu'],
        ['Universitat Rovira i Virgili', 'Tarragona', 'ES', ['AI', 'CW'], 'https://www.urv.cat'],
        ['Université Grenoble Alpes', 'Grenoble', 'FR', ['NANO'], 'https://www.univ-grenoble-alpes.fr'],
        ['University of Chemistry and Technology Prague', 'Praag', 'CZ', ['CIT'], 'https://www.vscht.cz'],

        // Outside Europe.
        ['Polytechnique Montréal', 'Montréal', 'CA', 'all', 'https://www.polymtl.ca'],
        ['National Yang Ming Chiao Tung University', 'Hsinchu', 'TW', ['ELT', 'NANO'], 'https://www.nycu.edu.tw'],
        ['Universidad Nacional de Colombia', 'Bogotá', 'CO', 'all', 'https://unal.edu.co'],
        ['Universidade de São Paulo', 'São Paulo', 'BR', 'all', 'https://www5.usp.br'],
        ['University of Delaware', 'Newark', 'US', ['CIT'], 'https://www.udel.edu'],
        ['Osaka University', 'Osaka', 'JP', 'all', 'https://www.osaka-u.ac.jp'],
        ['Nanyang Technological University', 'Singapore', 'SG', 'all', 'https://www.ntu.edu.sg'],
        ['Tsinghua University', 'Beijing', 'CN', 'all', 'https://www.tsinghua.edu.cn'],
        ['The Chinese University of Hong Kong', 'Hongkong', 'HK', 'all', 'https://www.cuhk.edu.hk'],
        ['Shanghai Jiao Tong University', 'Shanghai', 'CN', 'all', 'https://www.sjtu.edu.cn'],
    ];

    /** @var list<array{string, string, string, list<string>, ?string}> name, city, country, programmes, website */
    public const WIKI_DESTINATIONS = [
        ['City College of New York', 'New York', 'US', ['WTK'], 'https://www.ccny.cuny.edu'],
        ['Columbia University', 'New York', 'US', [], 'https://www.columbia.edu'],
        ['Georgia Institute of Technology', 'Atlanta', 'US', ['WTK'], 'https://www.gatech.edu'],
        ['IQS, Universitat Ramon Llull', 'Barcelona', 'ES', ['CIT'], 'https://www.iqs.edu'],
        ['TU Graz', 'Graz', 'AT', [], 'https://www.tugraz.at'],
        ['Università di Bologna', 'Bologna', 'IT', [], 'https://www.unibo.it'],
        ['University of Illinois Urbana-Champaign', 'Urbana-Champaign', 'US', ['WTK'], 'https://illinois.edu'],
        ['University of Michigan', 'Ann Arbor', 'US', ['WTK'], 'https://umich.edu'],
        ['University of Wisconsin-Madison', 'Madison', 'US', ['WTK'], 'https://www.wisc.edu'],
    ];

    public function __construct(
        private readonly ExchangeDestinationRepository $destinations,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * Adds the destinations that do not exist yet (by name, ignoring case).
     *
     * @return int how many were added
     */
    public function seed(): int
    {
        $added = 0;
        $all = [
            ...array_map(static fn (array $row): array => [...$row, ExchangeDestination::SOURCE_FACULTY], self::DESTINATIONS),
            ...array_map(static fn (array $row): array => [...$row, ExchangeDestination::SOURCE_WIKI], self::WIKI_DESTINATIONS),
        ];
        foreach ($all as [$name, $city, $country, $programs, $website, $source]) {
            if (null !== $this->destinations->findOneByNameInsensitive($name)) {
                continue;
            }

            $this->entityManager->persist(
                (new ExchangeDestination())
                    ->setName($name)
                    ->setCity($city)
                    ->setCountry($country)
                    ->setPrograms('all' === $programs ? [] : $programs)
                    ->setAllPrograms('all' === $programs)
                    ->setWebsite($website)
                    ->setSource($source)
            );
            $added++;
        }

        $this->entityManager->flush();

        return $added;
    }
}
