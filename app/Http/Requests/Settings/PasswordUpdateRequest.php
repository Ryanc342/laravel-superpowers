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
     * not a way to guess it. It leaves out the confirmation of the new
     * password until the user has filled it: the new password is checked as
     * they leave it, before they reach the confirmation.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $passwordRules = $this->passwordRules();

        if ($this->isPrecognitive() && ! $this->filled('password_confirmation')) {
            $passwordRules = array_values(array_filter($passwordRules, fn (mixed $rule): bool => $rule !== 'confirmed'));
        }

        return [
            'current_password' => $this->isPrecognitive()
                ? ['required', 'string']
                : $this->currentPasswordRules(),
            'password' => $passwordRules,
        ];
    }
}
