<?php

use App\Models\User;

test('an unverified user is asked to verify and can resend the link', function () {
    $this->actingAs(User::factory()->unverified()->create());

    visit('/dashboard')
        ->assertPathIs('/email/verify')
        ->press('Resend verification email')
        ->assertSee('A new verification link has been sent');
});
