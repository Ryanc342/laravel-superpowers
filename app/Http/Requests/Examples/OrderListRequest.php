<?php

namespace App\Http\Requests\Examples;

use App\Http\Requests\ListRequest;
use Illuminate\Validation\Rule;

/**
 * The list of the orders example: what its URL may sort by and filter on.
 * The search form's fields are named after these filters.
 */
class OrderListRequest extends ListRequest
{
    /**
     * @return list<string>
     */
    protected function sortable(): array
    {
        return ['number', 'total', 'ordered_at'];
    }

    /**
     * A part of the number or of the customer, and one status.
     *
     * @return array<string, array<mixed>>
     */
    protected function filters(): array
    {
        return [
            'number' => ['string', 'max:20'],
            'customer' => ['string', 'max:100'],
            'status' => [Rule::in(['open', 'paid', 'shipped', 'cancelled'])],
        ];
    }
}
