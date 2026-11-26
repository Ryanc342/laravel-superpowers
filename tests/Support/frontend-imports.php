<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/*
 * Reading the front end's imports, for the check that a production build has
 * everything they lead to (tests/Feature/ExamplesRoutesTest.php). A production
 * build has no example routes, and leaves the example pages out.
 */

/**
 * The imports of a file's code that its build keeps, and what each takes from
 * its module: `default`, `*` for all of it, or names. The build erases a
 * type-only import, so it is left out.
 *
 * @return list<array{from: string, takes: list<string>}>
 */
function frontendImports(string $code): array
{
    $imports = [];

    // import a, { b, c as d } from '…', import * as a from '…', export { a } from '…', export * from '…'
    preg_match_all('/^\s*(?:import|export)\s+(type\s+)?([^;\'"]*?)\s*from\s*[\'"]([^\'"]+)[\'"]/m', $code, $statements, PREG_SET_ORDER);

    foreach ($statements as [, $typeOnly, $clause, $from]) {
        if ($typeOnly === '') {
            $imports[] = ['from' => $from, 'takes' => frontendImportTakes($clause)];
        }
    }

    // import '…', for what running it does, and import('…'), which takes all of it.
    preg_match_all('/^\s*import\s*[\'"]([^\'"]+)[\'"]/m', $code, $sideEffects);
    preg_match_all('/\bimport\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)/', $code, $dynamic);

    foreach ($sideEffects[1] as $from) {
        $imports[] = ['from' => $from, 'takes' => []];
    }

    foreach ($dynamic[1] as $from) {
        $imports[] = ['from' => $from, 'takes' => ['*']];
    }

    return $imports;
}

/**
 * What an import's clause takes: `a, { b, c as d, type E }` takes `default`,
 * `b` and `c`, and `* as a` takes `*`.
 *
 * @return list<string>
 */
function frontendImportTakes(string $clause): array
{
    $takes = [];

    if (preg_match('/\{([^}]*)\}/', $clause, $braces) === 1) {
        foreach (array_map(trim(...), explode(',', $braces[1])) as $specifier) {
            if ($specifier !== '' && ! str_starts_with($specifier, 'type ')) {
                $takes[] = Str::before($specifier, ' ');
            }
        }

        $clause = str_replace($braces[0], '', $clause);
    }

    if (str_contains($clause, '*')) {
        $takes[] = '*';
    }

    if (preg_match('/^\s*[A-Za-z_$][\w$]*\s*(,|$)/', $clause) === 1) {
        $takes[] = 'default';
    }

    return $takes;
}

/**
 * Where an import in `$file` (a path under resources/js) leads: a path under
 * resources/js with no extension, from `@/…` or a relative path. A package's
 * import leads nowhere in it: null.
 */
function frontendImportTarget(string $file, string $from): ?string
{
    if (str_starts_with($from, '@/')) {
        $path = substr($from, 2);
    } elseif (str_starts_with($from, '.')) {
        $path = dirname($file).'/'.$from;
    } else {
        return null;
    }

    $segments = [];

    foreach (explode('/', $path) as $segment) {
        if ($segment === '..') {
            array_pop($segments);
        } elseif ($segment !== '.' && $segment !== '') {
            $segments[] = $segment;
        }
    }

    return preg_replace('/\.[jt]sx?$/', '', implode('/', $segments));
}

/**
 * The file of a generated module in a folder Wayfinder wrote: `routes/login`
 * is `routes/login.ts` or `routes/login/index.ts`. Null when it has none.
 */
function generatedModule(string $generated, string $target): ?string
{
    foreach (["{$generated}/{$target}.ts", "{$generated}/{$target}/index.ts"] as $file) {
        if (File::isFile($file)) {
            return $file;
        }
    }

    return null;
}

/**
 * Whether a generated module, or a module it imports, reads differently in
 * production than in local and testing: there it has the examples.
 */
function generatedModuleDiffers(string $target, string $production, string $local): bool
{
    $queue = [$target];
    $seen = [];

    while (($path = array_pop($queue)) !== null) {
        $localModule = generatedModule($local, $path);

        if ($localModule === null || isset($seen[$localModule])) {
            continue;
        }

        $seen[$localModule] = true;
        $productionModule = generatedModule($production, $path);

        if ($productionModule === null || File::get($productionModule) !== File::get($localModule)) {
            return true;
        }

        foreach (frontendImports(File::get($localModule)) as ['from' => $from]) {
            $next = frontendImportTarget(Str::after($localModule, "{$local}/"), $from);

            if ($next !== null) {
                $queue[] = $next;
            }
        }
    }

    return false;
}

/**
 * The imports in `$sources` that a production build could not load: an
 * example page, a generated module production does not have, a name it does
 * not export, or all of a module that has more in local and testing. Each is
 * `from (file): why`.
 *
 * @param  array<string, string>  $sources  each file's code, by its path under resources/js
 * @param  string  $production  where Wayfinder wrote production's routes
 * @param  string  $local  where Wayfinder wrote the routes of local and testing
 * @return list<string>
 */
function productionImportProblems(array $sources, string $production, string $local): array
{
    $problems = [];

    foreach ($sources as $file => $code) {
        foreach (frontendImports($code) as ['from' => $from, 'takes' => $takes]) {
            $target = frontendImportTarget($file, $from);
            $where = "{$from} ({$file})";

            if ($target === null || preg_match('#^(pages/examples|routes|actions|wayfinder)(/|$)#', $target) !== 1) {
                continue;
            }

            if (str_starts_with($target, 'pages/')) {
                $problems[] = "{$where}: an example page, which a production build leaves out";

                continue;
            }

            $module = generatedModule($production, $target);

            if ($module === null) {
                $problems[] = "{$where}: not generated in production";

                continue;
            }

            if (array_intersect($takes, ['default', '*']) !== [] && generatedModuleDiffers($target, $production, $local)) {
                $problems[] = "{$where}: the whole module, which has more in local and testing than in production";
            }

            foreach (array_diff($takes, ['default', '*']) as $name) {
                $exported = '/^export\s+(?:const|let|var|function|async\s+function|class|enum)\s+'.preg_quote($name, '/').'\b|^export\s*\{[^}]*\b'.preg_quote($name, '/').'\b/m';

                if (preg_match($exported, File::get($module)) !== 1) {
                    $problems[] = "{$where}: {$name} is not exported in production";
                }
            }
        }
    }

    return $problems;
}
