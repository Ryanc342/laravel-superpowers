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

test('a user changes their password', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    visitSecurityPage()
        ->assertSee('Update password')
        ->type('current_password', 'password')
        ->type('password', 'new-password')
        ->type('password_confirmation', 'new-password')
        ->press('@update-password-button')
        ->assertSee('Password updated.');

    expect(Hash::check('new-password', $user->fresh()->password))->toBeTrue();
});

test('a user switches the appearance to dark', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/appearance')
        ->click('Dark')
        ->assertScript("document.documentElement.classList.contains('dark')", true);
});

test('a user deletes their account', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    visit('/settings/profile')
        ->press('@delete-user-button')
        ->type('password', 'password')
        ->press('[role="dialog"] button[type="submit"]')
        ->assertPathIs('/');

    expect(User::find($user->id))->toBeNull();
});

test('pages reached from the menu have one h1, their title, and no breadcrumbs', function (string $path, string $title) {
    $this->actingAs(User::factory()->create());

    visit($path)
        ->assertScript("[...document.querySelectorAll('h1')].map((heading) => heading.textContent)", [$title])
        ->assertMissing('.ant-breadcrumb')
        ->assertMissing('nav[aria-label="breadcrumb"]');
})->with([
    'dashboard' => ['/dashboard', 'Dashboard'],
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
