<?php

use App\Models\User;

/*
 * Registering a real passkey needs a WebAuthn authenticator, which a
 * headless browser does not have, so this only checks that the passkey
 * section of the security page works.
 */
test('the security page shows the passkeys section', function () {
    $this->actingAs(User::factory()->create());

    visitSecurityPage()
        ->assertSee('Passkeys')
        ->assertSee('No passkeys yet')
        ->assertNoJavaScriptErrors();
});
