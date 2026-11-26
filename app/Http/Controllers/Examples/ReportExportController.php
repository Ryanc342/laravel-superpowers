<?php

namespace App\Http\Controllers\Examples;

use App\Concerns\GeneratesExampleData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Examples\ReportListRequest;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The report example's export: the rows the report shows for the same range
 * and sort, every page of them, as a CSV. The headings are in the user's
 * language; the money is in yuan, as a plain number, so a spreadsheet can
 * add it up.
 */
class ReportExportController extends Controller
{
    use GeneratesExampleData;

    public function __invoke(ReportListRequest $request): StreamedResponse
    {
        $rows = $this->exampleSalesReport(...$request->period())['rows'];
        $sort = $request->sort();

        if ($sort !== null) {
            $rows = $rows->sortBy($sort['column'], SORT_REGULAR, $sort['direction'] === 'desc');
        }

        return response()->streamDownload(function () use ($rows): void {
            $csv = fopen('php://output', 'w');

            if ($csv === false) {
                return;
            }

            fputcsv($csv, [__('Product'), __('Units sold'), __('Average price'), __('Revenue')], escape: '');

            foreach ($rows as $row) {
                fputcsv($csv, [
                    $row['product'],
                    $row['units'],
                    number_format($row['average_price'] / 100, 2, '.', ''),
                    number_format($row['revenue'] / 100, 2, '.', ''),
                ], escape: '');
            }

            fclose($csv);
        }, 'sales-by-product.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
