<?php

use Symfony\Component\Process\Process;

/*
 * tests/Pest.php loads the template's helpers after the project's own, so a
 * project that declares a function of the same name keeps its own. That holds
 * only while every function in tests/Support/Template is declared just when no
 * function of its name exists yet.
 */

test('a template helper gives way to a project function of the same name', function (string $helperFile) {
    preg_match_all('/^\s*function\s+(\w+)\s*\(/m', (string) file_get_contents($helperFile), $matches);

    $projectFunctions = implode(' ', array_map(
        fn (string $name): string => "function {$name}() {}",
        $matches[1],
    ));

    $process = new Process([PHP_BINARY, '-r', $projectFunctions.' require $argv[1];', $helperFile]);
    $process->run();

    expect($process->getExitCode())->toBe(0, $process->getOutput().$process->getErrorOutput());
})->with(function (): array {
    $helperFiles = glob(dirname(__DIR__).'/Support/Template/*.php') ?: [];

    return array_combine(array_map(basename(...), $helperFiles), $helperFiles);
});
