<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The work queue example: 60 made-up tasks in three tabs by status, with the
 * count of each. A batch change is kept in the session, where a real app
 * would save it, so the queue shows it from then on.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/**
 * The ids of the first tasks the queue lists under a status.
 *
 * @return list<int>
 */
function queuedTaskIds(string $status, int $count): array
{
    $rows = test()->get(route('examples.queue.index', ['filter' => ['status' => $status]]))->inertiaProps('tasks.rows');

    return array_slice(array_column($rows, 'id'), 0, $count);
}

/**
 * The number of tasks under each status.
 *
 * @return array<string, int>
 */
function queueCounts(): array
{
    return test()->get(route('examples.queue.index'))->inertiaProps('tasks.counts');
}

describe('index', function () {
    test('the queue opens on the tasks to do, with the count of each status', function () {
        $this->get(route('examples.queue.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('examples/queue')
                ->where('tasks.status', 'todo')
                ->where('tasks.counts', fn ($counts) => array_sum($counts->all()) === 60
                    && array_keys($counts->all()) === ['todo', 'in_progress', 'completed'])
                ->where('tasks.rows', fn ($rows) => collect($rows)->isNotEmpty()
                    && collect($rows)->every(fn (array $task) => $task['status'] === 'todo'))
                ->has('assignees', 5));
    });

    test('a tab lists the tasks of its status', function () {
        $this->get(route('examples.queue.index', ['filter' => ['status' => 'completed']]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tasks.status', 'completed')
                ->where('tasks.rows', fn ($rows) => collect($rows)->every(fn (array $task) => $task['status'] === 'completed')));
    });

    test('a status that is not a tab opens the tasks to do', function () {
        $this->get(route('examples.queue.index', ['filter' => ['status' => 'lost']]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('tasks.status', 'todo'));
    });

    test('the counts are of the tasks the search finds', function () {
        $assignee = $this->get(route('examples.queue.index'))->inertiaProps('assignees.0');

        $this->get(route('examples.queue.index', ['filter' => ['assignee' => $assignee]]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('tasks.counts', fn ($counts) => array_sum($counts->all()) < 60)
                ->where('tasks.rows', fn ($rows) => collect($rows)->every(fn (array $task) => $task['assignee'] === $assignee)));
    });
});

describe('update', function () {
    test('tasks marked as completed move to that tab, and the user is told how many', function () {
        $before = queueCounts();
        $ids = queuedTaskIds('todo', 2);

        $this->from(route('examples.queue.index'))
            ->patch(route('examples.queue.update'), ['ids' => $ids, 'action' => 'complete'])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('examples.queue.index'))
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => '2 tasks marked as completed.']);

        expect(queueCounts())->toBe([
            'todo' => $before['todo'] - 2,
            'in_progress' => $before['in_progress'],
            'completed' => $before['completed'] + 2,
        ]);
    });

    test('reassigned tasks keep their status and get the new assignee', function () {
        $assignee = $this->get(route('examples.queue.index'))->inertiaProps('assignees.4');
        $ids = queuedTaskIds('in_progress', 3);

        $this->patch(route('examples.queue.update'), ['ids' => $ids, 'action' => 'reassign', 'assignee' => $assignee])
            ->assertSessionHasNoErrors()
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => "3 tasks assigned to {$assignee}."]);

        $rows = collect($this->get(route('examples.queue.index', ['filter' => ['status' => 'in_progress']]))->inertiaProps('tasks.rows'));

        expect($rows->whereIn('id', $ids)->pluck('assignee')->unique()->all())->toBe([$assignee]);
    });

    test('a reassignment needs someone from the team', function (?string $assignee) {
        $this->patch(route('examples.queue.update'), ['ids' => [1], 'action' => 'reassign', 'assignee' => $assignee])
            ->assertSessionHasErrors('assignee');
    })->with([
        'no one' => [null],
        'a stranger' => ['Someone Else'],
    ]);

    test('a change needs tasks of the queue', function (array $ids, string $error) {
        $this->patch(route('examples.queue.update'), ['ids' => $ids, 'action' => 'complete'])
            ->assertSessionHasErrors($error);
    })->with([
        'none' => [[], 'ids'],
        'a task that does not exist' => [[999], 'ids.0'],
    ]);

    test('the check of the reassign dialog asks only about the assignee', function () {
        $this->withPrecognition()
            ->withHeader('Precognition-Validate-Only', 'assignee')
            ->patchJson(route('examples.queue.update'), ['ids' => [], 'action' => 'reassign', 'assignee' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assignee' => 'The assignee field is required.'])
            ->assertJsonMissingValidationErrors(['ids']);
    });
});
