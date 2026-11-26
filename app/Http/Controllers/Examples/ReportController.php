<?php

namespace App\Http\Controllers\Examples;

use App\Concerns\GeneratesExampleData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Examples\ReportListRequest;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The report example: sales by product of the made-up orders placed in a
 * date range, sorted and paged on the server like any list, with the totals
 * of the whole range. ReportExportController sends the same rows as a CSV.
 */
class ReportController extends Controller
{
    use GeneratesExampleData;

    /**
     * The totals are in the list's prop, so that a new range reloads them
     * with the rows: the page's statistics and the table's summary row show
     * them.
     */
    public function index(ReportListRequest $request): Response
    {
        ['rows' => $rows, 'totals' => $totals] = $this->exampleSalesReport(...$request->period());

        return Inertia::render('examples/report', [
            'sales' => [
                ...$request->toProps($request->paginate($rows)),
                'totals' => $totals,
            ],
        ]);
    }
}
