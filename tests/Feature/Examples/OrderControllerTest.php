<?php

use App\Models\User;
use Faker\Factory;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The orders example: 137 made-up orders, the same on every request, listed,
 * shown and edited through the real list and form glue. Nothing is saved: a
 * write is checked, then answered with a toast.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/**
 * An order as the long form sends it.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function exampleOrderInput(array $overrides = []): array
{
    return [
        'customer' => 'Acme Ltd',
        'ordered_at' => '2026-11-26',
        'items' => [['name' => 'Desk lamp', 'quantity' => 2]],
        'notes' => null,
        ...$overrides,
    ];
}

describe('index', function () {
    test('the list shows the first 20 of the 137 orders, with only the columns the table shows', function () {
        $this->get(route('examples.orders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('examples/orders/index')
                ->where('hasOrders', true)
                ->where('orders.total', 137)
                ->has('orders.rows', 20)
                ->has('orders.rows.0', fn (Assert $row) => $row
                    ->where('id', 1)
                    ->where('number', 'SO-2026-0001')
                    ->hasAll(['customer', 'status', 'total', 'ordered_at'])));
    });

    test('the list is filtered by status', function () {
        $this->get(route('examples.orders.index', ['filter' => ['status' => 'paid']]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.filters', ['status' => 'paid'])
                ->where('orders.rows', fn ($rows) => collect($rows)->isNotEmpty()
                    && collect($rows)->every(fn (array $row) => $row['status'] === 'paid')));
    });

    test('the list is filtered by a part of the customer, in any case, and of the number', function () {
        $customer = $this->get(route('examples.orders.index'))->inertiaProps('orders.rows.0.customer');

        $this->get(route('examples.orders.index', ['filter' => ['customer' => strtoupper(substr($customer, 1, 4))]]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.rows', fn ($rows) => collect($rows)->pluck('customer')->contains($customer)));

        $this->get(route('examples.orders.index', ['filter' => ['number' => '0137']]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.total', 1)
                ->where('orders.rows.0.number', 'SO-2026-0137'));
    });

    // Every order number has a 0 in it (SO-2026-…), and no customer has.
    test('a filter of 0 is a filter too', function () {
        $this->get(route('examples.orders.index', ['filter' => ['customer' => '0']]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.filters', ['customer' => '0'])
                ->where('orders.total', 0));
    });

    test('the list is sorted by total, largest first', function () {
        $this->get(route('examples.orders.index', ['sort' => '-total']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.sort', '-total')
                ->where('orders.rows', fn ($rows) => collect($rows)->pluck('total')->all()
                    === collect($rows)->pluck('total')->sortDesc()->values()->all()));
    });

    test('the example switch shows the list with no orders at all', function () {
        $this->get(route('examples.orders.index', ['empty' => 1]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('hasOrders', false)
                ->where('orders.total', 0));
    });
});

describe('show', function () {
    test('an order shows with its items and its history, the same on every request', function () {
        $order = fn () => $this->get(route('examples.orders.show', 5))
            ->assertInertia(fn (Assert $page) => $page
                ->component('examples/orders/show')
                ->where('order.number', 'SO-2026-0005')
                ->has('order.items')
                ->has('order.history'))
            ->inertiaProps('order');

        expect($order())->toBe($order());
    });

    test('the lines of an order are numbered, so two lines of one product stay apart', function () {
        $items = $this->get(route('examples.orders.show', 5))->inertiaProps('order.items');

        expect(array_column($items, 'line'))->toBe(range(1, count($items)));
    });

    test('an order that does not exist is not found', function () {
        $this->get(route('examples.orders.show', 138))->assertNotFound();
    });

    test('making the orders leaves the rest of the request random', function () {
        // Faker's seed is PHP's own: left seeded, every request would draw the same numbers after it.
        $this->get(route('examples.orders.show', 5));
        $first = mt_rand();
        $this->get(route('examples.orders.show', 5));

        expect(mt_rand())->not->toBe($first);
    });

    test('a Faker left over from before is freed before the orders are made, so it cannot reseed them halfway', function () {
        // A Faker generator reseeds PHP's numbers at random when it is freed, and
        // its providers point back at it, so PHP frees it only when its cycle
        // collector runs: at any moment, also while the orders are made. With
        // the collector off, only an explicit collection frees it.
        $collecting = gc_enabled();
        gc_disable();

        try {
            $leftover = Factory::create();
            $freed = WeakReference::create($leftover);
            unset($leftover);

            $this->get(route('examples.orders.show', 5))->assertOk();

            expect($freed->get())->toBeNull();
        } finally {
            if ($collecting) {
                gc_enable();
            }
        }
    });
});

describe('create and edit', function () {
    test('the new order form has no order', function () {
        $this->get(route('examples.orders.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('examples/orders/form')
                ->where('order', null));
    });

    test('the edit form has the order to edit', function () {
        $this->get(route('examples.orders.edit', 7))
            ->assertInertia(fn (Assert $page) => $page
                ->component('examples/orders/form')
                ->where('order.id', 7)
                ->where('order.number', 'SO-2026-0007')
                ->has('order.items'));
    });

    test('an order that does not exist cannot be edited', function () {
        $this->get(route('examples.orders.edit', 999))->assertNotFound();
    });
});

describe('store', function () {
    test('an empty order is refused, with a message for each field', function () {
        $this->post(route('examples.orders.store'), [])
            ->assertSessionHasErrors([
                'customer' => 'The customer field is required.',
                'ordered_at' => 'The order date field is required.',
                'items' => 'Add at least one product.',
            ]);
    });

    test('an order that is not a draft needs its items, however it says so', function (mixed $draft) {
        $this->post(route('examples.orders.store'), ['customer' => 'Acme Ltd', 'ordered_at' => '2026-11-26', 'draft' => $draft])
            ->assertSessionHasErrors(['items' => 'Add at least one product.']);
    })->with([
        'false' => false,
        "'0'" => '0',
        '0' => 0,
    ]);

    test('an item with no name or a quantity under 1 is refused under that item', function () {
        $this->post(route('examples.orders.store'), exampleOrderInput(['items' => [['name' => '', 'quantity' => 0]]]))
            ->assertSessionHasErrors([
                'items.0.name' => 'The product field is required.',
                'items.0.quantity' => 'The quantity field must be at least 1.',
            ]);
    });

    test('an order goes back to the list with a toast', function () {
        $this->post(route('examples.orders.store'), exampleOrderInput())
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('examples.orders.index'))
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Order created.']);
    });

    test('a draft needs no items, and goes back to the list as it was', function () {
        $list = route('examples.orders.index', ['page' => 3]);

        $this->from($list)
            ->post(route('examples.orders.store'), ['customer' => 'Acme Ltd', 'ordered_at' => '2026-11-26', 'draft' => true])
            ->assertSessionHasNoErrors()
            ->assertRedirect($list)
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Draft order created.']);
    });

    test('a check while typing of one item\'s name reaches the rule for every item\'s name', function () {
        $this->withPrecognition()
            ->withHeader('Precognition-Validate-Only', 'items.0.name')
            ->postJson(route('examples.orders.store'), ['items' => [['name' => '', 'quantity' => 1]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.name' => 'The product field is required.'])
            ->assertJsonMissingValidationErrors(['customer', 'items.0.quantity']);
    });
});

describe('update and destroy', function () {
    test('a changed order goes to its page with a toast', function () {
        $this->put(route('examples.orders.update', 7), exampleOrderInput())
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('examples.orders.show', 7))
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Order updated.']);
    });

    test('an order that does not exist cannot be changed', function () {
        $this->put(route('examples.orders.update', 999), exampleOrderInput())->assertNotFound();
    });

    test('deleting from the list goes back to the list as it was', function () {
        $list = route('examples.orders.index', ['page' => 3, 'filter' => ['status' => 'paid']]);

        $this->from($list)
            ->delete(route('examples.orders.destroy', 7))
            ->assertRedirect($list)
            ->assertInertiaFlash('toast', ['type' => 'success', 'message' => 'Order deleted.']);
    });

    test('deleting from the order\'s own page goes to the list, whatever its query string', function (array $query) {
        $this->from(route('examples.orders.show', [7, ...$query]))
            ->delete(route('examples.orders.destroy', 7))
            ->assertRedirect(route('examples.orders.index'));
    })->with([
        'no query' => [[]],
        'a query' => [['tab' => 'history']],
    ]);
});
