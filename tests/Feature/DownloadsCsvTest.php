<?php

use App\Concerns\DownloadsCsv;
use Illuminate\Testing\TestResponse;

/*
 * A CSV download that a spreadsheet opens as it should: UTF-8 with a byte
 * order mark, so Excel does not read Chinese as garbage, and no text cell
 * that a spreadsheet would run as a formula.
 */

/**
 * The bytes of the download of these rows, under a header row.
 *
 * @param  list<array<int, string|int|float|null>>  $rows
 */
function csvDownloadOf(array $rows): string
{
    $exporter = new class
    {
        use DownloadsCsv;

        /**
         * @param  list<array<int, string|int|float|null>>  $rows
         */
        public function download(array $rows): TestResponse
        {
            return TestResponse::fromBaseResponse($this->csvDownload('rows.csv', ['Name', 'Amount'], $rows));
        }
    };

    return $exporter->download($rows)->streamedContent();
}

/**
 * The cells of the download's rows after the header row.
 *
 * @param  list<array<int, string|int|float|null>>  $rows
 * @return list<list<string|null>>
 */
function csvRowsOf(array $rows): array
{
    $lines = explode("\n", rtrim(csvDownloadOf($rows), "\n"));

    return array_map(str_getcsv(...), array_slice($lines, 1));
}

test('the download starts with a UTF-8 byte order mark, then the header row', function () {
    expect(csvDownloadOf([]))->toBe("\u{FEFF}Name,Amount\n");
});

test('a text cell that a spreadsheet would run as a formula gets a quote in front', function (string $cell) {
    expect(csvRowsOf([[$cell, 1]])[0][0])->toBe("'".$cell);
})->with([
    'an equals sign' => '=HYPERLINK("http://example.com","Click")',
    'a plus' => '+1+cmd',
    'a minus' => '-2+3',
    'an at sign' => '@SUM(A1:A9)',
    'a tab' => "\t=1+1",
    'a carriage return' => "\r=1+1",
]);

test('a number, and a text that is a number, stay as they are', function (string|int|float $cell, string $written) {
    expect(csvRowsOf([['Refund', $cell]])[0][1])->toBe($written);
})->with([
    'a negative whole number' => [-12, '-12'],
    'a negative amount' => [-12.5, '-12.5'],
    'a negative amount as text' => ['-12.50', '-12.50'],
    'a plain name' => ['Acme Ltd', 'Acme Ltd'],
]);

test('the download is a UTF-8 CSV with its file name', function () {
    $exporter = new class
    {
        use DownloadsCsv;

        public function download(): TestResponse
        {
            return TestResponse::fromBaseResponse($this->csvDownload('rows.csv', ['Name'], []));
        }
    };

    $exporter->download()
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
        ->assertDownload('rows.csv');
});
