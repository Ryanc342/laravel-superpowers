<?php

use Illuminate\Support\Str;
use Symfony\Component\Finder\Finder;

/*
 * A sentence is keyed by its English text, so a forgotten Chinese translation
 * would ship as English text on a Chinese page. This test reads the code for
 * every literal sentence it shows and fails for each one that has no Chinese.
 *
 * Only literal first arguments are read. t(item.title) is translated where it
 * is shown, and the sentence itself is marked with msg('...') where it is
 * written, which is why msg() is read too.
 */

/**
 * The sentences that PHP translation groups hold (`auth.failed`,
 * `validation.required`) are not keys of the JSON files.
 */
function isTranslationGroupKey(string $key): bool
{
    return preg_match('/^[a-z_]+\.[a-z_.]+$/', $key) === 1;
}

/**
 * The literal first arguments of the calls the regular expression finds. A
 * string that holds a variable (`${name}` in JavaScript, `$name` in PHP) is not
 * a sentence.
 *
 * @return list<string>
 */
function literalSentences(string $pattern, string $source, bool $isJavaScript): array
{
    preg_match_all($pattern, $source, $matches, PREG_SET_ORDER);

    $sentences = [];

    foreach ($matches as [, $quote, $body]) {
        $holdsVariable = $isJavaScript
            ? $quote === '`' && str_contains($body, '${')
            : $quote === '"' && str_contains($body, '$');

        if ($holdsVariable) {
            continue;
        }

        $sentence = $isJavaScript || $quote === '"'
            ? stripcslashes($body)
            : strtr($body, ["\\'" => "'", '\\\\' => '\\']);

        if (! isTranslationGroupKey($sentence)) {
            $sentences[] = $sentence;
        }
    }

    return $sentences;
}

/**
 * @return list<string>
 */
function literalSentencesInJavaScript(string $source): array
{
    return literalSentences(<<<'REGEX'
        ~(?<![\w$.])(?:t|tChoice|msg)\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]~s
        REGEX, $source, isJavaScript: true);
}

/**
 * @return list<string>
 */
function literalSentencesInPhp(string $source): array
{
    return literalSentences(<<<'REGEX'
        ~(?<![\w$>:])(?:__|trans|trans_choice)\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]~s
        REGEX, $source, isJavaScript: false);
}

/**
 * Every literal sentence the code shows, with the files that show it.
 *
 * @return array<string, list<string>>
 */
function sentencesTheCodeShows(): array
{
    $files = [
        // Wayfinder writes the folders that are left out: they hold route functions, not text.
        [literalSentencesInJavaScript(...), Finder::create()->files()->in(resource_path('js'))->name(['*.ts', '*.tsx'])->notPath('#^(actions|routes|wayfinder)/#')],
        [literalSentencesInPhp(...), Finder::create()->files()->in(app_path())->name('*.php')],
        [literalSentencesInPhp(...), Finder::create()->files()->in(base_path('routes'))->depth(0)->name('*.php')],
        [literalSentencesInPhp(...), Finder::create()->files()->in(resource_path('views'))->name('*.blade.php')],
    ];

    $shownIn = [];

    foreach ($files as [$read, $finder]) {
        foreach ($finder as $file) {
            foreach ($read($file->getContents()) as $sentence) {
                $shownIn[$sentence][] = Str::after($file->getPathname(), base_path().'/');
            }
        }
    }

    return $shownIn;
}

/**
 * The Chinese the app has: the template's sentences, with the project's own
 * lang/zh_CN.json over them when the project has one.
 *
 * @return array<string, string>
 */
function chineseSentences(): array
{
    $sentences = [];

    foreach ([lang_path('template/zh_CN.json'), lang_path('zh_CN.json')] as $path) {
        if (file_exists($path)) {
            $sentences = [...$sentences, ...json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR)];
        }
    }

    return $sentences;
}

test('every literal sentence the code shows is translated into Chinese', function () {
    $chinese = chineseSentences();
    $missing = [];

    foreach (sentencesTheCodeShows() as $sentence => $files) {
        if (trim($chinese[$sentence] ?? '') === '') {
            $missing[] = sprintf('"%s" (%s)', $sentence, implode(', ', array_unique($files)));
        }
    }

    $this->assertSame(
        [],
        $missing,
        "These sentences have no Chinese. Add each to lang/template/zh_CN.json when it is one of the template's own sentences, or to lang/zh_CN.json when it is a project's:\n".implode("\n", $missing),
    );
});

test('the scan reads literal sentences in JavaScript and leaves everything else', function () {
    $source = <<<'TS'
        t('Save');
        tChoice("one task|:count tasks", tasks.length);
        msg(`Back`);
        t('Don\'t');
        t('Two words', { name });
        t(name);
        t('a' + suffix);
        t(`Hello ${name}`);
        t('auth.failed');
        format('Nope');
        label.t('Nope');
        TS;

    expect(literalSentencesInJavaScript($source))->toBe([
        'Save',
        'one task|:count tasks',
        'Back',
        "Don't",
        'Two words',
    ]);
});

test('the scan reads literal sentences in PHP and leaves everything else', function () {
    $source = <<<'PHP'
        __('Profile updated.');
        trans("Check your inbox");
        trans_choice('one item|:count items', $count);
        __('Don\'t');
        __('Hello :name', ['name' => $name]);
        __($key);
        __("Hello $name");
        __('auth.failed');
        $translator->trans('Nope');
        Lang::trans('Nope');
        PHP;

    expect(literalSentencesInPhp($source))->toBe([
        'Profile updated.',
        'Check your inbox',
        'one item|:count items',
        "Don't",
        'Hello :name',
    ]);
});

test('the scan finds the sentences the code shows today', function () {
    expect(sentencesTheCodeShows())
        ->toHaveKey('Profile updated.')
        ->toHaveKey('Password updated.');
});
