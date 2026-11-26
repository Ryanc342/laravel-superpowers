<?php

use App\Http\Requests\ListRequest;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Route;

/*
 * ListRequest reads a list's page, rows per page, sort and filters from the
 * URL. A URL somebody edited by hand, or an old bookmark, must still load the
 * list: a value it does not accept is dropped and the default is used.
 */

class OrdersTestListRequest extends ListRequest
{
    /**
     * @return list<string>
     */
    protected function sortable(): array
    {
        return ['name', 'total'];
    }

    /**
     * @return array<string, list<string>>
     */
    protected function filters(): array
    {
        return [
            'status' => ['in:paid,open'],
            'note' => ['nullable', 'string', 'max:20'],
            'tags' => ['array'],
            'tags.*' => ['in:a,b,c'],
        ];
    }
}

class PrefixedOrdersTestListRequest extends OrdersTestListRequest
{
    protected string $prefix = 'orders_';
}

class UsersTestListRequest extends ListRequest
{
    /**
     * @return list<string>
     */
    protected function sortable(): array
    {
        return ['name'];
    }
}

/**
 * 45 orders: Order 01 to Order 45, totals 10 to 450, every third one open.
 *
 * @return Collection<int, array{id: int, name: string, total: int, status: string}>
 */
function orders(): Collection
{
    return collect(range(1, 45))->map(fn (int $number) => [
        'id' => $number,
        'name' => sprintf('Order %02d', $number),
        'total' => $number * 10,
        'status' => $number % 3 === 0 ? 'open' : 'paid',
    ]);
}

/**
 * The page a list route sends: what `toProps` returns, with the link to the next page.
 *
 * @return array<string, mixed>
 */
function listPage(ListRequest $request): array
{
    $page = $request->paginate(orders());

    return [...$request->toProps($page), 'next' => $page->nextPageUrl()];
}

beforeEach(function () {
    Route::get('/test-lists/orders', fn (OrdersTestListRequest $request) => listPage($request));
    Route::get('/test-lists/prefixed', fn (PrefixedOrdersTestListRequest $request) => listPage($request));
});

test('a list with no query shows the first page of 20', function () {
    $this->getJson('/test-lists/orders')
        ->assertOk()
        ->assertJsonCount(20, 'rows')
        ->assertJsonPath('rows.0.name', 'Order 01')
        ->assertJsonPath('total', 45)
        ->assertJsonPath('page', 1)
        ->assertJsonPath('perPage', 20)
        ->assertJsonPath('sort', null)
        ->assertJsonPath('filters', [])
        ->assertJsonPath('prefix', '');
});

test('the list takes the rows per page from the configured choices', function () {
    $this->getJson('/test-lists/orders?per_page=50')
        ->assertOk()
        ->assertJsonCount(45, 'rows')
        ->assertJsonPath('perPage', 50)
        ->assertJsonPath('page', 1);
});

test('the props carry the rows-per-page choices', function () {
    $this->getJson('/test-lists/orders')
        ->assertJsonPath('perPageOptions', [10, 20, 50, 100]);
});

test('the choices and the default come from config/lists.php', function () {
    config(['lists.per_page_options' => [5, 15], 'lists.per_page' => 15]);

    $this->getJson('/test-lists/orders')
        ->assertJsonPath('perPage', 15)
        ->assertJsonPath('perPageOptions', [5, 15]);

    $this->getJson('/test-lists/orders?per_page=5')->assertJsonPath('perPage', 5);
    $this->getJson('/test-lists/orders?per_page=20')->assertJsonPath('perPage', 15);
});

test('a sort with a minus sign is descending', function () {
    $this->getJson('/test-lists/orders?sort=-total')
        ->assertOk()
        ->assertJsonPath('rows.0.name', 'Order 45')
        ->assertJsonPath('rows.19.name', 'Order 26')
        ->assertJsonPath('sort', '-total');

    $this->getJson('/test-lists/orders?sort=name')
        ->assertJsonPath('rows.0.name', 'Order 01')
        ->assertJsonPath('sort', 'name');
});

test('a sort the list does not allow is ignored', function () {
    $this->getJson('/test-lists/orders?sort=password')
        ->assertOk()
        ->assertJsonPath('rows.0.name', 'Order 01')
        ->assertJsonPath('sort', null);

    $this->getJson('/test-lists/orders?sort=-password')
        ->assertOk()
        ->assertJsonPath('sort', null);
});

