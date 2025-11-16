<?php

namespace App\Tests\Api;

use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

class HealthcheckResourceTest extends ApiTestCase
{
    use ResetDatabase;
    use Factories;

    public function testHealthcheckReturns200(): void
    {
        $json = $this->browser()
            ->get('/api/healthcheck')
            ->assertStatus(200)
            ->assertJson()
            ->json();

        $decodedJson = $json->decoded();
        $this->assertSame('ok', $decodedJson['status']);
        $this->assertSame('burgieclan-api', $decodedJson['service']);
        $this->assertSame('connected', $decodedJson['database']);
        $this->assertArrayHasKey('timestamp', $decodedJson);
    }
}
