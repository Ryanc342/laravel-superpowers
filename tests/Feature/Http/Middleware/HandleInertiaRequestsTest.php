<?php

use Inertia\Testing\AssertableInertia as Assert;

test('the rows-per-page choices are not a shared prop, since config/lists.php is their one source', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->missing('perPageOptions'));
});

test('the side menu opens expanded until the sidebar_state cookie says it was collapsed', function (?string $cookie, bool $open) {
    $request = $cookie === null ? $this : $this->withUnencryptedCookie('sidebar_state', $cookie);

    $request->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('sidebarOpen', $open));
})->with([
    'no cookie' => [null, true],
    'expanded' => ['true', true],
    'collapsed' => ['false', false],
]);
