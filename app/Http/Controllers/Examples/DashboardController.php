<?php

namespace App\Http\Controllers\Examples;

use App\Concerns\GeneratesExampleData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The dashboard example: figures of the made-up orders, and their activity
 * feed, which loads more entries at its end instead of paging.
 */
class DashboardController extends Controller
{
    use GeneratesExampleData;

    /**
     * How many activity entries each "Load more" adds.
     */
    private const int ACTIVITY_PER_PAGE = 10;

    /**
     * The feed is a scroll prop: the page's `InfiniteScroll` asks for the
     * next page (`activity_page`) as a partial reload of `activity` alone,
     * and Inertia appends its entries to the ones shown. The page name is the
     * feed's own, so a list on the same page keeps its `page`.
     */
    public function index(Request $request): Response
    {
        $page = max(1, $request->integer('activity_page', 1));

        return Inertia::render('examples/dashboard', [
            'figures' => function (): array {
                $orders = $this->exampleOrders();
                $sold = $orders->where('status', '!=', 'cancelled');

                return [
                    'orders' => $orders->count(),
                    'revenue' => $sold->sum('total'),
                    'averageOrder' => intdiv($sold->sum('total'), max(1, $sold->count())),
                    'awaitingPayment' => $orders->where('status', 'open')->count(),
                    'statuses' => $orders->countBy('status')->all(),
                ];
            },
            // A simple paginator is given one entry more than a page, to know whether there is a next page.
            'activity' => Inertia::scroll(fn () => new Paginator(
                $this->exampleActivity()
                    ->slice(($page - 1) * self::ACTIVITY_PER_PAGE, self::ACTIVITY_PER_PAGE + 1)
                    ->values(),
                self::ACTIVITY_PER_PAGE,
                $page,
                ['pageName' => 'activity_page'],
            )),
        ]);
    }
}
