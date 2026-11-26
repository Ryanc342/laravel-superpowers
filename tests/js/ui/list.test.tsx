import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
    act,
    render,
    renderHook,
    screen,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Grid } from 'antd';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { setLanguage } from '@/lib/i18n';
import { listQuery, sortOrderOf, useInertiaTable } from '@/ui/list';
import type { ListProps } from '@/ui/list';

const get = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({ router: { get } }));

type Order = { id: number; name: string; total: number };

/** The prop a list page receives: page 2 of 45 orders, 20 to a page, as `ListRequest::toProps` sends it. */
function listProps(
    overrides: Partial<ListProps<Order>> = {},
): ListProps<Order> {
    return {
        rows: [],
        total: 45,
        page: 2,
        perPage: 20,
        perPageOptions: [10, 20, 50, 100],
        sort: null,
        filters: {},
        prefix: '',
        ...overrides,
    };
}

/** The query of the address bar, as the hook reads it when a change is made. */
function at(url: string): void {
    window.history.replaceState({}, '', url);
}

beforeEach(() => {
    at('/orders');
});

afterEach(() => {
    vi.restoreAllMocks();
    get.mockReset();
    setLanguage('en', []);
});

/** A query's values by key; a key that repeats has a list of them, in order. */
function grouped(query: URLSearchParams): Record<string, string | string[]> {
    const pairs: Record<string, string | string[]> = {};

    for (const [key, value] of query) {
        const seen = pairs[key];

        pairs[key] = seen === undefined ? value : [...[seen].flat(), value];
    }

    return pairs;
}

/** What a change to the list makes of a URL that has this query. */
function changed(
    list: ListProps<Order>,
    change: Parameters<typeof listQuery>[1],
    search: string,
) {
    return grouped(listQuery(list, change, new URLSearchParams(search)));
}

test('changing the rows per page goes back to the first page and keeps another list on its page', () => {
    expect(
        changed(
            listProps(),
            { perPage: 50 },
            'page=3&items_page=3&status=open',
        ),
    ).toEqual({
        page: '1',
        per_page: '50',
        items_page: '3',
        status: 'open',
    });
});

test('changing the page keeps the rows per page, the sort and the filters', () => {
    expect(
        changed(
            listProps(),
            { page: 3 },
            'per_page=50&sort=-total&filter[status]=paid&page=2',
        ),
    ).toEqual({
        page: '3',
        per_page: '50',
        sort: '-total',
        'filter[status]': 'paid',
    });
});

test('changing the sort goes back to the first page, and null clears it', () => {
    expect(
        changed(listProps(), { sort: '-total' }, 'page=3&sort=name'),
    ).toEqual({ page: '1', sort: '-total' });

    expect(changed(listProps(), { sort: null }, 'page=3&sort=name')).toEqual({
        page: '1',
    });
});

test('new filters replace the old ones and send the list back to the first page', () => {
    expect(
        changed(
            listProps(),
            { filters: { status: 'open' } },
            'page=3&filter[status]=paid&filter[customer]=Ada&filter[tags][]=a&sort=name',
        ),
    ).toEqual({ page: '1', sort: 'name', 'filter[status]': 'open' });
});

test('an empty filter is dropped', () => {
    expect(
        changed(
            listProps(),
            {
                filters: {
                    status: 'open',
                    customer: '',
                    note: undefined,
                    tags: [],
                    owner: null,
                },
            },
            '',
        ),
    ).toEqual({ page: '1', 'filter[status]': 'open' });

    expect(
        changed(listProps(), { filters: {} }, 'filter[status]=paid'),
    ).toEqual({ page: '1' });
});

test('a filter that is a number, a switch, a list or an object is sent as text', () => {
    expect(
        changed(
            listProps(),
            {
                filters: {
                    min: 0,
                    archived: false,
                    paid: true,
                    tags: ['a', 'b'],
                    created: { from: '2026-11-01', to: '2026-11-30' },
                },
            },
            '',
        ),
    ).toEqual({
        page: '1',
        'filter[min]': '0',
        'filter[archived]': '0',
        'filter[paid]': '1',
        'filter[tags][]': ['a', 'b'],
        'filter[created][from]': '2026-11-01',
        'filter[created][to]': '2026-11-30',
    });
});

