<?php

namespace App\Tests\Api;

use App\Factory\CourseFactory;
use App\Factory\UserFactory;
use App\Service\StudyPlanner\LeuvenTime;
use DateTimeImmutable;
use Zenstruck\Browser\KernelBrowser;

/**
 * The "Blok" calendar of the study planner (StudyPlannerBlok): exams, daily tasks, free days and
 * the study timer, for someone without a timetable.
 */
class StudyPlannerBlokTest extends ApiTestCase
{
    private KernelBrowser $client;

    private string $bearer;

    protected function setUp(): void
    {
        parent::setUp();
        $user = UserFactory::createOne(['plainPassword' => 'password']);
        $this->bearer = $this->getToken($user->getUsername(), 'password');
        $this->client = $this->browser();
    }

    /**
     * @param array<string, mixed>|null $json
     *
     * @return array<string, mixed>
     */
    private function call(string $method, string $url, ?array $json = null, int $status = 200): array
    {
        $options = ['headers' => ['Authorization' => 'Bearer ' . $this->bearer, 'Content-Type' => 'application/ld+json']];
        if (null !== $json) {
            $options['json'] = $json;
        }
        $this->client->request($method, $url, $options)->assertStatus($status);

        return json_decode($this->client->content(), true) ?? [];
    }

    /**
     * @param array<string, mixed> $json
     *
     * @return array<string, mixed>
     */
    private function op(array $json, int $status = 200): array
    {
        return $this->call('POST', '/api/study_planner/operations', $json, $status);
    }

    private static function day(int $offset): string
    {
        return (new DateTimeImmutable(LeuvenTime::wall(new DateTimeImmutable())['date']))->modify(sprintf('%+d days', $offset))->format('Y-m-d');
    }

    public function testEmptyWithoutATimetable(): void
    {
        $state = $this->call('GET', '/api/study_planner');

        $this->assertFalse($state['subscribed']);
        $this->assertSame(['exams' => [], 'tasks' => [], 'freeDays' => [], 'sessions' => []], $state['block']);
    }

    public function testExams(): void
    {
        $course = CourseFactory::createOne(['code' => 'H01A1A', 'name' => 'Lineaire algebra']);

        $state = $this->op(['op' => 'addExam', 'exam' => ['subject' => 'course:' . $course->getId(), 'date' => self::day(20), 'time' => '09:00']]);
        $state = $this->op(['op' => 'addExam', 'exam' => ['subject' => 'name:  Computer   architecturen ', 'date' => self::day(10)]]);
        $exams = $state['block']['exams'];
        $this->assertSame(['Computer architecturen', 'Lineaire algebra'], array_column($exams, 'subjectLabel'));
        $this->assertSame('name:Computer architecturen', $exams[0]['subject']);
        $this->assertNull($exams[0]['time']);

        $state = $this->op(['op' => 'updateExam', 'id' => $exams[0]['id'], 'exam' => ['subject' => 'name:Computer architecturen', 'date' => self::day(30), 'time' => '14:00']]);
        $this->assertSame('Lineaire algebra', $state['block']['exams'][0]['subjectLabel']);
        $this->assertSame('14:00', $state['block']['exams'][1]['time']);

        $state = $this->op(['op' => 'deleteExam', 'id' => $exams[0]['id']]);
        $this->assertCount(1, $state['block']['exams']);

        $this->op(['op' => 'addExam', 'exam' => ['subject' => null, 'date' => self::day(5)]], 400);
        $this->op(['op' => 'addExam', 'exam' => ['subject' => 'course:999999', 'date' => self::day(5)]], 400);
        $this->op(['op' => 'addExam', 'exam' => ['subject' => 'Thermo', 'date' => self::day(5)]], 400);
        $this->op(['op' => 'addExam', 'exam' => ['subject' => 'name:Thermo', 'date' => '27-12-2026']], 400);
    }

