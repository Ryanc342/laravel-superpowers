<?php

namespace App\Http\Controllers\Examples;

use App\Concerns\DownloadsCsv;
use App\Concerns\GeneratesExampleData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Examples\ReportListRequest;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The report example's export: the rows the report shows for the same range
 * and sort, every page of them, as a CSV (`DownloadsCsv`: a byte order mark
 * for Excel, and no cell a spreadsheet would run as a formula). The headings
 * are in the user's language; the money is in yuan, as a plain number, so a
 * spreadsheet can add it up.
 */
class ReportExportController extends Controller
{
    use DownloadsCsv;
    use GeneratesExampleData;

    public function __invoke(ReportListRequest $request): StreamedResponse
    {
        $rows = $this->exampleSalesReport(...$request->period())['rows'];
        $sort = $request->sort();

        if ($sort !== null) {
            $rows = $rows->sortBy($sort['column'], SORT_REGULAR, $sort['direction'] === 'desc');
        }

        return $this->csvDownload(
            'sales-by-product.csv',
            [__('Product'), __('Units sold'), __('Average price'), __('Revenue')],
            $rows->map(fn (array $row) => [
                $row['product'],
                $row['units'],
                number_format($row['average_price'] / 100, 2, '.', ''),
                number_format($row['revenue'] / 100, 2, '.', ''),
            ]),
        );
    }
}
