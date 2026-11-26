<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PasswordUpdateRequest extends FormRequest
{
    use PasswordValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * A check while the user types (Precognition) only asks for the current
     * password: whether it is right is told on the send, so that a check is
     * not a way to guess it.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => $this->isPrecognitive()
                ? ['required', 'string']
                : $this->currentPasswordRules(),
            'password' => $this->passwordRules(),
        ];
    }
}