test('a list filter keeps its order and survives a change of page', () => {
    const first = listQuery(
        listProps(),
        {
            filters: {
                tags: ['b', 'a', 'c'],
                range: ['2026-11-01', '2026-11-30'],
            },
        },
        new URLSearchParams('page=4'),
    );

    // The address bar holds the query, and the next change reads it back.
    const next = listQuery(
        listProps(),
        { page: 2 },
        new URLSearchParams(first.toString()),
    );

    expect(grouped(next)).toEqual({
        page: '2',
        'filter[tags][]': ['b', 'a', 'c'],
        'filter[range][]': ['2026-11-01', '2026-11-30'],
    });
});

test('another list keeps its repeated and bracketed keys when this one changes', () => {
    const others =
        'a[]=1&a[]=2&items_filter[status][]=paid&items_filter[status][]=open&items_page=3&items_sort=-name';

    expect(changed(listProps(), { page: 3 }, `${others}&page=2`)).toEqual({
        'a[]': ['1', '2'],
        'items_filter[status][]': ['paid', 'open'],
        items_page: '3',
        items_sort: '-name',
        page: '3',
    });

    expect(
        changed(
            listProps({ prefix: 'orders_' }),
            { filters: { status: 'open' }, perPage: 10 },
            `${others}&orders_filter[status][]=x&orders_filter[status][]=y`,
        ),
    ).toEqual({
        'a[]': ['1', '2'],
        'items_filter[status][]': ['paid', 'open'],
        items_page: '3',
        items_sort: '-name',
        orders_per_page: '10',
        orders_page: '1',
        'orders_filter[status]': 'open',
    });
});

test('a prefix applies to every key of the list and to none of another list', () => {
    const orders = listProps({ prefix: 'orders_' });

    expect(
        changed(
            orders,
            { perPage: 10 },
            'orders_page=3&items_page=3&items_per_page=50&page=4',
        ),
    ).toEqual({
        orders_page: '1',
        orders_per_page: '10',
        items_page: '3',
        items_per_page: '50',
        page: '4',
    });

    expect(
        changed(
            orders,
            { sort: '-total', filters: { status: 'paid' } },
            'orders_filter[status]=open&filter[status]=mine',
        ),
    ).toEqual({
        orders_page: '1',
        orders_sort: '-total',
        'orders_filter[status]': 'paid',
        'filter[status]': 'mine',
    });
});

test('a page change alone does not touch the other keys, and an explicit page wins', () => {
    expect(changed(listProps(), { page: 1 }, 'page=4&x=1')).toEqual({
        page: '1',
        x: '1',
    });

    expect(changed(listProps(), { page: 2, perPage: 50 }, 'page=4')).toEqual({
        page: '2',
        per_page: '50',
    });
});

/** The props the hook gives ProTable, for a list on a screen as wide as `screens` says. */
function tableProps(list: ListProps<Order>, screens: object = { md: true }) {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue(screens);

    return renderHook(() => useInertiaTable(list, 'orders')).result.current;
}

/** The last argument of a table's `onChange`: what kind of change it was. */
const extra = (action: 'paginate' | 'sort' | 'filter') => ({
    action,
    currentDataSource: [],
});

const onTable = {
    only: ['orders'],
    preserveState: true,
    preserveScroll: true,
    replace: false,
};

test('the hook gives ProTable the rows, the paging from the server and a scrolling table', () => {
    const rows = [{ id: 1, name: 'Order 01', total: 10 }];
    const props = tableProps(listProps({ rows }));

    expect(props.dataSource).toBe(rows);
    expect(props.scroll).toEqual({ x: 'max-content' });
    expect(props.pagination).toMatchObject({
        current: 2,
        pageSize: 20,
        total: 45,
        pageSizeOptions: [10, 20, 50, 100],
        showSizeChanger: true,
    });
});

// The server cannot see the screen: a pager that changed with it would jump
// once the server's page hydrated. antd's CSS fits the one pager to a phone.
test('the pager is the same on every screen, and before the screen is known', () => {
    const pager = (screens: object) =>
        JSON.stringify(tableProps(listProps(), screens).pagination);

    expect(pager({ xs: true })).toBe(pager({ md: true }));
    expect(pager({})).toBe(pager({ md: true }));
    expect(tableProps(listProps()).pagination).not.toHaveProperty('simple');
});

