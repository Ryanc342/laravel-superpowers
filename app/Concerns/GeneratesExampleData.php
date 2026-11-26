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
 * @phpstan-type ExampleOrderItem array{line: int, name: string, quantity: int, price: int}
 * @phpstan-type ExampleOrderEvent array{status: string, at: string}
 * @phpstan-type ExampleOrder array{id: int, number: string, customer: string, status: string, total: int, ordered_at: string, notes: string|null, items: list<ExampleOrderItem>, history: list<ExampleOrderEvent>}
 * @phpstan-type ExampleTask array{id: int, title: string, customer: string, assignee: string, priority: string, status: string, created_on: string}
 * @phpstan-type ExampleActivity array{key: string, order_id: int, number: string, customer: string, event: string, at: string}
 * @phpstan-type ExampleSalesRow array{product: string, units: int, average_price: int, revenue: int}
 * @phpstan-type ExampleSalesTotals array{orders: int, units: int, revenue: int, average_order: int}
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
     * What a customer asks about an order, in the queue example: `:order` is its number.
     */
    private const array EXAMPLE_TASK_SUBJECTS = [
        'Refund for :order', 'New delivery address for :order', 'Copy of the invoice for :order',
        'Damaged item in :order', 'Late delivery of :order', 'Cancel :order',
    ];

    /**
     * The statuses of a task in the queue example, in the order a task goes through them.
     *
     * @var list<string>
     */
    protected const array EXAMPLE_TASK_STATUSES = ['todo', 'in_progress', 'completed'];

    /**
     * How urgent a task in the queue example is.
     *
     * @var list<string>
     */
    protected const array EXAMPLE_TASK_PRIORITIES = ['low', 'medium', 'high'];

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
     * The five people the queue example's tasks are assigned to.
     *
     * @return list<string>
     */
    protected function exampleAssignees(): array
    {
        $faker = Factory::create();
        $faker->seed(2026);

        $assignees = array_map(fn () => $faker->name(), range(1, 5));

        $faker->seed();

        return $assignees;
    }

    /**
     * 60 tasks for the queue example, each about one of the example orders,
     * oldest first. Like the orders, they are the same on every request.
     *
     * @return Collection<int, ExampleTask>
     */
    protected function exampleTasks(): Collection
    {
        $orders = $this->exampleOrders();
        $assignees = $this->exampleAssignees();

        $faker = Factory::create();
        $faker->seed(2026);

        $dates = collect(range(1, 60))
            ->map(fn () => $faker->dateTimeBetween('2026-10-01', '2026-11-26')->format('Y-m-d'))
            ->sort()
            ->values();

        $pick = fn (array $choices): string => $choices[$faker->numberBetween(0, count($choices) - 1)];

        $tasks = $dates->map(function (string $createdOn, int $index) use ($faker, $pick, $orders, $assignees): array {
            $order = $orders[$faker->numberBetween(0, $orders->count() - 1)];

            return [
                'id' => $index + 1,
                'title' => strtr($pick(self::EXAMPLE_TASK_SUBJECTS), [':order' => $order['number']]),
                'customer' => $order['customer'],
                'assignee' => $pick($assignees),
                'priority' => $pick(self::EXAMPLE_TASK_PRIORITIES),
                'status' => $pick(self::EXAMPLE_TASK_STATUSES),
                'created_on' => $createdOn,
            ];
        });

        $faker->seed();

        return $tasks;
    }

    /**
     * What happened to the example orders, newest first: each step of each
     * order's history, for the dashboard example's activity feed. `event` is
     * the status the order reached; `key` tells the entries apart. No order
     * has two steps on one day, so the day and the order's id decide where
     * each entry goes.
     *
     * @return Collection<int, ExampleActivity>
     */
    protected function exampleActivity(): Collection
    {
        return $this->exampleOrders()
            ->flatMap(fn (array $order) => array_map(fn (array $event) => [
                'key' => "{$order['id']}-{$event['status']}",
                'order_id' => $order['id'],
                'number' => $order['number'],
                'customer' => $order['customer'],
                'event' => $event['status'],
                'at' => $event['at'],
            ], $order['history']))
            ->sortBy([['at', 'desc'], ['order_id', 'desc']])
            ->values();
    }

    /**
     * The report example's sales by product, from the orders placed between
     * `$from` and `$to` (both `Y-m-d`, either end open when null), most
     * revenue first. A cancelled order sold nothing, so it is left out. Money
     * is in cents.
     *
     * @return array{rows: Collection<int, ExampleSalesRow>, totals: ExampleSalesTotals}
     */
    protected function exampleSalesReport(?string $from, ?string $to): array
    {
        $orders = $this->exampleOrders()
            ->reject(fn (array $order) => $order['status'] === 'cancelled')
            ->filter(fn (array $order) => ($from === null || $order['ordered_at'] >= $from)
                && ($to === null || $order['ordered_at'] <= $to));

        $rows = $orders->flatMap(fn (array $order) => $order['items'])
            ->groupBy('name')
            ->map(function (Collection $lines, string $product): array {
                $units = $lines->reduce(fn (int $sum, array $line) => $sum + $line['quantity'], 0);
                $revenue = $lines->reduce(fn (int $sum, array $line) => $sum + $line['quantity'] * $line['price'], 0);

                return [
                    'product' => $product,
                    'units' => $units,
                    'average_price' => intdiv($revenue, $units),
                    'revenue' => $revenue,
                ];
            })
            ->sortByDesc('revenue')
            ->values();
        $revenue = $rows->reduce(fn (int $sum, array $row) => $sum + $row['revenue'], 0);

        return [
            'rows' => $rows,
            'totals' => [
                'orders' => $orders->count(),
                'units' => $rows->reduce(fn (int $sum, array $row) => $sum + $row['units'], 0),
                'revenue' => $revenue,
                'average_order' => $orders->isEmpty() ? 0 : intdiv($revenue, $orders->count()),
            ],
        ];
    }

    /**
     * @return ExampleOrder
     */
    private function makeExampleOrder(Generator $faker, int $id, string $orderedAt, string $customer): array
    {
        $products = $faker->randomElements(self::EXAMPLE_PRODUCTS, $faker->numberBetween(1, 4));
        // Each line has its number, which a table keys its rows by: two lines can be of one product.
        $items = array_map(fn (string $product, int $index) => [
            'line' => $index + 1,
            'name' => $product,
            'quantity' => $faker->numberBetween(1, 5),
            'price' => $faker->numberBetween(5, 500) * 100,
        ], array_values($products), array_keys(array_values($products)));
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
