import { router } from '@inertiajs/react';
import type {
    ProFormInstance,
    ProTableProps,
} from '@ant-design/pro-components';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { Key, RefObject } from 'react';
import { tChoice } from '@/lib/i18n';

/**
 * The glue between a list on the server and `ProTable`. A list's page, rows
 * per page, sort and filters live in the URL, so a visit to a detail page and
 * back shows the same page, and rows per page is nowhere else. The server half
 * is `App\Http\Requests\ListRequest`: it reads the URL and sends the list as
 * one prop, which is `ListProps`. `useInertiaTable` turns that prop into
 * `ProTable`'s props, and every change the user makes becomes an Inertia
 * visit that reloads only that prop.
 *
 * Two lists on one page have their own `prefix` (`orders_`), and so their own
 * query keys: `orders_page`, `orders_per_page`, `orders_sort` and
 * `orders_filter[status]`.
 */

/** A list as `ListRequest::toProps` sends it. */
export type ListProps<Row> = {
    rows: Row[];
    total: number;
    page: number;
    perPage: number;
    /** The choices for rows per page: the server validates `per_page` against them. */
    perPageOptions: number[];
    /** `total` or `-total` (descending), or null for the list's own order. */
    sort: string | null;
    /** The filters in force, by name. PHP sends none as `[]`, not `{}`. */
    filters: Record<string, unknown> | [];
    /** The start of this list's query keys: `''`, or `orders_`. */
    prefix: string;
};

/** What the user changed. Anything not named stays as the URL has it. */
export type ListChange = {
    page?: number;
    perPage?: number;
    /** `total` or `-total`, or null to clear the sort. */
    sort?: string | null;
    /**
     * All the filters at once: they replace the URL's. A date goes in as text,
     * which is what Pro's search form gives for a date column.
     */
    filters?: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}

/** A filter that says nothing. A switch that is off is not empty: it filters. */
function isEmptyFilter(value: unknown): boolean {
    return (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
    );
}

/** Whether a filter value has parts of its own, so a list of them needs the index of each. */
function isStructured(value: unknown): boolean {
    return Array.isArray(value) || isPlainObject(value);
}

/**
 * Adds a filter value to the query under `key`, as the text PHP reads back: a
 * list of values as `key[]` repeated, in order, an object as `key[name]`, and
 * a switch as `1` or `0`, which is what Laravel's `boolean` rule accepts.
 */
function addFilter(query: URLSearchParams, key: string, value: unknown): void {
    if (isEmptyFilter(value)) {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) =>
            addFilter(
                query,
                isStructured(item) ? `${key}[${index}]` : `${key}[]`,
                item,
            ),
        );
    } else if (isPlainObject(value)) {
        for (const [name, item] of Object.entries(value)) {
            addFilter(query, `${key}[${name}]`, item);
        }
    } else if (typeof value === 'boolean') {
        query.append(key, value ? '1' : '0');
    } else {
        query.append(key, String(value));
    }
}

/**
 * The query string after a change. It keeps every key the change does not
 * name exactly as it was, repeated and bracketed keys of another list
 * included (`items_filter[status][]=paid&items_filter[status][]=open`), and
 * writes this list's keys under its prefix. A list goes back to its first page
 * when anything but the page changes, because the page that was shown may not
 * exist any more. Empty filters are left out.
 */
export function listQuery(
    list: ListProps<unknown>,
    change: ListChange,
    current: URLSearchParams,
): URLSearchParams {
    const { prefix } = list;
    const filterPrefix = `${prefix}filter[`;
    const query = new URLSearchParams(current);

    const changesTheRows =
        change.perPage !== undefined ||
        change.sort !== undefined ||
        change.filters !== undefined;

    // The page goes first, so a key that is new sits ahead of the rest in the address.
    if (change.page !== undefined) {
        query.set(`${prefix}page`, String(change.page));
    } else if (changesTheRows) {
        query.set(`${prefix}page`, '1');
    }

    if (change.perPage !== undefined) {
        query.set(`${prefix}per_page`, String(change.perPage));
    }

    if (change.sort === null || change.sort === '') {
        query.delete(`${prefix}sort`);
    } else if (change.sort !== undefined) {
        query.set(`${prefix}sort`, change.sort);
    }

    if (change.filters !== undefined) {
        for (const key of new Set(query.keys())) {
            if (key.startsWith(filterPrefix)) {
                query.delete(key);
            }
        }

        for (const [name, value] of Object.entries(change.filters)) {
            addFilter(query, `${filterPrefix}${name}]`, value);
        }
    }

    return query;
}

type Params = Record<string, unknown>;

type Table<Row> = ProTableProps<Row, Params>;

/** The settings of `ProTable`'s search form. */
type SearchSettings<Row> = Exclude<Table<Row>['search'], false | undefined>;

/** The props `useInertiaTable` gives `ProTable`: spread them on it. */
export type InertiaTableProps<Row> = Required<
    Pick<
        Table<Row>,
        | 'dataSource'
        | 'pagination'
        | 'onChange'
        | 'form'
        | 'onSubmit'
        | 'onReset'
        | 'scroll'
    >
> & {
    formRef: RefObject<ProFormInstance | undefined>;
    search: SearchSettings<Row>;
};

const noSubscription = () => () => {};