test('the total is a plural sentence that has Chinese', () => {
    const { showTotal } = tableProps(listProps()).pagination as {
        showTotal: (total: number) => string;
    };

    expect(showTotal(1)).toBe('Total 1 item');
    expect(showTotal(45)).toBe('Total 45 items');

    setLanguage('zh_CN', {
        'Total :count item|Total :count items': '共 :count 条',
    });

    expect(showTotal(45)).toBe('共 45 条');
});

test('the pagination is hidden only when the smallest choice already shows every row', () => {
    const pagination = (list: Partial<ListProps<Order>>) =>
        tableProps(listProps(list)).pagination as { hideOnSinglePage: boolean };

    expect(pagination({ total: 8, page: 1 }).hideOnSinglePage).toBe(true);
    expect(pagination({ total: 10, page: 1 }).hideOnSinglePage).toBe(true);
    // Hiding it at 45 rows with 50 to a page would leave no way back to 10 or 20.
    expect(
        pagination({ total: 45, page: 1, perPage: 50 }).hideOnSinglePage,
    ).toBe(false);
    expect(pagination({ total: 11, page: 1 }).hideOnSinglePage).toBe(false);
});

test('a filter set that PHP sent as an empty list is no filters', () => {
    expect(tableProps(listProps({ filters: [] })).form.initialValues).toEqual(
        {},
    );
    expect(
        tableProps(listProps({ filters: { status: 'open' } })).form
            .initialValues,
    ).toEqual({ status: 'open' });
});

test('a table change visits the list with the state of the URL and reloads only its prop', () => {
    at('/orders?page=2&sort=name&filter[status]=paid&items_page=3');
    const props = tableProps(listProps());

    props.onChange?.({ current: 3, pageSize: 20 }, {}, {}, extra('paginate'));

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
        '/orders?page=3&sort=name&filter[status]=paid&items_page=3',
        {},
        onTable,
    );
});

test('a visit keeps another list repeated keys as they are and sends them untouched to Inertia', () => {
    at(
        '/orders?a[]=1&a[]=2&items_filter[status][]=paid&items_filter[status][]=open&page=2',
    );
    const props = tableProps(listProps());

    props.onChange?.({ current: 3, pageSize: 20 }, {}, {}, extra('paginate'));

    expect(get).toHaveBeenCalledWith(
        '/orders?a[]=1&a[]=2&items_filter[status][]=paid&items_filter[status][]=open&page=3',
        {},
        onTable,
    );
});

test('Inertia visits the address the hook built, repeated and bracketed keys as they are', async () => {
    // The real router, behind the hook's call: it cancels the visit at its `before` event,
    // which holds the URL the request would have had.
    const { router } =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    get.mockImplementation((...args: Parameters<typeof router.get>) =>
        router.get(...args),
    );
    const visited: string[] = [];
    const stop = router.on('before', (event) => {
        visited.push(event.detail.visit.url.search);

        return false;
    });

    at(
        '/orders?a[]=1&a[]=2&items_filter[status][]=paid&items_filter[status][]=open&filter[tags][]=x&filter[tags][]=y&page=2',
    );
    tableProps(listProps()).onChange?.(
        { current: 3, pageSize: 20 },
        {},
        {},
        extra('paginate'),
    );
    stop();

    expect(visited).toEqual([
        '?a[]=1&a[]=2&items_filter[status][]=paid&items_filter[status][]=open&filter[tags][]=x&filter[tags][]=y&page=3',
    ]);
});

test('picking another page size is a change of rows per page, which resets the page', () => {
    at('/orders?page=2&per_page=20');
    const props = tableProps(listProps());

    props.onChange?.({ current: 1, pageSize: 50 }, {}, {}, extra('paginate'));

    expect(get).toHaveBeenCalledWith('/orders?page=1&per_page=50', {}, onTable);
});

