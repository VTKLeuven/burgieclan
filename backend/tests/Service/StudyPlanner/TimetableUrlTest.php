<?php

namespace App\Tests\Service\StudyPlanner;

use App\Service\StudyPlanner\TimetableUrl;
use PHPUnit\Framework\TestCase;

class TimetableUrlTest extends TestCase
{
    public function testAcceptsKuLeuvenTimeEditLinks(): void
    {
        $this->assertSame(
            'https://cloud.timeedit.net/be_kuleuven/web/public/s.ics?sid=7&type=student',
            TimetableUrl::normalize(' webcal://cloud.timeedit.net/be_kuleuven/web/public/s.ics?sid=7&type=student ')
        );
        $this->assertSame(
            'https://cloud.timeedit.net/be_kuleuven/web/public/s.ics',
            TimetableUrl::normalize('http://CLOUD.timeedit.net/be_kuleuven/web/public/s.ics')
        );
    }

    public function testRejectsEverythingElse(): void
    {
        foreach (
            [
            '',
            'https://example.com/be_kuleuven/s.ics',
            'https://cloud.timeedit.net.evil.com/be_kuleuven/s.ics',
            'https://user:pass@cloud.timeedit.net/be_kuleuven/s.ics',
            'https://cloud.timeedit.net:444/be_kuleuven/s.ics',
            'https://cloud.timeedit.net/be_ugent/s.ics',
            'https://cloud.timeedit.net/be_kuleuven/web/public/s.html',
            'ftp://cloud.timeedit.net/be_kuleuven/s.ics',
            'file:///etc/passwd',
            ] as $link
        ) {
            $this->assertNull(TimetableUrl::normalize($link), $link);
        }
    }
}
