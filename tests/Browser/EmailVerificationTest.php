<?php

use App\Models\User;
use Laravel\Fortify\Features;

test('an unverified user is asked to verify and can resend the link', function () {
    $this->skipUnlessFortifyHas(Features::emailVerification());

    $this->actingAs(User::factory()->unverified()->create());

    visit('/dashboard')
        ->assertPathIs('/email/verify')
        ->press('Resend verification email')
        ->assertSee('A new verification link has been sent');
});
