<?php
declare(strict_types=1);

use Nachlassgold\Hostinger\Rates;

if (PHP_SAPI !== 'cli' || !defined('NACHLASSGOLD_SELF_TEST')) {
    if (PHP_SAPI !== 'cli') { http_response_code(403); }
    exit(1);
}

// No network, no configuration file, no user-supplied output path.
// Every write is confined to a newly created temporary test directory.
$root = rtrim(sys_get_temp_dir(), '/') . '/nachlassgold-selftest-' . bin2hex(random_bytes(12));
if (!mkdir($root, 0700)) { throw new RuntimeException('Testverzeichnis fehlt.'); }
$checks = 0;
$check = static function (bool $condition, string $label) use (&$checks): void {
    if (!$condition) { throw new RuntimeException('Self-test failed: ' . $label); }
    $checks++;
};

try {
    mkdir($root . '/public_html', 0700);
    mkdir($root . '/public_html/assets', 0700);
    mkdir($root . '/private', 0700);
    $assets = $root . '/public_html/assets';
    $now = new DateTimeImmutable('2026-11-20T12:00:00Z');
    $fixture = json_decode(file_get_contents(__DIR__ . '/metals-response.fixture'), true, 32, JSON_THROW_ON_ERROR);
    $seed = ['version' => 1, 'currency' => 'EUR', 'unit' => 'g', 'metals' => []];
    foreach ($fixture['metals'] as $metal => $price) {
        $seed['metals'][$metal] = ['source' => 'metalsdev', 'asOf' => '2026-11-20T11:00:00Z', 'eurPerGram' => $price * 0.9];
    }
    $put = static function (array $bundle) use ($assets): void {
        $json = json_encode($bundle, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . "\n";
        file_put_contents($assets . '/rates-data.json', $json);
        file_put_contents($assets . '/rates-data.js', 'window.NachlassgoldRates = ' . rtrim($json) . ";\n");
    };
    $snapshot = static function () use ($assets): array {
        return [file_get_contents($assets . '/rates-data.json'), file_get_contents($assets . '/rates-data.js')];
    };
    $put($seed);
    Rates::apply($assets, json_encode($fixture, JSON_THROW_ON_ERROR), $now);
    $actual = json_decode(file_get_contents($assets . '/rates-data.json'), true, 32, JSON_THROW_ON_ERROR);
    $check($actual['metals']['gold']['eurPerGram'] === 100, 'valid gold');
    $check(count($actual['metals']) === 4, 'all four metals');
    $check($actual['metals']['silver']['source'] === 'metalsdev', 'source');
    $check($actual['metals']['platinum']['asOf'] === '2026-11-20T12:00:00+00:00', 'timestamp');
    $check(file_get_contents($assets . '/rates-data.js') === 'window.NachlassgoldRates = ' . rtrim(file_get_contents($assets . '/rates-data.json')) . ";\n", 'matching JS and JSON');
    $check(glob($assets . '/.rates-*') === [], 'no staging files remain');

    $invalid = [];
    foreach (['currency' => 'USD', 'unit' => 'toz', 'status' => 'failure'] as $field => $value) {
        $copy = $fixture; $copy[$field] = $value; $invalid[$field] = $copy;
    }
    foreach ([0, -1, '100', true, 1000000, null] as $index => $value) {
        $copy = $fixture; $copy['metals']['gold'] = $value; $invalid['invalid price ' . $index] = $copy;
    }
    $copy = $fixture; unset($copy['metals']['palladium']); $invalid['missing metal'] = $copy;
    foreach (['2026-11-20T12:05:01Z', '2026-11-12T12:00:00Z', '2026-11-20T10:00:00Z', '2026-11-20T12:00:00', '2026-02-30T12:00:00Z', '2026-11-20T12:00:00+99:99', '2026-11-20T24:00:00Z', 'not-a-date'] as $stamp) {
        $copy = $fixture; $copy['timestamp'] = $stamp; $invalid['timestamp ' . $stamp] = $copy;
    }
    $invalidRaw = ['broken JSON' => '{broken', 'oversized' => str_repeat(' ', 512001)];
    foreach ($invalid as $label => $feed) { $invalidRaw[$label] = json_encode($feed, JSON_THROW_ON_ERROR); }
    foreach ($invalidRaw as $label => $raw) {
        $put($seed); $before = $snapshot(); $rejected = false;
        try { Rates::apply($assets, $raw, $now); } catch (Throwable $error) { $rejected = true; }
        $check($rejected, 'reject ' . $label);
        $check($snapshot() === $before, 'preserve files after ' . $label);
    }

    // The initial website contains NBP gold and dated alloy archives.
    $initial = $seed;
    $initial['metals']['gold'] = ['source' => 'nbp', 'asOf' => '2026-11-19', 'eurPerGram' => 100, 'goldPlnPerGram' => 440, 'plnPerEuro' => 4.4];
    foreach (['silver' => [800, 835, 900, 925, 950, 999], 'platinum' => [950, 999], 'palladium' => [950, 999]] as $metal => $grades) {
        $initial['metals'][$metal] = ['source' => 'archive', 'asOf' => '2026-11-19', 'alloys' => array_fill_keys($grades, 1)];
    }
    $put($initial);
    Rates::apply($assets, json_encode($fixture, JSON_THROW_ON_ERROR), $now);
    $upgraded = json_decode(file_get_contents($assets . '/rates-data.json'), true, 32, JSON_THROW_ON_ERROR);
    $check(count(array_filter($upgraded['metals'], static fn(array $q): bool => $q['source'] === 'metalsdev')) === 4, 'upgrade NBP and archive');

    // All four previous timestamps matter, not only gold's timestamp.
    $newer = $seed; $newer['metals']['silver']['asOf'] = '2026-11-20T12:01:00Z';
    $put($newer); $before = $snapshot(); $rejected = false;
    try { Rates::apply($assets, json_encode($fixture, JSON_THROW_ON_ERROR), $now); } catch (Throwable $error) { $rejected = true; }
    $check($rejected && $snapshot() === $before, 'no regression of any metal');

    $config = ['api_key' => 'test-placeholder-never-requested', 'public_directory' => $root . '/public_html', 'private_runtime_directory' => $root . '/private/runtime'];
    $privateConfig = $root . '/private/config.php';
    file_put_contents($privateConfig, '<?php return [];');
    $paths = Rates::configuration($config, $privateConfig, dirname(__DIR__));
    $check($paths['assets'] === $assets && is_dir($paths['runtime']), 'private configuration');
    foreach (['empty key', 'public config', 'public code', 'public runtime'] as $scenario) {
        $bad = $config; $path = $privateConfig; $code = dirname(__DIR__);
        if ($scenario === 'empty key') { $bad['api_key'] = ''; }
        if ($scenario === 'public config') { $path = $root . '/public_html/config.php'; }
        if ($scenario === 'public code') { $code = $root . '/public_html'; }
        if ($scenario === 'public runtime') { $bad['private_runtime_directory'] = $root . '/public_html/runtime'; }
        $rejected = false;
        try { Rates::configuration($bad, $path, $code); } catch (Throwable $error) { $rejected = true; }
        $check($rejected, 'reject ' . $scenario);
    }
    fwrite(STDOUT, $checks . " Prüfungen erfolgreich. Nur temporäre Testdateien verwendet; kein Netzwerkabruf.\n");
} finally {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) {
        if ($file->isDir() && !$file->isLink()) { rmdir($file->getPathname()); }
        else { unlink($file->getPathname()); }
    }
    rmdir($root);
}
