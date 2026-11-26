<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The dashboard example: figures of the made-up orders, and an activity feed
 * that loads ten more entries at a time, merged after the ones shown, instead
 * of paging.
 */

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

test('the dashboard shows the figures and the ten newest activity entries', function () {
    $this->get(route('examples.dashboard.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('examples/dashboard')
            ->where('figures.orders', 137)
            ->has('figures.statuses', 4)
            ->has('activity.data', 10)
            ->where('activity.data', fn ($entries) => collect($entries)->pluck('at')->all()
                === collect($entries)->pluck('at')->sortDesc()->values()->all()));
});

test('the feed is a scroll prop that merges each next page after the entries shown', function () {
    $page = $this->get(route('examples.dashboard.index'))->viewData('page');

    expect($page['mergeProps'])->toContain('activity.data')
        ->and($page['scrollProps']['activity'])->toMatchArray([
            'pageName' => 'activity_page',
            'currentPage' => 1,
            'nextPage' => 2,
        ]);
});

test('the next page of the feed holds the ten entries that follow, and only the feed is sent', function () {
    $first = $this->get(route('examples.dashboard.index'))->inertiaProps('activity.data');

    $this->get(route('examples.dashboard.index', ['activity_page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->reloadOnly('activity', fn (Assert $reload) => $reload
                ->missing('figures')
                ->has('activity.data', 10)
                ->where('activity.data', fn ($entries) => collect($entries)->pluck('key')->intersect(array_column($first, 'key'))->isEmpty())));
});

test('a page of the feed past its end is empty and has no next page', function () {
    $page = $this->get(route('examples.dashboard.index', ['activity_page' => 999]))->viewData('page');

    expect($page['props']['activity']['data'])->toBe([])
        ->and($page['scrollProps']['activity']['nextPage'])->toBeNull();
});
