<?php

namespace App\Http\Requests\Examples;

use App\Concerns\GeneratesExampleData;
use App\Http\Requests\ListRequest;
use Illuminate\Validation\Rule;

/**
 * The list of the work queue example: what its URL may sort by and filter on.
 * The tab is a filter too (`filter[status]`), so it stays in the URL with the
 * search, the sort and the page, and a status that is not a tab is dropped.
 */
class QueueListRequest extends ListRequest
{
    use GeneratesExampleData;

    /**
     * @return list<string>
     */
    protected function sortable(): array
    {
        return ['created_on'];
    }

    /**
     * A part of the title, one assignee, one priority and the tab's status.
     *
     * @return array<string, array<mixed>>
     */
    protected function filters(): array
    {
        return [
            'title' => ['string', 'max:100'],
            'assignee' => [Rule::in($this->exampleAssignees())],
            'priority' => [Rule::in(self::EXAMPLE_TASK_PRIORITIES)],
            'status' => [Rule::in(self::EXAMPLE_TASK_STATUSES)],
        ];
    }

    /**
     * The status whose tab is open: the URL's, or the first tab's.
     */
    public function status(): string
    {
        $status = $this->filterValues()['status'] ?? null;

        return is_string($status) ? $status : self::EXAMPLE_TASK_STATUSES[0];
    }
}