test('sorting a column puts it in the URL, and the direction is a minus sign', () => {
    at('/orders?page=2');
    const props = tableProps(listProps());
    const sort = (order: 'ascend' | 'descend' | null) =>
        props.onChange?.(
            { current: 2, pageSize: 20 },
            {},
            { field: 'total', order },
            extra('sort'),
        );

    sort('ascend');
    sort('descend');
    sort(null);

    expect(get.mock.calls.map(([url]) => url)).toEqual([
        '/orders?page=1&sort=total',
        '/orders?page=1&sort=-total',
        '/orders?page=1',
    ]);
});

test('a column with a nested data index sorts by its dotted path', () => {
    const props = tableProps(listProps());

    props.onChange?.(
        { current: 1, pageSize: 20 },
        {},
        { field: ['customer', 'name'], order: 'ascend' },
        extra('sort'),
    );

    expect(get.mock.calls[0][0]).toBe('/orders?page=1&sort=customer.name');
});

test('a column takes its sort arrow from the sort the list was loaded with', () => {
    expect(sortOrderOf(listProps({ sort: 'total' }), 'total')).toBe('ascend');
    expect(sortOrderOf(listProps({ sort: '-total' }), 'total')).toBe('descend');
    expect(sortOrderOf(listProps({ sort: '-total' }), 'name')).toBeNull();
    expect(sortOrderOf(listProps({ sort: null }), 'total')).toBeNull();
    expect(
        sortOrderOf(listProps({ sort: '-customer.name' }), 'customer.name'),
    ).toBe('descend');
});

test('a column filter of the table is not a list filter', () => {
    const props = tableProps(listProps());

    props.onChange?.(
        { current: 2, pageSize: 20 },
        { status: ['open'] },
        {},
        extra('filter'),
    );

    expect(get).not.toHaveBeenCalled();
});

test('submitting the search form puts its values in the URL, and reset clears them', () => {
    at('/orders?page=3&per_page=50&filter[status]=paid');
    const props = tableProps(listProps());

    props.onSubmit?.({ status: 'open', customer: '' });
    props.onReset?.();

    expect(get.mock.calls).toEqual([
        ['/orders?page=1&per_page=50&filter[status]=open', {}, onTable],
        ['/orders?page=1&per_page=50', {}, onTable],
    ]);
});

test('a search value that is a list goes to the URL as repeated brackets', () => {
    const props = tableProps(listProps());

    props.onSubmit?.({ tags: ['a', 'b'], name: 'Order 22' });

    expect(get).toHaveBeenCalledWith(
        '/orders?page=1&filter[tags][]=a&filter[tags][]=b&filter[name]=Order+22',
        {},
        onTable,
    );
});

/** The columns of the list: each sortable one shows the sort the list has. */
function columns(list: ListProps<Order>): ProColumns<Order>[] {
    return [
        {
            title: 'Name',
            dataIndex: 'name',
            sorter: true,
            sortOrder: sortOrderOf(list, 'name'),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            sorter: true,
            sortOrder: sortOrderOf(list, 'total'),
            search: false,
        },
    ];
}

/** A list on a ProTable the way a page writes it. */
function Orders({ list }: { list: ListProps<Order> }) {
    const table = useInertiaTable(list, 'orders');

    return (
        <ProTable<Order>
            rowKey="id"
            columns={columns(list)}
            options={false}
            {...table}
        />
    );
}

/** The search form's field for the name column. */
const nameField = () => screen.getByLabelText('Name') as HTMLInputElement;

const rows: Order[] = [
    { id: 21, name: 'Order 21', total: 210 },
    { id: 22, name: 'Order 22', total: 220 },
];

test('ProTable shows the rows of the page and the total, and a click on a page visits the list', async () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    render(<Orders list={listProps({ rows })} />);

    expect(screen.getByText('Order 21')).toBeTruthy();
    expect(screen.getByText('Total 45 items')).toBeTruthy();
    expect(get).not.toHaveBeenCalled();

    await userEvent.click(within(screen.getByTitle('3')).getByRole('button'));

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/orders?page=3', {}, onTable);
});

test('a click on a column title sorts through the URL', async () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    render(<Orders list={listProps({ rows })} />);

    await userEvent.click(screen.getByRole('columnheader', { name: /Total/ }));

    expect(get).toHaveBeenCalledWith('/orders?page=1&sort=total', {}, onTable);
});

