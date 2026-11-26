<?php

use App\Models\User;

/*
 * The work queue example in a browser: tabs by status with their counts, and
 * batch changes of the selected rows, the one that cannot be undone behind a
 * Popconfirm.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/** The count on a status's tab. */
function queueTabCount(string $status): string
{
    return "document.querySelector('[data-test=\"queue-count-{$status}\"]').textContent";
}

/** A row's selection checkbox, by the task's id. */
function queuedTaskCheckbox(int $id): string
{
    return "tr[data-row-key=\"{$id}\"] .ant-checkbox-input";
}

test('two tasks marked as completed are counted on the Completed tab', function () {
    $queue = $this->get(route('examples.queue.index'));
    [$first, $second] = array_column($queue->inertiaProps('tasks.rows'), 'id');
    $completed = $queue->inertiaProps('tasks.counts.completed');

    visit('/examples/queue')
        ->assertScript(queueTabCount('completed'), (string) $completed)
        ->click(queuedTaskCheckbox($first))
        ->click(queuedTaskCheckbox($second))
        ->click('@complete-tasks-button')
        ->assertSee('Mark 2 tasks as completed?')
        ->click('.ant-popconfirm-buttons .ant-btn-primary')
        ->assertSee('2 tasks marked as completed.')
        ->assertScript(queueTabCount('completed'), (string) ($completed + 2))
        ->assertNotPresent(queuedTaskCheckbox($first))
        ->assertNoJavaScriptErrors();
});

test('a task is reassigned in a dialog, whose field is checked while the user picks', function () {
    $queue = $this->get(route('examples.queue.index'));
    $task = $queue->inertiaProps('tasks.rows.0.id');
    $assignee = $queue->inertiaProps('assignees.3');

    visit('/examples/queue')
        ->click(queuedTaskCheckbox($task))
        ->click('@reassign-tasks-button')
        ->assertVisible('.ant-modal #reassign_assignee')
        // The search form has an assignee field too: each form names its own fields.
        ->assertScript("document.querySelectorAll('#reassign_assignee, #tasks_search_assignee').length", 2)
        ->press('.ant-modal .ant-btn-primary')
        ->assertSee('The assignee field is required.')
        ->click('.ant-modal .ant-select')
        ->click(".ant-select-item-option[title=\"{$assignee}\"]")
        ->assertDontSee('The assignee field is required.')
        ->press('.ant-modal .ant-btn-primary')
        ->assertSee("1 task assigned to {$assignee}.")
        ->assertSeeIn("tr[data-row-key=\"{$task}\"]", $assignee)
        ->assertNoJavaScriptErrors();
});

test('a tab goes into the URL, and shows only its tasks', function () {
    visit('/examples/queue')
        ->click('.ant-tabs-tab:has([data-test="queue-count-in_progress"])')
        ->assertScript("new URLSearchParams(location.search).get('filter[status]')", 'in_progress')
        ->assertScript("document.querySelector('.ant-tabs-tab-active [data-test]').dataset.test", 'queue-count-in_progress')
        ->assertNoJavaScriptErrors();
});
