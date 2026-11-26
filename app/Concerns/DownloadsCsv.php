<?php

namespace App\Concerns;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Rows as a CSV download that a spreadsheet opens as it should:
 *
 * - UTF-8 with a byte order mark first. Without it, Excel reads the file in
 *   the system's code page (GBK on a Chinese Windows), and the text turns to
 *   garbage.
 * - A text cell that starts as a formula would (`=`, `+`, `-`, `@`, a tab or a
 *   carriage return) gets a `'` in front, so a spreadsheet shows it as text
 *   and never runs it: a customer's name or a note is anyone's text. A number,
 *   or a text that is one, such as `-12.50`, stays as it is.
 */
trait DownloadsCsv
{
    /**
     * @param  list<string>  $header
     * @param  iterable<array<int, string|int|float|null>>  $rows
     */
    protected function csvDownload(string $filename, array $header, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows): void {
            $csv = fopen('php://output', 'w');

            if ($csv === false) {
                return;
            }

            fwrite($csv, "\u{FEFF}");
            fputcsv($csv, array_map($this->csvCell(...), $header), escape: '');

            foreach ($rows as $row) {
                fputcsv($csv, array_map($this->csvCell(...), $row), escape: '');
            }

            fclose($csv);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * The cell as the file has it: a text that would start a formula, with a `'` in front.
     */
    private function csvCell(string|int|float|null $value): string|int|float|null
    {
        if (is_string($value) && ! is_numeric($value) && preg_match('/^[=+\-@\t\r]/', $value) === 1) {
            return "'".$value;
        }

        return $value;
    }
}
