<?php

namespace App\Tests\OauthProvider;

use App\OauthProvider\FluxusResourceOwner;
use PHPUnit\Framework\TestCase;

class FluxusResourceOwnerTest extends TestCase
{
    public function testReadsIdentityClaims(): void
    {
        $owner = new FluxusResourceOwner(
            [
            'sub' => 'user-123',
            'email' => 'jasper.vanelsacker@student.kuleuven.be',
            'name' => 'Jasper Van Elsacker',
            'picture' => 'https://vtk.be/photo.png',
            ]
        );

        $this->assertSame('user-123', $owner->getId());
        $this->assertSame('jasper.vanelsacker@student.kuleuven.be', $owner->getEmail());
        $this->assertSame('Jasper Van Elsacker', $owner->getFullName());
        $this->assertSame('https://vtk.be/photo.png', $owner->getPicture());
    }

    public function testDistinguishesAbsentFromEmptyPermissions(): void
    {
        $absent = new FluxusResourceOwner(['sub' => 'user-123']);
        $this->assertFalse($absent->hasPermissionsClaim());
        $this->assertSame([], $absent->getPermissions());

        $empty = new FluxusResourceOwner(['sub' => 'user-123', 'permissions' => []]);
        $this->assertTrue($empty->hasPermissionsClaim());
        $this->assertSame([], $empty->getPermissions());
    }

    public function testReadsPrefixedStudyClaims(): void
    {
        $owner = new FluxusResourceOwner(
            [
            'vtk:study_programmes' => ['COMPUTER_SCIENCE', 'ARTIFICIAL_INTELLIGENCE'],
            'vtk:study_years' => ['MASTER_1'],
            ]
        );

        $this->assertSame(['COMPUTER_SCIENCE', 'ARTIFICIAL_INTELLIGENCE'], $owner->getStudyProgrammes());
        $this->assertSame(['MASTER_1'], $owner->getStudyYears());
    }

    public function testDiscardsNonStringEntries(): void
    {
        $owner = new FluxusResourceOwner(
            [
            'permissions' => ['burgieclan.admin', 42, null, ['nested']],
            ]
        );

        $this->assertSame(['burgieclan.admin'], $owner->getPermissions());
    }

    public function testMissingClaimsAreNull(): void
    {
        $owner = new FluxusResourceOwner([]);

        $this->assertNull($owner->getId());
        $this->assertNull($owner->getEmail());
        $this->assertNull($owner->getFullName());
        $this->assertSame([], $owner->getStudyProgrammes());
    }
}
