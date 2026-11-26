<?php

use App\Models\User;

/*
 * The orders example in a browser: the list's state in the URL, its dialogs,
 * the long form's checks while typing and on submit, antd's own text in each
 * language, and the pages on a phone.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/** The value of a query key of the page's address, brackets and all. */
function orderListQuery(string $key): string
{
    return "new URLSearchParams(location.search).get('{$key}')";
}

/** Whether the rows have a status tag each, and every one says this. */
function everyListedOrderIs(string $status): string
{
    return "(() => { const tags = [...document.querySelectorAll('.ant-table-tbody .ant-tag')]; return tags.length > 0 && tags.every((tag) => tag.textContent === '{$status}'); })()";
}

/**
 * Records, in `window.checkedFields`, the fields each check while typing asks
 * the server about: Precognition's `Precognition-Validate-Only` header. Its
 * checks are sent with `fetch`. A check of no field, which a check held back
 * before a submit can turn into, asks about nothing and is left out.
 */
const RECORD_CHECKED_FIELDS = "(() => { window.checkedFields = []; const send = window.fetch; window.fetch = (input, init = {}) => { const fields = new Headers(init.headers).get('Precognition-Validate-Only'); if (fields) { window.checkedFields.push(fields); } return send(input, init); }; })()";

/** Whether the element is inside the window, top to bottom. */
function orderFieldIsInView(string $selector): string
{
    return "(() => { const { top, bottom } = document.querySelector('{$selector}').getBoundingClientRect(); return top >= 0 && bottom <= window.innerHeight; })()";
}

describe('on a desktop', function () {
    test('a search by status goes into the URL and leaves only those orders', function () {
        visit('/examples/orders')
            ->click('.ant-pro-query-filter .ant-select')
            ->click('.ant-select-item-option[title="Paid"]')
            ->press('Query')
            ->assertScript(orderListQuery('filter[status]'), 'paid')
            ->assertScript(everyListedOrderIs('Paid'), true)
            ->assertNoJavaScriptErrors();
    });

    test('back from an order shows the list on the page it was on', function () {
        visit('/examples/orders')
            ->click('.ant-pagination-item-3')
            ->assertScript(orderListQuery('page'), '3')
            ->assertSee('SO-2026-0041')
            ->click('@view-order-button')
            ->assertPathIs('/examples/orders/41')
            ->assertSee('SO-2026-0041')
            ->back()
            ->assertPathIs('/examples/orders')
            ->assertScript(orderListQuery('page'), '3')
            ->assertScript("document.querySelector('.ant-pagination-item-active').textContent", '3')
            ->assertSee('SO-2026-0041')
            ->assertNoJavaScriptErrors();
    });

    test('an order\'s history says what happened at each step', function () {
        $shipped = $this->get(route('examples.orders.index', ['filter' => ['status' => 'shipped']]))
            ->inertiaProps('orders.rows.0.id');

        visit("/examples/orders/{$shipped}")
            ->click('History')
            ->assertSee('Order placed')
            ->assertSee('Payment received')
            ->assertDontSee('Awaiting payment')
            ->assertNoJavaScriptErrors();
    });

    test('a list loaded sorted shows the sort on its column', function () {
        visit('/examples/orders?sort=-total')
            ->assertScript("document.querySelector('th[aria-sort]').textContent", 'Amount')
            ->assertAttribute('th[aria-sort]', 'aria-sort', 'descending');
    });

    test('deleting an order asks first, then says it is deleted', function () {
        visit('/examples/orders')
            ->click('@delete-order-button')
            ->assertSee('Delete this order?')
            ->click('.ant-popconfirm-buttons .ant-btn-primary')
            ->assertSee('Order deleted.')
            ->assertNoJavaScriptErrors();
    });

    test('a draft from Quick add says it is created, and the dialog opens again as new', function () {
        $page = visit('/examples/orders')
            ->press('@quick-add-button')
            ->type('.ant-modal input#quick_add_customer', 'Acme Ltd')
            ->click('.ant-modal input#quick_add_ordered_at')
            ->click('.ant-picker-cell-today')
            ->press('Create draft')
            ->assertSee('Draft order created.');

        $page->press('@quick-add-button')
            ->assertVisible('.ant-modal input#quick_add_customer')
            ->assertValue('.ant-modal input#quick_add_customer', '')
            ->assertValue('.ant-modal input#quick_add_ordered_at', '');

        // The customer was typed before the draft was sent. Were it still counted
        // as touched, the check of the date would check it too, and show its error.
        $page->script(RECORD_CHECKED_FIELDS);

        $page->click('.ant-modal input#quick_add_ordered_at')
            ->click('.ant-picker-cell-today')
            ->assertScript("window.checkedFields.join(' | ')", 'ordered_at')
            ->assertDontSee('The customer field is required.')
            ->assertNoJavaScriptErrors();
    });

    test('an empty order, sent, scrolls up to its first error, which goes once the customer is typed', function () {
        $page = visit('/examples/orders/create')->resize(1280, 480)
            ->assertPresent('input#order_customer');

        // The form is longer than the window: from its end, its first field is out of sight.
        $page->script('window.scrollTo(0, document.documentElement.scrollHeight)');
        $page->assertScript(orderFieldIsInView('input#order_customer'), false)
            ->press('@save-order-button')
            ->assertSee('The customer field is required.')
            ->assertScript(orderFieldIsInView('input#order_customer'), true)
            ->type('input#order_customer', 'Acme Ltd')
            ->assertDontSee('The customer field is required.')
            ->assertNoJavaScriptErrors();
    });

    test('an order with its last item removed is told to add one, under the items', function () {
        visit('/examples/orders/create')
            ->click('.ant-pro-form-list-action-icon.action-remove')
            ->assertSeeIn('.ant-pro-form-list', 'Add at least one product.')
            ->assertNoJavaScriptErrors();
    });

    test('antd and Pro write their own text in the language the user chose', function () {
        $searchButton = "document.querySelector('.ant-pro-query-filter .ant-btn-primary').textContent.replace(/\\s/g, '')";

        $page = visit('/examples/orders')
            ->assertScript($searchButton, 'Query')
            ->assertSee('20 / page');

        $page->click('@language-switch')
            ->click('中文')
            ->assertScript($searchButton, '查询')
            ->assertSee('20 条/页')
            ->assertNoJavaScriptErrors();
    });
});

describe('on a phone', function () {
    test('Quick add opens as a sheet from the bottom', function () {
        visit('/examples/orders')->on()->mobile()
            ->press('@quick-add-button')
            ->assertVisible('.ant-drawer-bottom input#quick_add_customer')
            ->assertNoJavaScriptErrors();
    });

    // The browser widens `innerWidth` to fit what overflows, so the screen's
    // width is the visual viewport's.
    test('the page is no wider than the screen', function (string $path) {
        visit($path)->on()->mobile()
            ->assertPresent('.ant-pro-page-container h1')
            ->assertScript('document.documentElement.scrollWidth <= window.visualViewport.width', true)
            ->assertNoJavaScriptErrors();
    })->with([
        'the list' => '/examples/orders',
        'an order' => '/examples/orders/5',
        'a new order' => '/examples/orders/create',
        'an order to edit' => '/examples/orders/5/edit',
    ]);

    test('the list scrolls sideways inside itself', function () {
        visit('/examples/orders')->on()->mobile()
            ->assertPresent('.ant-table-content')
            ->assertScript("(() => { const table = document.querySelector('.ant-table-content'); return table.scrollWidth > table.clientWidth && getComputedStyle(table).overflowX === 'auto'; })()", true);
    });
});