test('a rows-per-page value that is not a choice falls back to the default', function (string $query) {
    $this->getJson("/test-lists/orders?{$query}")
        ->assertOk()
        ->assertJsonPath('perPage', 20)
        ->assertJsonCount(20, 'rows');
})->with([
    'not a choice' => 'per_page=7',
    'too many' => 'per_page=100000',
    'zero' => 'per_page=0',
    'negative' => 'per_page=-20',
    'text' => 'per_page=lots',
    'a list' => 'per_page[]=50',
    'empty' => 'per_page=',
]);

test('a page past the end shows the last page', function () {
    $this->getJson('/test-lists/orders?page=999')
        ->assertOk()
        ->assertJsonPath('page', 3)
        ->assertJsonCount(5, 'rows')
        ->assertJsonPath('rows.0.name', 'Order 41')
        ->assertJsonPath('next', null);

    $this->getJson('/test-lists/orders?page=9223372036854775807')
        ->assertOk()
        ->assertJsonPath('page', 3);
});

test('a page that is not a page number shows the first page', function (string $query) {
    $this->getJson("/test-lists/orders?{$query}")
        ->assertOk()
        ->assertJsonPath('page', 1)
        ->assertJsonPath('rows.0.name', 'Order 01');
})->with([
    'zero' => 'page=0',
    'negative' => 'page=-3',
    'text' => 'page=last',
    'a fraction' => 'page=1.5',
    'a list' => 'page[]=2',
    'empty' => 'page=',
    'too large for an integer' => 'page=99999999999999999999',
]);

test('a filter the list defines is read and a value it rejects is ignored', function () {
    $this->getJson('/test-lists/orders?filter[status]=paid')
        ->assertOk()
        ->assertJsonPath('filters', ['status' => 'paid']);

    $this->getJson('/test-lists/orders?filter[status]=nope')
        ->assertOk()
        ->assertJsonPath('filters', [])
        ->assertJsonPath('total', 45);
});

test('a malformed filter is ignored', function (string $query) {
    $this->getJson("/test-lists/orders?{$query}")
        ->assertOk()
        ->assertJsonPath('filters', [])
        ->assertJsonPath('total', 45);
})->with([
    'a text' => 'filter=paid',
    'a list' => 'filter[status][]=paid',
    'a nested list' => 'filter[status][a][b]=paid',
    'a filter the list does not have' => 'filter[secret]=1',
    'a text for a list filter' => 'filter[tags]=a',
    'a nested list in a list filter' => 'filter[tags][0][]=a',
    'a value that is not allowed in a list filter' => 'filter[tags][]=zzz',
]);

test('a filter can be a list, in the order it came', function () {
    $this->getJson('/test-lists/orders?filter[tags][]=c&filter[tags][]=a&filter[status]=open')
        ->assertOk()
        ->assertJsonPath('filters', ['status' => 'open', 'tags' => ['c', 'a']]);

    $this->getJson('/test-lists/orders?filter[tags][0]=b&filter[tags][1]=a')
        ->assertJsonPath('filters', ['tags' => ['b', 'a']]);
});

test('an element of a list filter that is not allowed is dropped and the rest stays a list', function (string $query, array $tags) {
    $this->getJson("/test-lists/orders?{$query}")
        ->assertOk()
        ->assertJsonPath('filters', ['tags' => $tags])
        ->assertJsonPath('total', 45);
})->with([
    'the first one' => ['filter[tags][]=zzz&filter[tags][]=b&filter[tags][]=a', ['b', 'a']],
    'one in the middle' => ['filter[tags][]=a&filter[tags][]=zzz&filter[tags][]=c', ['a', 'c']],
    'the last one' => ['filter[tags][]=a&filter[tags][]=b&filter[tags][]=zzz', ['a', 'b']],
    'a nested list among good ones' => ['filter[tags][]=a&filter[tags][1][]=b&filter[tags][]=c', ['a', 'c']],
]);

test('a filter with an empty value is not given', function () {
    $this->getJson('/test-lists/orders?filter[note]=&filter[status]=open')
        ->assertOk()
        ->assertJsonPath('filters', ['status' => 'open']);
});

