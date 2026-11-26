<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\HttpFoundation\Cookie;

/*
 * Outside debug mode, 403, 404, 419, 429, 500 and 503 render one Inertia page,
 * `error`, with the shared props every page has: its language, its layout and
 * its button (the dashboard or the home page) work as on any other page.
 */

beforeEach(function () {
    config(['app.debug' => false]);

    Route::middleware('web')->any('test/abort/{status}', fn (int $status) => abort($status));
});

test('each of the six statuses renders the error page with its status', function (int $status) {
    $this->get("test/abort/{$status}")
        ->assertStatus($status)
        ->assertInertia(fn (Assert $page) => $page
            ->component('error')
            ->where('status', $status));
})->with([403, 404, 419, 429, 500, 503]);

test('an Inertia visit gets the error page as Inertia data', function () {
    $this->post('test/abort/403', [], ['X-Inertia' => 'true'])
        ->assertForbidden()
        ->assertHeader('X-Inertia', 'true')
        ->assertJsonPath('component', 'error')
        ->assertJsonPath('props.status', 403);
});

// The user is known by the session cookie alone, as in a browser: the guard and the session in memory are
// emptied. An unmatched URL reaches no route, so only a fallback route inside the web group starts the
// session for it.
test('an unmatched URL gives a signed-in user the 404 page, knowing them, with the shared props', function () {
    $user = User::factory()->create();

    $login = $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);
    $cookies = collect($login->headers->getCookies())
        ->mapWithKeys(fn (Cookie $cookie) => [$cookie->getName() => $cookie->getValue()])
        ->all();
    Auth::forgetGuards();
    session()->flush();

    $this->withUnencryptedCookies($cookies)
        ->get('no/such/page')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('error')
            ->where('status', 404)
            ->where('auth.user.id', $user->id)
            ->where('locale', 'en')
            ->has('translations')
            ->has('features'));
});

test('an unmatched URL gives a guest the 404 page, with no user', function () {
    $this->get('no/such/page')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('error')
            ->where('auth.user', null));
});

test('the error page is in the language of the visitor, and carries its sentences', function () {
    $this->withUnencryptedCookie('locale', 'zh_CN')
        ->get('no/such/page')
        ->assertInertia(fn (Assert $page) => $page
            ->where('locale', 'zh_CN')
            ->where('translations.Page not found', '页面不存在'));
});

test('maintenance mode gives the 503 page, with the shared props and the Retry-After header', function () {
    config(['app.maintenance.driver' => 'array']);
    $this->app->maintenanceMode()->activate(['retry' => 60]);

    $this->withUnencryptedCookie('locale', 'zh_CN')
        ->get(route('home'))
        ->assertServiceUnavailable()
        ->assertHeader('Retry-After', '60')
        ->assertInertia(fn (Assert $page) => $page
            ->component('error')
            ->where('status', 503)
            ->where('locale', 'zh_CN')
            ->has('translations')
            ->has('features')
            ->where('auth.user', null));
});

test('maintenance mode starts the 503 page in the theme the visitor chose', function () {
    config(['app.maintenance.driver' => 'array']);
    $this->app->maintenanceMode()->activate([]);

    $this->withUnencryptedCookie('appearance', 'dark')
        ->get(route('home'))
        ->assertServiceUnavailable()
        ->assertSee('<html lang="en" class="dark">', false);
});

test('a 419 from a GET renders the error page, with its Refresh button', function () {
    $this->get('test/abort/419')
        ->assertStatus(419)
        ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 419));
});

// A form submit is an Inertia visit with a method other than GET. It has to see a 303 and not a 302 after
// a PUT, a PATCH or a DELETE, and the page it goes back to keeps what was typed (state is kept on a visit
// that is not a GET).
test('a 419 from a submit goes back with a translated error toast', function (string $method) {
    $this->withUnencryptedCookie('locale', 'zh_CN')
        ->from('/settings/profile')
        ->{$method}('test/abort/419')
        ->assertStatus(303)
        ->assertRedirect('/settings/profile')
        ->assertInertiaFlash('toast', ['type' => 'error', 'message' => '页面已过期，请重试。']);
})->with(['post', 'put', 'patch', 'delete']);

// The test environment skips CSRF; a local one checks it, as production does. The check comes before the
// language is set, so the toast is in the language the user saved only if the handler sets it itself.
test('a form sent with a stale CSRF token goes back with the toast in the signed-in user\'s language', function () {
    $user = User::factory()->create(['locale' => 'zh_CN']);
    app()->detectEnvironment(fn () => 'local');

    $this->actingAs($user)
        ->from('/settings/profile')
        ->post(route('logout'))
        ->assertRedirect('/settings/profile')
        ->assertInertiaFlash('toast', ['type' => 'error', 'message' => '页面已过期，请重试。']);

    $this->assertAuthenticatedAs($user);
});

test('a throttled login gets the 429 page, with its sentences in the visitor\'s language', function () {
    $user = User::factory()->create();
    $credentials = ['email' => $user->email, 'password' => 'wrong-password'];

    foreach (range(1, 5) as $attempt) {
        $this->post(route('login.store'), $credentials)->assertRedirect();
    }

    $this->withUnencryptedCookie('locale', 'zh_CN')
        ->post(route('login.store'), $credentials, ['X-Inertia' => 'true'])
        ->assertTooManyRequests()
        ->assertHeader('Retry-After')
        ->assertJsonPath('component', 'error')
        ->assertJsonPath('props.status', 429)
        ->assertJsonPath('props.translations.Too many requests', '请求过于频繁');
});

test('in debug mode a 500 is not the error page', function () {
    config(['app.debug' => true]);

    $this->post('test/abort/500', [], ['X-Inertia' => 'true'])
        ->assertStatus(500)
        ->assertHeaderMissing('X-Inertia');
});

test('a status the page does not cover keeps its own response', function () {
    $this->post('test/abort/418', [], ['X-Inertia' => 'true'])
        ->assertStatus(418)
        ->assertHeaderMissing('X-Inertia');
});

test('a JSON request keeps its JSON error', function () {
    $this->getJson('test/abort/404')
        ->assertNotFound()
        ->assertHeaderMissing('X-Inertia')
        ->assertJsonStructure(['message']);
});

test('when the shared props cannot be made, the plain error response stays', function () {
    Exceptions::fake();
    Inertia::share('broken', fn () => throw new RuntimeException('The shared props failed.'));

    $this->post('test/abort/500', [], ['X-Inertia' => 'true'])
        ->assertStatus(500)
        ->assertHeaderMissing('X-Inertia');

    Exceptions::assertReported(RuntimeException::class);
});