test('a list loaded sorted shows the arrow on its column, and on no other', () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    render(<Orders list={listProps({ rows, sort: '-total' })} />);

    const header = (name: RegExp) =>
        screen.getByRole('columnheader', { name }).getAttribute('aria-sort');

    expect(header(/Total/)).toBe('descending');
    expect(header(/Name/)).toBeNull();
});

// Pro names a form at random when it has no name, and a field's id starts
// with the form's name, so the server's ids would not be the browser's.
test('the search form has the name of the list, so its fields have the same ids on the server as in the browser', () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    const ids = (root: ParentNode) =>
        [...root.querySelectorAll('form input[id]')].map((field) => field.id);
    const server = document.createElement('div');
    server.innerHTML = renderToString(<Orders list={listProps({ rows })} />);
    const { container } = render(<Orders list={listProps({ rows })} />);

    expect(ids(container)).toEqual(['orders_search_name']);
    expect(ids(server)).toEqual(ids(container));
});

// Pro's search form lays its fields out by its width, which it takes as
// 1024px on the server and reads from the page in the browser.
test("the search form has the server's columns while React hydrates the page, then Pro's own", async () => {
    const searches: unknown[] = [];

    function SearchOf({ list }: { list: ListProps<Order> }) {
        searches.push(useInertiaTable(list, 'orders').search);

        return null;
    }

    const server = document.createElement('div');
    server.innerHTML = renderToString(<SearchOf list={listProps()} />);

    expect(searches).toEqual([{ labelWidth: 'auto', span: 8 }]);

    searches.length = 0;
    await act(async () => {
        hydrateRoot(server, <SearchOf list={listProps()} />);
    });

    expect(searches[0]).toEqual({ labelWidth: 'auto', span: 8 });
    expect(searches.at(-1)).toEqual({ labelWidth: 'auto' });

    // A page the browser renders by itself has no server page to match. The
    // page sweep (tests/Browser/PageSweepTest.php) checks the hydration itself.
    expect(tableProps(listProps()).search).toEqual({ labelWidth: 'auto' });
});

test('the search form starts with the filters of the URL, submits them and starts the list over', async () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    at('/orders?page=2&filter[name]=Order');
    render(<Orders list={listProps({ rows, filters: { name: 'Order' } })} />);

    const search = nameField();

    expect(search.value).toBe('Order');

    await userEvent.clear(search);
    await userEvent.type(search, 'Order 22');
    await userEvent.click(screen.getByRole('button', { name: /查\s*询/ }));

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
        '/orders?page=1&filter[name]=Order+22',
        {},
        onTable,
    );
});

test('the search form is empty again once reset has cleared the filters', async () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    at('/orders?page=2&filter[name]=Order');
    const { rerender } = render(
        <Orders list={listProps({ rows, filters: { name: 'Order' } })} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /重\s*置/ }));

    expect(get).toHaveBeenCalledWith('/orders?page=1', {}, onTable);

    // The server answers with the list without filters.
    at('/orders');
    await act(async () => {
        rerender(<Orders list={listProps({ rows, filters: [] })} />);
    });

    expect(nameField().value).toBe('');
});

test('the search form follows the filters when the server sends other ones, as on the back button', async () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    const { rerender } = render(<Orders list={listProps({ rows })} />);

    await act(async () => {
        rerender(
            <Orders
                list={listProps({ rows, filters: { name: 'Order 21' } })}
            />,
        );
    });

    expect(nameField().value).toBe('Order 21');
});

test('a visit that keeps the filters leaves what the user typed in the search form', async () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    const { rerender } = render(
        <Orders list={listProps({ rows, filters: { name: 'Order' } })} />,
    );

    await userEvent.type(nameField(), ' 22');

    await act(async () => {
        rerender(
            <Orders
                list={listProps({ rows, page: 3, filters: { name: 'Order' } })}
            />,
        );
    });

    expect(nameField().value).toBe('Order 22');
});

test('the rows per page menu is there for a list of fewer than 51 rows, where antd alone would hide it', () => {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: true });
    render(<Orders list={listProps({ rows })} />);

    expect(
        document.querySelector('.ant-pagination-options-size-changer'),
    ).not.toBeNull();
});
