<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The report example: sales by product of the made-up orders placed in a
 * date range, with the totals of the whole range, and the same rows as a CSV.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/**
 * The orders of the orders example placed in the range that sold something.
 *
 * @return list<array<string, mixed>>
 */
function soldOrdersPlacedBetween(string $from, string $to): array
{
    $rows = test()->get(route('examples.orders.index', ['per_page' => 100]))->inertiaProps('orders.rows');
    $rest = test()->get(route('examples.orders.index', ['per_page' => 100, 'page' => 2]))->inertiaProps('orders.rows');

    return array_values(array_filter([...$rows, ...$rest], fn (array $order) => $order['status'] !== 'cancelled'
        && $order['ordered_at'] >= $from && $order['ordered_at'] <= $to));
}

describe('index', function () {
    test('the report shows the sales of each product, most first, with the totals of all of them', function () {
        $response = $this->get(route('examples.report.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('examples/report')
                ->has('sales.rows', 12));
        $rows = collect($response->inertiaProps('sales.rows'));

        expect($rows->pluck('revenue')->all())->toBe($rows->pluck('revenue')->sortDesc()->values()->all())
            ->and($response->inertiaProps('sales.totals'))->toMatchArray([
                'units' => $rows->sum('units'),
                'revenue' => $rows->sum('revenue'),
            ]);
    });

    test('a date range counts only the orders placed in it', function () {
        $sold = soldOrdersPlacedBetween('2026-03-01', '2026-03-31');

        $this->get(route('examples.report.index', ['filter' => ['ordered_at' => ['2026-03-01', '2026-03-31']]]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('sales.filters', ['ordered_at' => ['2026-03-01', '2026-03-31']])
                ->where('sales.totals.orders', count($sold))
                ->where('sales.totals.revenue', array_sum(array_column($sold, 'total'))));
    });

    test('a range that is not two dates is left out, and the report shows every order', function (array $range) {
        $everything = $this->get(route('examples.report.index'))->inertiaProps('sales.totals');

        $this->get(route('examples.report.index', ['filter' => ['ordered_at' => $range]]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('sales.totals', $everything));
    })->with([
        'one date' => [['2026-03-01']],
        'not dates' => [['soon', 'later']],
        'three dates' => [['2026-03-01', '2026-03-15', '2026-03-31']],
    ]);

    test('a range given back to front is read front to back', function () {
        $forwards = $this->get(route('examples.report.index', ['filter' => ['ordered_at' => ['2026-03-01', '2026-03-31']]]))
            ->inertiaProps('sales.totals');

        $this->get(route('examples.report.index', ['filter' => ['ordered_at' => ['2026-03-31', '2026-03-01']]]))
            ->assertInertia(fn (Assert $page) => $page->where('sales.totals', $forwards));
    });
});

describe('export', function () {
    test('the export is a CSV with a header row and a row for each product', function () {
        $response = $this->get(route('examples.report.export'));

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertDownload('sales-by-product.csv');

        $lines = array_map(str_getcsv(...), explode("\n", trim($response->streamedContent())));

        expect($lines[0])->toBe(['Product', 'Units sold', 'Average price', 'Revenue'])
            ->and($lines)->toHaveCount(13);
    });

    test('the export has the rows of the date range', function () {
        $range = ['filter' => ['ordered_at' => ['2026-03-01', '2026-03-31']]];
        $rows = $this->get(route('examples.report.index', $range))->inertiaProps('sales.rows');

        $csv = $this->get(route('examples.report.export', $range))->streamedContent();
        $products = array_column(array_map(str_getcsv(...), array_slice(explode("\n", trim($csv)), 1)), 0);

        expect($products)->toBe(array_column($rows, 'product'));
    });
});
