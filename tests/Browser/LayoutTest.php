<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/*
 * The shell every signed-in page sits in: Pro's layout, with the app's menu,
 * the language switch and the user menu, in the visitor's theme.
 *
 * The template owns this file, so it holds for any look the project gives the
 * shell. It opens the template's own pages (the profile settings, the
 * examples), names no menu entry or colour of the project's, and the tests of
 * the side menu skip themselves when the project puts its menu at the top
 * (`layout: 'top'` in `theme.ts`). What the project's own dashboard, menu
 * entries and home page say is in `ProjectLookTest.php`, which the project
 * owns.
 */

/**
 * Whether the layout's backdrop, behind the menu and the page, is dark: every
 * colour of the gradient Pro paints it with has each channel under half. Pro
 * leaves `.ant-layout` itself transparent in both themes.
 */
const LAYOUT_BACKDROP_IS_DARK = <<<'JS'
    (() => {
        const backdrop = getComputedStyle(document.querySelector('.ant-pro-layout-bg-list')).backgroundImage;
        const colours = [...backdrop.matchAll(/rgba?\(([^)]+)\)/g)].map(([, channels]) => channels.split(',').map(Number));

        return colours.length > 0 && colours.every(([red, green, blue]) => Math.max(red, green, blue) < 128);
    })()
    JS;

/**
 * Opens a signed-in page for a test of the side menu. The project's `theme.ts`
 * may put the menu at the top (`layout: 'top'`), where there is no side menu
 * to test: the test is skipped then. The side layout stays covered by
 * `tests/js/layouts/app-layout.test.tsx`, which sets the layout itself.
 */
function visitPageWithSideMenu(string $path = '/settings/profile'): mixed
{
    $page = visit($path);

    if ($page->script("document.querySelector('.ant-pro-sider') === null")) {
        test()->markTestSkipped("The project's layout (theme.ts) has no side menu.");
    }

    return $page;
}

test('a signed-in page shows the app menu and the user menu', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/profile')
        ->assertVisible('@user-menu-button')
        ->assertPresent('.ant-pro-sider-menu, .ant-pro-top-nav-header-menu')
        ->assertNoJavaScriptErrors();
});

test('a collapsed side menu stays collapsed after a reload', function () {
    $this->actingAs(User::factory()->create());

    $siderIsCollapsed = "document.querySelector('.ant-pro-sider').classList.contains('ant-pro-sider-collapsed')";

    $page = visitPageWithSideMenu()
        ->click('.ant-pro-sider-collapsed-button')
        ->assertScript($siderIsCollapsed, true);

    // Long enough for the page to load its scripts and settle after the reload.
    $page->refresh()
        ->wait(1)
        ->assertScript($siderIsCollapsed, true)
        ->assertScript("document.cookie.includes('sidebar_state=false')", true);
});

/**
 * Whether the colour of the selected menu entry is the theme's primary colour,
 * whatever that is: a probe element is given `var(--ant-color-primary)` inside
 * the entry, where the theme's variables are in force. The probe's fallback is
 * a colour no theme has, so a variable that is missing fails the test instead
 * of passing it, as the probe would otherwise take the entry's own colour.
 */
const SELECTED_ENTRY_IS_PRIMARY = <<<'JS'
    (() => {
        const entry = document.querySelector('.ant-pro-sider-menu .ant-menu-item-selected');
        const probe = document.createElement('span');

        probe.style.color = 'var(--ant-color-primary, rgb(1, 2, 3))';
        entry.append(probe);

        const primary = getComputedStyle(probe).color;

        probe.remove();

        return primary !== 'rgb(1, 2, 3)' && getComputedStyle(entry).color === primary;
    })()
    JS;

test('the menu entry of the current page is in the theme\'s primary colour', function () {
    $this->actingAs(User::factory()->create());

    // An example page is in the menu in every project: the template ships them.
    visitPageWithSideMenu('/examples/orders')->inLightMode()
        ->assertScript(SELECTED_ENTRY_IS_PRIMARY, true);
});

test('a dark appearance cookie renders the app dark', function () {
    $this->actingAs(User::factory()->create());

    $page = visit('/settings/profile');
    $page->script("document.cookie = 'appearance=dark;path=/'");

    $page->refresh()
        ->assertScript("document.documentElement.classList.contains('dark')", true)
        ->assertScript(LAYOUT_BACKDROP_IS_DARK, true)
        ->assertNoJavaScriptErrors();
});

test('the system appearance follows a dark operating system', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/profile')->inDarkMode()
        ->assertScript("document.documentElement.classList.contains('dark')", true)
        ->assertScript(LAYOUT_BACKDROP_IS_DARK, true)
        ->assertNoJavaScriptErrors();
});

test('a light appearance renders the app light', function () {
    $this->actingAs(User::factory()->create());

    visit('/settings/profile')->inLightMode()
        ->assertScript("document.documentElement.classList.contains('dark')", false)
        ->assertScript(LAYOUT_BACKDROP_IS_DARK, false);
});

test('switching to Chinese is kept after a reload', function () {
    $this->actingAs(User::factory()->create());

    $page = visit('/settings/profile')
        ->click('@language-switch')
        ->click('中文')
        ->assertScript('document.documentElement.lang', 'zh-CN');

    $page->refresh()
        ->assertScript('document.documentElement.lang', 'zh-CN')
        ->click('@user-menu-button')
        ->assertSee('设置');
});

test('the examples menu is not shared outside local and testing', function () {
    $this->withoutVite()->actingAs(User::factory()->create());

    $this->get('/settings/profile')
        ->assertInertia(fn (Assert $page) => $page->where('examples.0.key', 'examples'));

    app()->detectEnvironment(fn () => 'production');

    $this->get('/settings/profile')
        ->assertInertia(fn (Assert $page) => $page->where('examples', null));
});

test('a long user name does not make the page wider than a phone', function (string $path) {
    $name = 'Bartholomew Maximilian Featherstonehaugh-Wolfeschlegelstein';
    $this->actingAs(User::factory()->create(['name' => $name]));

    // The header is up once the user menu is, so the width is measured after it.
    // On a phone the browser widens `innerWidth` to fit what overflows, so the
    // screen's width is the visual viewport's, which is 375.
    visit($path)->on()->mobile()
        ->assertPresent('@user-menu-button')
        ->assertScript('window.visualViewport.width', 375)
        ->assertScript('document.documentElement.scrollWidth <= window.visualViewport.width', true)
        ->assertAttribute('@user-menu-button', 'aria-label', $name);
})->with(['/examples/dashboard', '/settings/profile']);

test('a long user name stays inside the side menu on a desktop', function () {
    $name = 'Bartholomew Maximilian Featherstonehaugh-Wolfeschlegelstein';
    $this->actingAs(User::factory()->create(['name' => $name]));

    // Everything in the side menu's footer (the name, the language switch) ends
    // inside the side menu. The name is cut with an ellipsis, so it is still
    // all there for a screen reader and, as the tooltip, for the eye.
    visitPageWithSideMenu()->resize(1280, 800)
        ->assertPresent('@user-menu-button')
        ->assertScript("(() => { const sider = document.querySelector('.ant-pro-sider').getBoundingClientRect(); return [...document.querySelectorAll('.ant-pro-sider-actions *')].every((element) => element.getBoundingClientRect().right <= sider.right + 1); })()", true)
        ->assertScript("document.querySelector('[data-test=\"user-menu-button\"]').textContent", $name)
        ->assertAttribute('@user-menu-button', 'title', $name);
});
