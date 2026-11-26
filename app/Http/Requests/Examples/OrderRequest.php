<?php

namespace App\Http\Requests\Examples;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * An order from the long form, or a draft from the list's Quick add, which
 * has only the customer and the date (`draft`). Its routes are precognitive,
 * so the form checks each field against these rules while the user types.
 */
class OrderRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer' => ['required', 'string', 'max:100'],
            'ordered_at' => ['required', 'date'],
            'draft' => ['sometimes', 'boolean'],
            // Not `required_without:draft`, which any `draft` sent satisfies, `false` and `0` too.
            'items' => [Rule::requiredIf(! $this->boolean('draft')), 'array', 'min:1'],
            'items.*.name' => ['required', 'string', 'max:100'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * An order with no items is told what to do, not which rule it broke.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => __('Add at least one product.'),
            'items.min' => __('Add at least one product.'),
        ];
    }

    /**
     * The fields' names in the messages, in the user's language.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'customer' => __('customer'),
            'ordered_at' => __('order date'),
            'items' => __('products'),
            'items.*.name' => __('product'),
            'items.*.quantity' => __('quantity'),
            'notes' => __('notes'),
        ];
    }
}
