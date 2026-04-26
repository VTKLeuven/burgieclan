<?php

namespace App\Tests\Api;

class HealthcheckResourceTest extends ApiTestCase
{
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