    public function testTasksAndCatchingUp(): void
    {
        $state = $this->op(['op' => 'addTask', 'task' => ['date' => self::day(-2), 'subject' => 'name:Lineaire algebra', 'title' => 'H1-H3']]);
        $state = $this->op(['op' => 'addTask', 'task' => ['date' => self::day(-1), 'subject' => 'name:Computerarchitecturen', 'title' => 'Lesvideo 1-2']]);
        $state = $this->op(['op' => 'addTask', 'task' => ['date' => self::day(-1), 'subject' => null, 'title' => 'Mail de prof']]);
        // A course on its own is a plan too.
        $state = $this->op(['op' => 'addTask', 'task' => ['date' => self::day(2), 'subject' => 'name:Thermodynamica', 'title' => '']]);
        $tasks = $state['block']['tasks'];
        $this->assertSame(['H1-H3', 'Lesvideo 1-2', 'Mail de prof', 'Thermodynamica'], array_column($tasks, 'title'));
        $this->assertNull($tasks[2]['subject']);

        $state = $this->op(['op' => 'taskDone', 'id' => $tasks[0]['id'], 'value' => true]);
        $this->assertTrue($state['block']['tasks'][0]['done']);

        // The two past tasks not ticked off move to today; the one done stays.
        $state = $this->op(['op' => 'catchUp', 'date' => self::day(0)]);
        $dates = array_column($state['block']['tasks'], 'date', 'title');
        $this->assertSame(self::day(-2), $dates['H1-H3']);
        $this->assertSame(self::day(0), $dates['Lesvideo 1-2']);
        $this->assertSame(self::day(0), $dates['Mail de prof']);
        $this->op(['op' => 'catchUp', 'date' => self::day(-1)], 400);

        $state = $this->op(['op' => 'updateTask', 'id' => $tasks[1]['id'], 'task' => ['date' => self::day(3), 'subject' => 'name:Computerarchitecturen', 'title' => 'Lesvideo 1-3']]);
        $this->assertContains('Lesvideo 1-3', array_column($state['block']['tasks'], 'title'));

        $state = $this->op(['op' => 'deleteTask', 'id' => $tasks[2]['id']]);
        $this->assertCount(3, $state['block']['tasks']);

        $this->op(['op' => 'addTask', 'task' => ['date' => self::day(1), 'subject' => null, 'title' => ' ']], 400);
    }

    public function testFreeDays(): void
    {
        $this->op(['op' => 'freeDay', 'date' => self::day(4), 'value' => true]);
        $state = $this->op(['op' => 'freeDay', 'date' => self::day(4), 'value' => true]);
        $this->assertSame([self::day(4)], $state['block']['freeDays']);

        $state = $this->op(['op' => 'freeDay', 'date' => self::day(4), 'value' => false]);
        $this->assertSame([], $state['block']['freeDays']);
    }

    public function testTimer(): void
    {
        $state = $this->op(['op' => 'timerStart']);
        $this->assertCount(1, $state['block']['sessions']);
        $this->assertSame(self::day(0), $state['block']['sessions'][0]['date']);
        $this->assertNull($state['block']['sessions'][0]['end']);

        // Starting again while it runs changes nothing.
        $state = $this->op(['op' => 'timerStart']);
        $this->assertCount(1, $state['block']['sessions']);

        $state = $this->op(['op' => 'timerPause']);
        $this->assertNotNull($state['block']['sessions'][0]['end']);

        $state = $this->op(['op' => 'timerStart']);
        $state = $this->op(['op' => 'timerPause']);
        $this->assertCount(2, $state['block']['sessions']);

        $state = $this->op(['op' => 'deleteSession', 'id' => $state['block']['sessions'][0]['id']]);
        $this->assertCount(1, $state['block']['sessions']);
    }

    public function testOnlyYourOwn(): void
    {
        $state = $this->op(['op' => 'addTask', 'task' => ['date' => self::day(1), 'subject' => null, 'title' => 'Mine']]);
        $id = $state['block']['tasks'][0]['id'];

        $other = UserFactory::createOne(['plainPassword' => 'password']);
        $this->bearer = $this->getToken($other->getUsername(), 'password');
        $this->op(['op' => 'taskDone', 'id' => $id, 'value' => true], 404);
        $this->op(['op' => 'deleteTask', 'id' => $id], 404);
        $this->assertSame([], $this->call('GET', '/api/study_planner')['block']['tasks']);
    }
}