test('one bad value does not take the good ones with it', function () {
    $this->getJson('/test-lists/orders?per_page=7&sort=-total&page=2&filter[status]=nope')
        ->assertOk()
        ->assertJsonPath('perPage', 20)
        ->assertJsonPath('sort', '-total')
        ->assertJsonPath('page', 2)
        ->assertJsonPath('rows.0.name', 'Order 25');
});

test('a prefixed list reads its own keys and ignores the plain ones', function () {
    $this->getJson('/test-lists/prefixed?orders_page=2&orders_per_page=10&orders_sort=-total&orders_filter[status]=paid')
        ->assertOk()
        ->assertJsonPath('page', 2)
        ->assertJsonPath('perPage', 10)
        ->assertJsonPath('sort', '-total')
        ->assertJsonPath('filters', ['status' => 'paid'])
        ->assertJsonPath('prefix', 'orders_')
        ->assertJsonPath('rows.0.name', 'Order 35');

    $this->getJson('/test-lists/prefixed?page=2&per_page=10&sort=-total&filter[status]=paid')
        ->assertOk()
        ->assertJsonPath('page', 1)
        ->assertJsonPath('perPage', 20)
        ->assertJsonPath('sort', null)
        ->assertJsonPath('filters', []);
});

test('a prefixed list reads a list filter and drops a bad element of it', function () {
    $this->getJson('/test-lists/prefixed?orders_filter[tags][]=zzz&orders_filter[tags][]=a&filter[tags][]=b')
        ->assertOk()
        ->assertJsonPath('filters', ['tags' => ['a']]);
});

test('a bad value of a prefixed list is dropped too', function () {
    $this->getJson('/test-lists/prefixed?orders_page=999&orders_per_page=7&orders_sort=password&orders_filter[status]=nope')
        ->assertOk()
        ->assertJsonPath('page', 3)
        ->assertJsonPath('perPage', 20)
        ->assertJsonPath('sort', null)
        ->assertJsonPath('filters', []);
});

test('the links keep the rest of the query and use the list page name', function () {
    $next = $this->getJson('/test-lists/prefixed?orders_per_page=10&other_page=3&orders_filter[status]=paid&orders_filter[tags][]=a&orders_filter[tags][]=b')
        ->json('next');

    parse_str((string) parse_url($next, PHP_URL_QUERY), $query);

    expect($query)->toMatchArray([
        'orders_page' => '2',
        'orders_per_page' => '10',
        'other_page' => '3',
        'orders_filter' => ['status' => 'paid', 'tags' => ['a', 'b']],
    ]);
});

test('the rows can be mapped', function () {
    Route::get('/test-lists/mapped', function (OrdersTestListRequest $request) {
        return $request->toProps(
            $request->paginate(orders()),
            fn (array $order) => ['label' => strtoupper($order['name'])],
        );
    });

    $this->getJson('/test-lists/mapped?per_page=10')
        ->assertJsonPath('rows.0', ['label' => 'ORDER 01'])
        ->assertJsonCount(10, 'rows');
});

test('a list over a query is sorted, paged and clamped by the database', function () {
    Route::get('/test-lists/users', function (UsersTestListRequest $request) {
        return $request->toProps(
            $request->paginate(User::query()),
            fn (User $user) => $user->name,
        );
    });

    User::factory()->count(25)->sequence(fn ($sequence) => [
        'name' => sprintf('User %02d', $sequence->index + 1),
    ])->create();

    $this->getJson('/test-lists/users?per_page=10&sort=-name&page=2')
        ->assertOk()
        ->assertJsonPath('total', 25)
        ->assertJsonPath('rows.0', 'User 15')
        ->assertJsonCount(10, 'rows');

    $this->getJson('/test-lists/users?per_page=10&page=999&sort=name')
        ->assertOk()
        ->assertJsonPath('page', 3)
        ->assertJsonPath('rows', ['User 21', 'User 22', 'User 23', 'User 24', 'User 25']);

    $this->getJson('/test-lists/users?page=9223372036854775807&sort=password')
        ->assertOk()
        ->assertJsonPath('page', 2);
});

test('an empty list is on page 1 of 1', function () {
    Route::get('/test-lists/empty', function (UsersTestListRequest $request) {
        return $request->toProps($request->paginate(collect()));
    });

    $this->getJson('/test-lists/empty?page=5')
        ->assertOk()
        ->assertJsonPath('rows', [])
        ->assertJsonPath('total', 0)
        ->assertJsonPath('page', 1);
});
