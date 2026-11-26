<?php

use App\Models\User;

/*
 * The report example in a browser: the date range goes into the URL as two
 * local calendar dates, and the export downloads the same rows as a CSV.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/** The export button's link. */
const REPORT_EXPORT_HREF = "document.querySelector('[data-test=\"export-report-button\"]').href";

/**
 * The dates of the range in a query string. The browser sends them as
 * `filter[ordered_at][]`; the address Inertia keeps after the visit is
 * Laravel's `fullUrl()`, which numbers them (`filter[ordered_at][0]`). PHP
 * reads both alike.
 */
function reportRangeIn(string $search): string
{
    return "[...new URLSearchParams({$search})].filter(([key]) => key.startsWith('filter[ordered_at][')).map(([, date]) => date)";
}

test('a date range goes into the URL as two calendar dates, and the export link takes it along', function () {
    visit('/examples/report')
        ->click('#sales_search_ordered_at')
        ->type('#sales_search_ordered_at', '2026-03-01')
        ->keys('#sales_search_ordered_at', 'Enter')
        ->type('.ant-picker-range input[date-range="end"]', '2026-03-31')
        ->keys('.ant-picker-range input[date-range="end"]', 'Enter')
        ->press('Query')
        ->assertScript(reportRangeIn('location.search'), ['2026-03-01', '2026-03-31'])
        ->assertScript(reportRangeIn('new URL('.REPORT_EXPORT_HREF.').search'), ['2026-03-01', '2026-03-31'])
        ->assertNoJavaScriptErrors();
});

test('a range in the URL fills the search form when the page loads', function () {
    visit('/examples/report?filter[ordered_at][]=2026-03-01&filter[ordered_at][]=2026-03-31')
        ->assertValue('#sales_search_ordered_at', '2026-03-01')
        ->assertValue('.ant-picker-range input[date-range="end"]', '2026-03-31')
        ->assertSeeIn('.ant-table-summary', 'Total');
});

test('the export downloads a CSV with its header row, after a UTF-8 byte order mark', function () {
    visit('/examples/report')
        ->assertScript('fetch('.REPORT_EXPORT_HREF.").then((response) => response.headers.get('content-type'))", 'text/csv; charset=UTF-8')
        // The bytes, since decoding the text drops the mark.
        ->assertScript('fetch('.REPORT_EXPORT_HREF.').then((response) => response.arrayBuffer()).then((bytes) => [...new Uint8Array(bytes, 0, 3)])', [0xEF, 0xBB, 0xBF])
        ->assertScript('fetch('.REPORT_EXPORT_HREF.").then((response) => response.text()).then((csv) => csv.replace(/^\\uFEFF/, '').split('\\n')[0])", 'Product,"Units sold","Average price",Revenue');
});
