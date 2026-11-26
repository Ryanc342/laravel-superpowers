<?php

namespace App\Concerns;

use Carbon\CarbonImmutable;
use Faker\Factory;
use Faker\Generator;
use Illuminate\Support\Collection;

/**
 * The made-up data of the page-type examples. It is the same on every
 * request, so a URL always shows the same rows, and nothing is stored: there
 * are no tables. Faker is a development dependency, which is enough: the
 * examples exist only in local development and in the tests.
 *
 * @phpstan-type ExampleOrderItem array{name: string, quantity: int, price: int}
 * @phpstan-type ExampleOrderEvent array{status: string, at: string}
 * @phpstan-type ExampleOrder array{id: int, number: string, customer: string, status: string, total: int, ordered_at: string, notes: string|null, items: list<ExampleOrderItem>, history: list<ExampleOrderEvent>}
 */
trait GeneratesExampleData
{
    /**
     * What the orders' lines are of.
     */
    private const array EXAMPLE_PRODUCTS = [
        'Desk lamp', 'Office chair', 'Monitor stand', 'Keyboard', 'Mouse', 'Notebook',
        'Whiteboard', 'Desk organiser', 'Headphones', 'USB-C hub', 'Webcam', 'Printer paper',
    ];

    /**
     * 137 orders, SO-2026-0001 to SO-2026-0137, placed through 2026 in that
     * order by 30 customers. A total and a price are in cents. An order's
     * history is the statuses it went through, each with its date.
     *
     * The seed is Faker's own instance's, not the shared `fake()`'s. But
     * Faker seeds PHP's `mt_rand`, which everything random in the request
     * shares, so it is seeded at random again once the orders are made.
     *
     * @return Collection<int, ExampleOrder>
     */
    protected function exampleOrders(): Collection
    {
        $faker = Factory::create();
        $faker->seed(2026);

        $customers = array_map(fn () => $faker->company(), range(1, 30));
        $dates = collect(range(1, 137))
            ->map(fn () => $faker->dateTimeBetween('2026-01-01', '2026-11-20')->format('Y-m-d'))
            ->sort()
            ->values();

        $orders = $dates->map(fn (string $orderedAt, int $index) => $this->makeExampleOrder(
            $faker,
            $index + 1,
            $orderedAt,
            $customers[$faker->numberBetween(0, count($customers) - 1)],
        ));

        $faker->seed();

        return $orders;
    }

    /**
     * The example order with this id. There is none past 137: a 404.
     *
     * @return ExampleOrder
     */
    protected function exampleOrder(int $id): array
    {
        return $this->exampleOrders()->firstWhere('id', $id) ?? abort(404);
    }

    /**
     * @return ExampleOrder
     */
    private function makeExampleOrder(Generator $faker, int $id, string $orderedAt, string $customer): array
    {
        $products = $faker->randomElements(self::EXAMPLE_PRODUCTS, $faker->numberBetween(1, 4));
        $items = array_map(fn (string $product) => [
            'name' => $product,
            'quantity' => $faker->numberBetween(1, 5),
            'price' => $faker->numberBetween(5, 500) * 100,
        ], array_values($products));
        $status = ['open', 'paid', 'shipped', 'cancelled'][$faker->numberBetween(0, 3)];

        return [
            'id' => $id,
            'number' => sprintf('SO-2026-%04d', $id),
            'customer' => $customer,
            'status' => $status,
            'total' => array_sum(array_map(fn (array $item) => $item['quantity'] * $item['price'], $items)),
            'ordered_at' => $orderedAt,
            'notes' => $faker->boolean(30) ? $faker->sentence() : null,
            'items' => $items,
            'history' => $this->exampleOrderHistory($status, $orderedAt),
        ];
    }

    /**
     * The statuses an order went through to reach this one, and when: it was
     * placed (open), then paid, then shipped, or it was cancelled.
     *
     * @return list<ExampleOrderEvent>
     */
    private function exampleOrderHistory(string $status, string $orderedAt): array
    {
        $daysAfterPlaced = match ($status) {
            'paid' => ['open' => 0, 'paid' => 1],
            'shipped' => ['open' => 0, 'paid' => 1, 'shipped' => 3],
            'cancelled' => ['open' => 0, 'cancelled' => 2],
            default => ['open' => 0],
        };

        $placed = CarbonImmutable::parse($orderedAt);

        return array_map(
            fn (string $step, int $days) => ['status' => $step, 'at' => $placed->addDays($days)->toDateString()],
            array_keys($daysAfterPlaced),
            array_values($daysAfterPlaced),
        );
    }
}
