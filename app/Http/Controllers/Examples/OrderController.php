<?php

namespace App\Http\Controllers\Examples;

use App\Concerns\GeneratesExampleData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Examples\OrderListRequest;
use App\Http\Requests\Examples\OrderRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The list, detail and create/edit examples, over made-up orders. Nothing is
 * saved: a write is validated like a real one, then answered with a toast
 * and the page a real one would go to.
 */
class OrderController extends Controller
{
    use GeneratesExampleData;

    /**
     * The list, filtered, sorted and paged on the server. `?empty=1` is the
     * example's switch for a first visit, when there are no orders yet.
     */
    public function index(OrderListRequest $request): Response
    {
        $orders = $request->boolean('empty') ? collect() : $this->exampleOrders();
        $filters = $request->filterValues();

        // A filter is there or not: `when()` on its value would skip a search for "0".
        $number = Arr::string($filters, 'number', '');
        $customer = Arr::string($filters, 'customer', '');
        $status = Arr::string($filters, 'status', '');

        $matching = $orders
            ->when($number !== '', fn (Collection $rows) => $rows
                ->filter(fn (array $order) => Str::contains($order['number'], $number, ignoreCase: true)))
            ->when($customer !== '', fn (Collection $rows) => $rows
                ->filter(fn (array $order) => Str::contains($order['customer'], $customer, ignoreCase: true)))
            ->when($status !== '', fn (Collection $rows) => $rows
                ->where('status', $status))
            ->values();

        return Inertia::render('examples/orders/index', [
            'orders' => $request->toProps(
                $request->paginate($matching),
                fn (array $order) => Arr::only($order, ['id', 'number', 'customer', 'status', 'total', 'ordered_at']),
            ),
            'hasOrders' => $orders->isNotEmpty(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('examples/orders/form', ['order' => null]);
    }

    /**
     * A full order goes to the list. A draft from the list's Quick add goes
     * back to the list as it was: the same page and filters.
     */
    public function store(OrderRequest $request): RedirectResponse
    {
        if ($request->boolean('draft')) {
            Inertia::flash('toast', ['type' => 'success', 'message' => __('Draft order created.')]);

            return back();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order created.')]);

        return to_route('examples.orders.index');
    }

    public function show(int $order): Response
    {
        return Inertia::render('examples/orders/show', [
            'order' => $this->exampleOrder($order),
        ]);
    }

    public function edit(int $order): Response
    {
        return Inertia::render('examples/orders/form', [
            'order' => Arr::only($this->exampleOrder($order), ['id', 'number', 'customer', 'ordered_at', 'notes', 'items']),
        ]);
    }

    public function update(OrderRequest $request, int $order): RedirectResponse
    {
        $this->exampleOrder($order);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order updated.')]);

        return to_route('examples.orders.show', $order);
    }

    /**
     * Deleted from the list, the user goes back to the list as it was. Deleted
     * from its own page, which is gone, they go to the list. The page is told
     * by its path, so a query string on it (`?tab=history`) does not matter.
     */
    public function destroy(int $order): RedirectResponse
    {
        $this->exampleOrder($order);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order deleted.')]);

        $fromItsOwnPage = parse_url(url()->previous(), PHP_URL_PATH) === route('examples.orders.show', $order, absolute: false);

        return $fromItsOwnPage ? to_route('examples.orders.index') : back();
    }
}
