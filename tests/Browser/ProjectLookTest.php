<?php

use App\Models\User;
use Laravel\Fortify\Features;

/*
 * What the project's own look says: its dashboard, the entries of its menu
 * (`navigation.ts`) and its home page. The template ships this file once and
 * the project owns it: change it with those pages. The template's own tests do
 * not name any of them, so a project can change its pages, its menu and its
 * theme without touching a file the template owns. The brand colour is in
 * `tests/js/project-theme.test.ts`.
 */

test('the dashboard has one h1, its title, and no breadcrumbs', function () {
    $this->actingAs(User::factory()->create());

    visit('/dashboard')
        ->assertScript("[...document.querySelectorAll('h1')].map((heading) => heading.textContent)", ['Dashboard'])
        ->assertMissing('.ant-breadcrumb')
        ->assertMissing('nav[aria-label="breadcrumb"]');
});

test('the app menu has an entry for the dashboard', function () {
    $this->actingAs(User::factory()->create());

    visit('/dashboard')
        ->assertVisible('.ant-pro-sider-menu a[href="/dashboard"]')
        ->assertNoJavaScriptErrors();
});

test('the home page links to sign-in and registration', function () {
    visit('/')
        ->assertSee('Log in')
        ->assertSee('Register');
});

test('registration turned off hides the home page\'s sign-up link', function () {
    turnFortifyFeatureOff(Features::registration());

    visit('/')
        ->assertSee('Log in')
        ->assertDontSee('Register');
});
