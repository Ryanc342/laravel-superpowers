<?php

use App\Models\User;

test('the security page asks for the password first', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/security')
        ->assertPathIs('/user/confirm-password')
        ->type('password', 'password')
        ->press('@confirm-password-button')
        ->assertPathIs('/settings/security');
});

test('a wrong password does not get past the confirmation', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/security')
        ->type('password', 'wrong-password')
        ->press('@confirm-password-button')
        ->assertSee('The provided password was incorrect.')
        ->assertPathIs('/user/confirm-password');
});