/**
 * False while React hydrates the server's page, true once it has, and true
 * from the start for a page the browser renders by itself, after a visit.
 */
function useIsHydrated(): boolean {
    return useSyncExternalStore(
        noSubscription,
        () => true,
        () => false,
    );
}

/** What the sort of a table change holds that matters here: antd's `SorterResult`, for any row type. */
type Sorter = {
    field?: Key | readonly Key[];
    order?: 'ascend' | 'descend' | null;
};

/** The sort a table change names, as `total` or `-total`, or null for none. */
function sortOf(sorter: Sorter | Sorter[]): string | null {
    const active = [sorter].flat().find((one) => one.order);

    if (active?.field === undefined) {
        return null;
    }

    const column = Array.isArray(active.field)
        ? active.field.join('.')
        : String(active.field);

    return active.order === 'descend' ? `-${column}` : column;
}

/**
 * A sortable column's `sortOrder`: the arrow the list's sort puts on it, or
 * none. `field` is the column's `dataIndex`, dotted when it is nested
 * (`customer.name`). Without it, antd shows the arrow only after a click, so
 * a list loaded sorted (`?sort=-total`) would show none.
 */
export function sortOrderOf(
    list: ListProps<unknown>,
    field: string,
): 'ascend' | 'descend' | null {
    if (list.sort === field) {
        return 'ascend';
    }

    return list.sort === `-${field}` ? 'descend' : null;
}

/**
 * `ProTable`'s props for a list: its rows and paging come from the server, and
 * every change visits the list again. Name the prop the list comes in
 * (`propName`), so only it is reloaded. A column that sorts has `sorter: true`,
 * a `dataIndex` the server's `sortable()` names and its `sortOrder` from
 * `sortOrderOf`; a search field's name is the name of a filter.
 *
 * ```tsx
 * const table = useInertiaTable(orders, 'orders');
 * const columns = [
 *     { dataIndex: 'total', sorter: true, sortOrder: sortOrderOf(orders, 'total') },
 * ];
 * <ProTable rowKey="id" columns={columns} {...table} />
 * ```
 *
 * A prop the page sets in place of one of these goes after the spread, and a
 * change to the search form's settings keeps the glue's:
 * `search={{ ...table.search, defaultCollapsed: false }}`, or `search={false}`.
 */
export function useInertiaTable<Row>(
    list: ListProps<Row>,
    propName: string,
): InertiaTableProps<Row> {
    const isHydrated = useIsHydrated();
    const formRef = useRef<ProFormInstance | undefined>(undefined);
    const filters = Array.isArray(list.filters) ? {} : list.filters;

    // The search form is filled once, with the filters the page loaded with. When the
    // server sends other filters (reset, the back button) the form goes back to them.
    const filtersKey = JSON.stringify(filters);

    useEffect(() => {
        formRef.current?.resetFields();
    }, [filtersKey]);

    function visit(change: ListChange): void {
        // Brackets are left as they are, as Inertia writes them. The query is part
        // of the address and the data is empty, so Inertia does not rebuild it, and
        // a repeated key (`filter[tags][]=a&filter[tags][]=b`) stays as it is.
        const search = listQuery(
            list,
            change,
            new URLSearchParams(location.search),
        )
            .toString()
            .replaceAll('%5B', '[')
            .replaceAll('%5D', ']');

        router.get(
            search === ''
                ? location.pathname
                : `${location.pathname}?${search}`,
            {},
            {
                only: [propName],
                preserveState: true,
                preserveScroll: true,
                replace: false,
            },
        );
    }

    return {
        dataSource: list.rows,
        pagination: {
            current: list.page,
            pageSize: list.perPage,
            total: list.total,
            pageSizeOptions: list.perPageOptions,
            showSizeChanger: true,
            showTotal: (total) =>
                tChoice('Total :count item|Total :count items', total),
            // Hiding the pager hides the size menu with it. So a list that fits one
            // page of 50 still shows it: the menu is the way back to 10.
            hideOnSinglePage: list.total <= Math.min(...list.perPageOptions),
            // The same pager on every screen: antd's CSS drops the size menu
            // and some page numbers on a small one, and the table wraps the
            // rest. One that changed in JavaScript would jump once the
            // server's page hydrated.
        },
        onChange: (pagination, _filters, sorter, extra) => {
            if (extra.action === 'paginate') {
                const perPage = pagination.pageSize ?? list.perPage;

                visit(
                    perPage === list.perPage
                        ? { page: pagination.current ?? list.page }
                        : { perPage },
                );
            } else if (extra.action === 'sort') {
                visit({ sort: sortOf(sorter) });
            }
        },
        // Pro names a form at random otherwise, and its fields' ids start with
        // the name, so the server's ids would not be the browser's.
        form: { name: `${propName}_search`, initialValues: filters },
        formRef,
        // Pro's search form lays its fields out by its own width, which it
        // reads in the browser and takes as 1024px on the server, so the
        // server's page would not be the one React hydrates. Until React
        // has hydrated it, the form takes the columns Pro gives 1024px
        // (three a row, labels beside the fields); then Pro's own, by its
        // width.
        search: { labelWidth: 'auto', ...(!isHydrated && { span: 8 }) },
        onSubmit: (params) => visit({ filters: params }),
        onReset: () => visit({ filters: {} }),
        scroll: { x: 'max-content' },
    };
}
