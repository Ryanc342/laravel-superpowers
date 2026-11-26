<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Reads a list's state from the URL: the page, how many rows a page shows, the
 * sort and the filters. A controller type-hints a subclass of it, names the
 * columns the list may be sorted by and the filters it has, and hands it the
 * rows. The page's `useInertiaTable` hook is the other half.
 *
 * It never fails. A hand-edited URL or an old bookmark still loads the list:
 * a value the rules do not accept is dropped before validation, and the
 * default is used in its place. Read the values only through `perPage()`,
 * `sort()`, `filterValues()` and `paginate()`: `input('sort')` is the raw text.
 *
 * Two lists on one page do not share keys, because each has its own `$prefix`.
 * A list with the prefix `orders_` reads `orders_page`, `orders_per_page`,
 * `orders_sort` and `orders_filter[status]`.
 */
abstract class ListRequest extends FormRequest
{
    /**
     * The start of this list's query keys: `''`, or `orders_` for the list of orders.
     */
    protected string $prefix = '';

    /**
     * The columns the list may be sorted by, in the order the page names them.
     * `sort=total` sorts by `total` and `sort=-total` sorts it descending.
     *
     * @return list<string>
     */
    abstract protected function sortable(): array;

    /**
     * The rules of the filters, by name: `['status' => ['in:paid,open']]`.
     * A filter is optional, so its rules must not require it.
     *
     * @return array<string, array<mixed>>
     */
    protected function filters(): array
    {
        return [];
    }

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->listRules();
    }

    /**
     * The request's data without the list values the rules reject, so the
     * validation that follows cannot fail on them.
     *
     * @return array<string, mixed>
     */
    public function validationData(): array
    {
        $data = parent::validationData();

        $rejected = Validator::make($data, $this->listRules())->errors()->keys();

        foreach ($rejected as $key) {
            Arr::forget($data, $key);
        }

        return $data;
    }

    /**
     * How many rows a page shows: one of the configured choices.
     */
    public function perPage(): int
    {
        $perPage = $this->validValue('per_page');

        return $perPage === null ? (int) config('lists.per_page') : (int) $perPage;
    }

    /**
     * The sort, or null when the URL has none that the list allows.
     *
     * @return array{column: string, direction: 'asc'|'desc'}|null
     */
    public function sort(): ?array
    {
        $sort = $this->validValue('sort');

        if (! is_string($sort)) {
            return null;
        }

        return str_starts_with($sort, '-')
            ? ['column' => substr($sort, 1), 'direction' => 'desc']
            : ['column' => $sort, 'direction' => 'asc'];
    }

    /**
     * The filters the list has and the URL gave valid values for, by name
     * without the prefix. A filter with an empty value is not given.
     *
     * @return array<string, mixed>
     */
    public function filterValues(): array
    {
        $filters = Arr::get($this->validated(), $this->prefix.'filter');

        return is_array($filters) ? array_filter($filters, filled(...)) : [];
    }

    /**
     * One page of the rows, sorted by the URL's sort. A page past the end is
     * the last page. The links keep the rest of the query string.
     *
     * @param  EloquentBuilder<*>|QueryBuilder|Collection<array-key, mixed>  $rows
     * @return LengthAwarePaginator<array-key, mixed>
     */
    public function paginate(EloquentBuilder|QueryBuilder|Collection $rows): LengthAwarePaginator
    {
        $sort = $this->sort();

        if ($sort !== null) {
            $rows = $rows instanceof Collection
                ? $rows->sortBy($sort['column'], SORT_REGULAR, $sort['direction'] === 'desc')
                : $rows->orderBy($sort['column'], $sort['direction']);
        }

        $page = $this->page();
        $paginator = $this->paginateAt($rows, $page);

        if ($page > $paginator->lastPage()) {
            $paginator = $this->paginateAt($rows, $paginator->lastPage());
        }

        return $paginator->withQueryString();
    }

    /**
     * What a list's Inertia prop holds (`ListProps` in `resources/js/ui/list.ts`).
     * `$map` turns a row into what the page receives, such as a resource.
     *
     * @param  LengthAwarePaginator<array-key, mixed>  $page
     * @param  (callable(mixed): mixed)|null  $map
     * @return array{rows: list<mixed>, total: int, page: int, perPage: int, perPageOptions: list<int>, sort: ?string, filters: array<string, mixed>, prefix: string}
     */
    public function toProps(LengthAwarePaginator $page, ?callable $map = null): array
    {
        $rows = $page->getCollection();
        $sort = $this->validValue('sort');

        return [
            'rows' => array_values(($map === null ? $rows : $rows->map($map))->all()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'perPage' => $page->perPage(),
            'perPageOptions' => array_values(config('lists.per_page_options')),
            'sort' => is_string($sort) ? $sort : null,
            'filters' => $this->filterValues(),
            'prefix' => $this->prefix,
        ];
    }

    /**
     * The rules of the list's own keys.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    private function listRules(): array
    {
        $sortable = $this->sortable();
        $descending = array_map(fn (string $column) => '-'.$column, $sortable);

        $rules = [
            $this->prefix.'page' => ['integer', 'min:1'],
            $this->prefix.'per_page' => ['integer', Rule::in(config('lists.per_page_options'))],
            $this->prefix.'sort' => ['string', Rule::in([...$sortable, ...$descending])],
        ];

        foreach ($this->filters() as $name => $filterRules) {
            $rules[$this->prefix.'filter.'.$name] = $filterRules;
        }

        return $rules;
    }

    /**
     * A validated value of the list's own keys, without the prefix in its name, or null when there is none.
     */
    private function validValue(string $key): mixed
    {
        $value = Arr::get($this->validated(), $this->prefix.$key);

        return filled($value) ? $value : null;
    }

    /**
     * The page number: at least 1, and no more than the offset of a query can hold.
     */
    private function page(): int
    {
        $page = $this->validValue('page');

        return $page === null ? 1 : min((int) $page, intdiv(PHP_INT_MAX, $this->perPage()));
    }

    /**
     * @param  EloquentBuilder<*>|QueryBuilder|Collection<array-key, mixed>  $rows
     * @return LengthAwarePaginator<array-key, mixed>
     */
    private function paginateAt(EloquentBuilder|QueryBuilder|Collection $rows, int $page): LengthAwarePaginator
    {
        $pageName = $this->prefix.'page';

        if ($rows instanceof Collection) {
            return new LengthAwarePaginator(
                $rows->forPage($page, $this->perPage())->values(),
                $rows->count(),
                $this->perPage(),
                $page,
                ['path' => Paginator::resolveCurrentPath(), 'pageName' => $pageName],
            );
        }

        return $rows->paginate($this->perPage(), ['*'], $pageName, $page);
    }
}
