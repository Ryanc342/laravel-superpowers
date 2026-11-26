<?php

namespace App\Http\Requests\Examples;

use App\Http\Requests\ListRequest;

/**
 * The list of the report example, and its export: what the URL may sort by,
 * and the date range. The range is a list filter, two local calendar dates
 * (`filter[ordered_at][]=2026-03-01&filter[ordered_at][]=2026-03-31`), as the
 * search form's date range field sends it.
 */
class ReportListRequest extends ListRequest
{
    /**
     * @return list<string>
     */
    protected function sortable(): array
    {
        return ['units', 'revenue'];
    }

    /**
     * A date that is not a calendar date is dropped. The rules do not count
     * the dates, because a count that one dropped date changed would then fail
     * the list: `period()` takes the range only when both ends are there.
     *
     * @return array<string, array<mixed>>
     */
    protected function filters(): array
    {
        return [
            'ordered_at' => ['array'],
            'ordered_at.*' => ['date_format:Y-m-d'],
        ];
    }

    /**
     * The first and last day of the range, in order, or two nulls when the
     * URL has no range of two dates: the report then covers every order.
     *
     * @return array{0: ?string, 1: ?string}
     */
    public function period(): array
    {
        $range = $this->filterValues()['ordered_at'] ?? [];

        if (! is_array($range) || count($range) !== 2) {
            return [null, null];
        }

        $dates = array_values($range);
        sort($dates);

        return [$dates[0], $dates[1]];
    }
}
