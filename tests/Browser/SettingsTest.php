<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('a user updates their profile', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/settings/profile')
        ->type('name', 'Updated Name')
        ->press('@update-profile-button')
        ->assertSee('Profile updated.');

    expect($user->fresh()->name)->toBe('Updated Name');
});

test('an empty name shows its error under the field while typing, without moving the field below', function () {
    $this->actingAs(User::factory()->create());

    // Where the email field sits: an error under the name must not move it.
    $emailTop = "document.querySelector('input[name=\"email\"]').getBoundingClientRect().top";

    $page = visit('/settings/profile');
    $before = $page->script($emailTop);

    $page->clear('name')
        ->assertPresent('.ant-form-item-explain-error')
        ->assertSee('The name field is required.');

    expect($page->script($emailTop))->toBe($before);
});

test('an email that another user has is refused while typing, and is not saved', function () {
    $taken = User::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/settings/profile')
        ->type('email', $taken->email)
        ->assertSee('The email has already been taken.')
        ->press('@update-profile-button')
        ->assertSee('The email has already been taken.')
        ->assertPathIs('/settings/profile');

    expect($user->fresh()->email)->not->toBe($taken->email);
});

test('a user with an unverified email can ask for a new verification link', function () {
    $this->actingAs(User::factory()->unverified()->create());

    visit('/settings/profile')
        ->assertSee('Your email address is unverified.')
        ->press('Re-send verification email')
        ->assertSee('A new verification link has been sent to your email address.');
});

test('a user with a verified email is not told to verify it', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/profile')
        ->assertSee('Profile')
        ->assertDontSee('Your email address is unverified.');
});

test('a user changes their password', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    visitSecurityPage()
        ->assertSee('Update password')
        ->type('current_password', 'password')
        ->type('password', 'new-password')
        ->type('password_confirmation', 'new-password')
        ->press('@update-password-button')
        ->assertSee('Password updated.')
        ->assertValue('password', '');

    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
});

test('a password that is not confirmed shows its error while typing, once the confirmation is filled, and the error goes when it is', function () {
    $this->actingAs(User::factory()->create());

    // The new password is checked before the user reaches its confirmation.
    visitSecurityPage()
        ->type('password', 'new-password')
        ->wait(1)
        ->assertDontSee('The password field confirmation does not match.')
        ->type('password_confirmation', 'another-password')
        ->assertSee('The password field confirmation does not match.')
        ->type('password_confirmation', 'new-password')
        ->assertDontSee('The password field confirmation does not match.');
});

test('a wrong current password shows its error under the field when the form is sent', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    visitSecurityPage()
        ->type('current_password', 'wrong-password')
        ->type('password', 'new-password')
        ->type('password_confirmation', 'new-password')
        ->press('@update-password-button')
        ->assertSee('The password is incorrect.');

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

test('a user switches the appearance to dark', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/appearance')
        ->click('Dark')
        ->assertScript("document.documentElement.classList.contains('dark')", true);
});

test('the appearance setting shows the user\'s choice', function () {
    $this->actingAs(User::factory()->create());

    $page = visit('/settings/appearance')
        ->assertScript("document.querySelector('.ant-segmented-item-selected').textContent", 'System')
        ->click('Light')
        ->assertScript("document.documentElement.classList.contains('dark')", false);

    $page->refresh()
        ->assertScript("document.querySelector('.ant-segmented-item-selected').textContent", 'Light');
});

test('a user deletes their account', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // The dialog's field is found by a CSS selector, which Playwright waits
    // for. The field's name alone is looked up at once, before the dialog is up.
    visit('/settings/profile')
        ->press('@delete-user-button')
        ->type('input[name="password"]', 'password')
        ->press('@confirm-delete-user-button')
        ->assertPathIs('/');

    expect(User::find($user->id))->toBeNull();
});

test('a user deletes their account from the sheet that rises on a phone', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // Pro shows its menu button on a phone: the page has taken the width, so
    // the dialog opens as a sheet and not as a modal that then changes.
    visit('/settings/profile')->on()->mobile()
        ->assertPresent('.ant-pro-global-header-collapsed-button')
        ->press('@delete-user-button')
        ->assertPresent('.ant-drawer-bottom')
        ->type('input[name="password"]', 'password')
        ->press('@confirm-delete-user-button')
        ->assertPathIs('/');

    expect(User::find($user->id))->toBeNull();
});

test('a wrong password does not delete the account, and the dialog shows why', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/settings/profile')
        ->press('@delete-user-button')
        ->type('input[name="password"]', 'wrong-password')
        ->press('@confirm-delete-user-button')
        ->assertSee('The password is incorrect.')
        ->assertPathIs('/settings/profile');

    expect(User::find($user->id))->not->toBeNull();
});

test('pages reached from the menu have one h1, their title, and no breadcrumbs', function (string $path, string $title) {
    $this->actingAs(User::factory()->create());

    visit($path)
        ->assertScript("[...document.querySelectorAll('h1')].map((heading) => heading.textContent)", [$title])
        ->assertMissing('.ant-breadcrumb')
        ->assertMissing('nav[aria-label="breadcrumb"]');
})->with([
    'profile' => ['/settings/profile', 'Settings'],
    'appearance' => ['/settings/appearance', 'Settings'],
]);

test('the main pages render without JavaScript errors', function (string $mode) {
    $this->actingAs(User::factory()->create());

    $pages = visit(['/', '/dashboard', '/settings/profile', '/settings/appearance']);

    $pages = match ($mode) {
        'dark' => $pages->inDarkMode(),
        'mobile' => $pages->on()->mobile(),
        default => $pages,
    };

    $pages->assertNoJavaScriptErrors();
})->with(['light', 'dark', 'mobile']);

test('the guest pages render without JavaScript errors', function () {
    visit(['/', '/login', '/forgot-password'])->assertNoJavaScriptErrors();
});
