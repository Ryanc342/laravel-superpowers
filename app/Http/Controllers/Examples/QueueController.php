<?php

namespace App\Http\Controllers\Examples;

use App\Concerns\GeneratesExampleData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Examples\QueueListRequest;
use App\Http\Requests\Examples\QueueUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The work queue example: made-up tasks in tabs by status, with batch changes
 * of the selected ones. A change is kept in the session, where a real app
 * would save it, so that the queue shows it for the rest of the visit.
 *
 * @phpstan-import-type ExampleTask from GeneratesExampleData
 */
class QueueController extends Controller
{
    use GeneratesExampleData;

    /**
     * Where the session keeps the changes, by task id: `[7 => ['status' => 'completed']]`.
     */
    private const string CHANGES_KEY = 'examples.queue.changes';

    /**
     * The open tab's tasks, searched, sorted and paged on the server. The list
     * prop also has the count of each tab for the same search, so a search or
     * a change reloads the counts with the rows.
     */
    public function index(QueueListRequest $request): Response
    {
        $filters = $request->filterValues();
        $title = Arr::string($filters, 'title', '');
        $assignee = Arr::string($filters, 'assignee', '');
        $priority = Arr::string($filters, 'priority', '');
        $status = $request->status();

        $matching = $this->tasksWithChanges($request)
            ->when($title !== '', fn (Collection $tasks) => $tasks
                ->filter(fn (array $task) => Str::contains($task['title'], $title, ignoreCase: true)))
            ->when($assignee !== '', fn (Collection $tasks) => $tasks->where('assignee', $assignee))
            ->when($priority !== '', fn (Collection $tasks) => $tasks->where('priority', $priority));

        return Inertia::render('examples/queue', [
            'tasks' => [
                ...$request->toProps($request->paginate($matching->where('status', $status)->values())),
                'status' => $status,
                'counts' => collect(self::EXAMPLE_TASK_STATUSES)
                    ->mapWithKeys(fn (string $tabStatus) => [$tabStatus => $matching->where('status', $tabStatus)->count()])
                    ->all(),
            ],
            'assignees' => $this->exampleAssignees(),
        ]);
    }

    /**
     * Marks the selected tasks as completed, or assigns them to someone else,
     * and goes back to the queue as it was: the same tab, search and page.
     */
    public function update(QueueUpdateRequest $request): RedirectResponse
    {
        $ids = $request->taskIds();
        $completes = $request->validated('action') === 'complete';
        $assignee = $request->safe()->string('assignee')->value();
        $changes = $this->changes($request);

        foreach ($ids as $id) {
            $changes[$id] = $completes
                ? [...$changes[$id] ?? [], 'status' => 'completed']
                : [...$changes[$id] ?? [], 'assignee' => $assignee];
        }

        $request->session()->put(self::CHANGES_KEY, $changes);

        Inertia::flash('toast', ['type' => 'success', 'message' => $completes
            ? trans_choice(':count task marked as completed.|:count tasks marked as completed.', count($ids))
            : trans_choice(':count task assigned to :name.|:count tasks assigned to :name.', count($ids), ['name' => $assignee]),
        ]);

        return back();
    }

    /**
     * The example's tasks with the changes this session made to them.
     *
     * @return Collection<int, ExampleTask>
     */
    private function tasksWithChanges(Request $request): Collection
    {
        $changes = $this->changes($request);

        return $this->exampleTasks()->map(fn (array $task) => [
            ...$task,
            'status' => $changes[$task['id']]['status'] ?? $task['status'],
            'assignee' => $changes[$task['id']]['assignee'] ?? $task['assignee'],
        ]);
    }

    /**
     * The changes this session made, by task id.
     *
     * @return array<int, array{status?: string, assignee?: string}>
     */
    private function changes(Request $request): array
    {
        $changes = $request->session()->get(self::CHANGES_KEY);

        return is_array($changes) ? $changes : [];
    }
}
