<?php

test('the appearance cookie chooses the theme the page starts in', function (string $appearance) {
    $this->withUnencryptedCookie('appearance', $appearance)
        ->get(route('home'))
        ->assertViewHas('appearance', $appearance);
})->with(['light', 'dark', 'system']);

test('a page without an appearance cookie follows the system', function () {
    $this->get(route('home'))
        ->assertViewHas('appearance', 'system');
});

test('an appearance cookie that is not a theme is ignored', function (string $value) {
    $this->withUnencryptedCookie('appearance', $value)
        ->get(route('home'))
        ->assertViewHas('appearance', 'system')
        ->assertDontSee($value, false);
})->with([
    'unknown' => 'sepia',
    'script' => "dark';alert(1);//",
]);
