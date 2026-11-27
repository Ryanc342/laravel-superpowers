<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Translation\FileLoader;
use Illuminate\Translation\Translator;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

test('a guest without a cookie gets the configured default', function () {
    config(['app.locale' => 'zh_CN']);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'zh_CN'));
});

test("a guest's cookie chooses the language", function () {
    config(['app.locale' => 'zh_CN']);

    $this->withUnencryptedCookie('locale', 'en')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'en'));
});

test("a signed-in user's saved language wins over the cookie", function () {
    $user = User::factory()->create(['locale' => 'en']);

    $this->actingAs($user)
        ->withUnencryptedCookie('locale', 'zh_CN')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'en'));
});

test('a signed-in user who saved no language follows the cookie', function () {
    $user = User::factory()->create(['locale' => null]);

    $this->actingAs($user)
        ->withUnencryptedCookie('locale', 'zh_CN')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'zh_CN'));
});

test('an unknown cookie value falls back to the default', function () {
    config(['app.locale' => 'zh_CN']);

    $this->withUnencryptedCookie('locale', 'fr')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'zh_CN'));
});

test('an unknown saved language falls back to the cookie', function () {
    $user = User::factory()->create(['locale' => 'fr']);

    $this->actingAs($user)
        ->withUnencryptedCookie('locale', 'en')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'en'));
});

test("the browser's language is never consulted", function () {
    config(['app.locale' => 'zh_CN']);

    $this->withHeader('Accept-Language', 'en')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'zh_CN'));
});

test('a cookie that holds a list is ignored', function () {
    config(['app.locale' => 'zh_CN']);

    // PHP builds an array from a cookie sent as `locale[]=en`; withUnencryptedCookie() takes only strings.
    $this->call('GET', route('home'), cookies: ['locale' => ['en']])
        ->assertInertia(fn (Assert $page) => $page->where('locale', 'zh_CN'));
});

test('every page offers both languages, each named in itself', function () {
    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('locales', [
            ['value' => 'zh_CN', 'label' => '中文'],
            ['value' => 'en', 'label' => 'English'],
        ]));
});

test('switching while signed in saves the choice and sets the cookie', function () {
    $user = User::factory()->create(['locale' => 'zh_CN']);

    $this->actingAs($user)
        ->from(route('dashboard'))
        ->put(route('locale.update'), ['locale' => 'en'])
        ->assertRedirect(route('dashboard'))
        ->assertCookie('locale', 'en', encrypted: false);

    expect($user->refresh()->locale)->toBe('en');
});

test('a guest switching gets only the cookie', function () {
    $this->from(route('login'))
        ->put(route('locale.update'), ['locale' => 'en'])
        ->assertRedirect(route('login'))
        ->assertCookie('locale', 'en', encrypted: false);

    expect(User::query()->count())->toBe(0);
});

test('the cookie it sets lasts a year', function () {
    $this->freezeTime();

    $cookie = $this->put(route('locale.update'), ['locale' => 'en'])
        ->getCookie('locale', decrypt: false);

    expect($cookie->getExpiresTime())->toBe(now()->addDays(365)->getTimestamp());
});

test('an unknown locale is rejected', function (mixed $locale) {
    $user = User::factory()->create(['locale' => 'zh_CN']);

    $this->actingAs($user)
        ->put(route('locale.update'), ['locale' => $locale])
        ->assertSessionHasErrors('locale')
        ->assertCookieMissing('locale');

    expect($user->refresh()->locale)->toBe('zh_CN');
})->with([
    'another language' => 'fr',
    'nothing' => '',
    'a list' => [['en']],
]);

test("the translations prop holds the current language's sentences, and English has none", function () {
    config(['app.locale' => 'zh_CN']);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('translations.Log in', '登录'));

    $this->withUnencryptedCookie('locale', 'en')
        ->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('translations', []));
});

test('the translations are a once prop named for the language, so a switch sends them again', function () {
    config(['app.locale' => 'zh_CN']);

    $onceProps = fn ($response): array => array_keys($response->viewData('page')['onceProps']);

    expect($onceProps($this->get(route('home'))))->toBe(['translations.zh_CN'])
        ->and($onceProps($this->withUnencryptedCookie('locale', 'en')->get(route('home'))))->toBe(['translations.en']);
});

test("the project's lang/zh_CN.json wins over the template's on the same key", function () {
    $projectLangPath = sys_get_temp_dir().'/lang-'.Str::random(12);
    File::ensureDirectoryExists($projectLangPath);

    try {
        File::put($projectLangPath.'/zh_CN.json', json_encode(['Log in' => '进入'], JSON_UNESCAPED_UNICODE));

        $loader = new FileLoader(new Filesystem, $projectLangPath);
        $loader->addJsonPath(lang_path('template'));
        $translator = new Translator($loader, 'zh_CN');

        expect($translator->get('Log in'))->toBe('进入')
            ->and($translator->get('Hello!'))->toBe('你好！');
    } finally {
        File::deleteDirectory($projectLangPath);
    }
});

test('the verification mail is in Chinese for a Chinese user', function () {
    $this->skipUnlessFortifyHas(Features::emailVerification());

    Notification::fake();
    $user = User::factory()->unverified()->create(['locale' => 'zh_CN']);

    $user->sendEmailVerificationNotification();

    App::setLocale('zh_CN');
    $mail = Notification::sent($user, VerifyEmail::class)->sole()->toMail($user);

    expect($mail->subject)->toBe('验证你的邮箱地址')
        ->and($mail->actionText)->toBe('验证邮箱地址')
        ->and((string) $mail->render())
        ->toContain('你好！')
        ->toContain('此致，')
        ->toContain('保留所有权利。');
});

test('the password reset mail is in Chinese for a Chinese user', function () {
    $this->skipUnlessFortifyHas(Features::resetPasswords());

    Notification::fake();
    $user = User::factory()->create(['locale' => 'zh_CN']);

    $user->sendPasswordResetNotification('token');

    App::setLocale('zh_CN');
    $mail = Notification::sent($user, ResetPassword::class)->sole()->toMail($user);

    expect($mail->subject)->toBe('重置你的密码')
        ->and($mail->actionText)->toBe('重置密码');
});

test("a notification goes out in the user's saved language, whatever the app is running in", function () {
    config(['app.locale' => 'zh_CN']);
    Notification::fake();
    $user = User::factory()->create(['locale' => 'en']);

    $user->sendPasswordResetNotification('token');

    Notification::assertSentTo(
        $user,
        ResetPassword::class,
        fn (ResetPassword $notification, array $channels, User $notifiable, ?string $locale): bool => $locale === 'en',
    );
});

test("a notification to a user who saved no language, or one that is not known, follows the app's language", function (?string $saved) {
    config(['app.locale' => 'zh_CN']);
    Notification::fake();
    $user = User::factory()->create(['locale' => $saved]);

    $user->sendPasswordResetNotification('token');

    Notification::assertSentTo(
        $user,
        ResetPassword::class,
        fn (ResetPassword $notification, array $channels, User $notifiable, ?string $locale): bool => $locale === null,
    );
})->with([
    'none saved' => null,
    'not a known language' => 'fr',
]);
