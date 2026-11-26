<?php

namespace App\Http\Requests\Examples;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A new supplier from the step-by-step form. Its route is precognitive: the
 * form checks each step's fields against these rules before it shows the next
 * step (`Precognition-Validate-Only`), then the whole supplier on submit.
 */
class StepsFormRequest extends FormRequest
{
    /**
     * The companies that are suppliers already. A real app would ask its
     * database or an outside register.
     */
    private const array EXISTING_SUPPLIERS = ['Taken Ltd'];

    /**
     * The company step, then the contact step. Whether the company is a
     * supplier already is asked on the send only, like a check that is slow
     * or calls another service (the password breach check in
     * `AppServiceProvider`): its error reaches the form after the last step.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'company_name' => [
                'required', 'string', 'max:100',
                ...($this->isPrecognitive() ? [] : [Rule::notIn(self::EXISTING_SUPPLIERS)]),
            ],
            'industry' => ['required', Rule::in(['manufacturing', 'retail', 'logistics', 'services'])],
            'website' => ['nullable', 'url', 'max:255'],
            'contact_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'company_name.not_in' => __('This company is a supplier already.'),
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
            'company_name' => __('company name'),
            'industry' => __('industry'),
            'website' => __('website'),
            'contact_name' => __('contact name'),
            'email' => __('email address'),
            'phone' => __('phone number'),
        ];
    }
}
