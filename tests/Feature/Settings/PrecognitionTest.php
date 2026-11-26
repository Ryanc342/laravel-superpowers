<?php

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

/*
 * The settings forms are checked on the server while the user types: the same
 * FormRequest runs, and the controller does not. A check never saves anything.
 * The client asks for JSON, so these use the JSON requests.
 *
 * A precognitive request leaves its dispatcher bound in the application the
 * test runs in (a real request has an application of its own), so a test sends
 * a normal request after one only to read the limiter's status.
 */

test('a precognitive profile update with an invalid email is refused and saves nothing', function () {
    $user = User::factory()->create(['name' => 'Before', 'email' => 'before@example.com']);

    $this->actingAs($user)
        ->withPrecognition()
        ->patchJson(route('profile.update'), ['name' => 'After', 'email' => 'not-an-email'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email')
        ->assertJsonMissingValidationErrors('name');

    expect($user->fresh())
        ->name->toBe('Before')
        ->email->toBe('before@example.com');
});

test('a precognitive profile update with valid values passes and saves nothing', function () {
    $user = User::factory()->create(['name' => 'Before', 'email' => 'before@example.com']);

    $this->actingAs($user)
        ->withPrecognition()
        ->patchJson(route('profile.update'), ['name' => 'After', 'email' => 'after@example.com'])
        ->assertNoContent()
        ->assertHeader('Precognition-Success', 'true');

    expect($user->fresh())
        ->name->toBe('Before')
        ->email->toBe('before@example.com');
});

test('a precognitive profile check is limited to the fields the user has touched', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withPrecognition()
        ->withHeader('Precognition-Validate-Only', 'name')
        ->patchJson(route('profile.update'), ['name' => 'After', 'email' => 'not-an-email'])
        ->assertNoContent();
});

test('a precognitive password update with a password that is not confirmed is refused and saves nothing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withPrecognition()
        ->putJson(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'another-password',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

test('a precognitive password update with valid values passes and saves nothing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withPrecognition()
        ->putJson(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertNoContent();

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

test('a precognitive check does not tell whether the current password is right', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withPrecognition()
        ->putJson(route('user-password.update'), [
            'current_password' => 'a-wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertNoContent();
});

test('the send tells that the current password is wrong', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson(route('user-password.update'), [
            'current_password' => 'a-wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertJsonValidationErrors('current_password');
});

test('the password form is limited to six sends a minute', function () {
    $user = User::factory()->create();

    foreach (range(1, 6) as $ignored) {
        $this->actingAs($user)
            ->putJson(route('user-password.update'), ['current_password' => 'a-wrong-password'])
            ->assertUnprocessable();
    }

    $this->actingAs($user)
        ->putJson(route('user-password.update'), ['current_password' => 'a-wrong-password'])
        ->assertTooManyRequests();
});

test('precognitive checks do not use up the password form\'s six sends', function () {
    $user = User::factory()->create();
    $send = fn () => $this->actingAs($user)
        ->putJson(route('user-password.update'), ['current_password' => 'a-wrong-password']);

    foreach (range(1, 5) as $ignored) {
        $send()->assertUnprocessable();
    }

    foreach (range(1, 10) as $ignored) {
        $this->actingAs($user)
            ->withPrecognition()
            ->putJson(route('user-password.update'), [
                'current_password' => 'password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertNoContent();
    }

    // The header stays on the test's requests until it is removed. The sixth
    // send is still allowed, and the seventh is not.
    $this->withoutHeader('Precognition');

    expect($send()->status())->not->toBe(429);
    $send()->assertTooManyRequests();
});

test('precognitive checks of the password form are limited too', function () {
    $user = User::factory()->create();

    foreach (range(1, 120) as $ignored) {
        $this->actingAs($user)
            ->withPrecognition()
            ->putJson(route('user-password.update'), ['password' => 'new-password'])
            ->assertUnprocessable();
    }

    $this->actingAs($user)
        ->withPrecognition()
        ->putJson(route('user-password.update'), ['password' => 'new-password'])
        ->assertTooManyRequests();
});

test('the errors of the settings forms name their fields in Chinese', function () {
    config(['app.locale' => 'zh_CN']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withPrecognition()
        ->patchJson(route('profile.update'), ['name' => '', 'email' => ''])
        ->assertJsonPath('errors.name.0', '姓名不能为空。')
        ->assertJsonPath('errors.email.0', '邮箱不能为空。');

    $this->putJson(route('user-password.update'), [
        'password' => 'new-password',
        'password_confirmation' => 'another-password',
    ])
        ->assertJsonPath('errors.current_password.0', '当前密码不能为空。')
        ->assertJsonPath('errors.password.0', '密码两次输入不一致。');
});

/*
 * In production the password rule also asks haveibeenpwned whether the password
 * has been in a breach. A check while typing never does: it would be a request
 * to another service each time the user stops typing, and the send asks anyway.
 * Outside the testing environment CSRF is checked, which these requests skip.
 */
describe('in production', function () {
    beforeEach(function () {
        app()->detectEnvironment(fn () => 'production');
        $this->withoutMiddleware(PreventRequestForgery::class);
    });

    $newPassword = [
        'current_password' => 'password',
        'password' => 'Correct-Horse-Battery-9',
        'password_confirmation' => 'Correct-Horse-Battery-9',
    ];

    test('a precognitive check never asks haveibeenpwned about the new password', function () use ($newPassword) {
        Http::fake();

        $this->actingAs(User::factory()->create())
            ->withPrecognition()
            ->putJson(route('user-password.update'), $newPassword)
            ->assertNoContent();

        Http::assertNothingSent();
    });

    test('a send asks haveibeenpwned about the new password', function () use ($newPassword) {
        Http::fake();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson(route('user-password.update'), $newPassword)
            ->assertRedirect();

        Http::assertSent(fn ($request) => str_contains($request->url(), 'api.pwnedpasswords.com'));
        expect(Hash::check('Correct-Horse-Battery-9', $user->fresh()->password))->toBeTrue();
    });

    test('a send with a password that is in a breach is refused', function () use ($newPassword) {
        $hash = strtoupper(sha1('Correct-Horse-Battery-9'));
        Http::fake(['api.pwnedpasswords.com/*' => Http::response(substr($hash, 5).':9999')]);

        $this->actingAs(User::factory()->create())
            ->putJson(route('user-password.update'), $newPassword)
            ->assertJsonValidationErrors('password');
    });
});
