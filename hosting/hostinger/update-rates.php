<?php
declare(strict_types=1);

// This executable and its configuration belong OUTSIDE the public web directory.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

ini_set('display_errors', '0');
ini_set('log_errors', '0');
require __DIR__ . '/rates.php';

use Nachlassgold\Hostinger\Rates;
use Nachlassgold\Hostinger\UpdateError;

try {
    if ($argc === 2 && $argv[1] === '--self-test') {
        define('NACHLASSGOLD_SELF_TEST', true);
        require __DIR__ . '/tests/self-test.php';
        exit(0);
    }
    if ($argc !== 2 || !str_starts_with($argv[1], '--config=/')) {
        throw new UpdateError('Aufruf: php update-rates.php --config=/ABSOLUTER/PRIVATER/PFAD/config.php oder --self-test');
    }

    $configPath = realpath(substr($argv[1], strlen('--config=')));
    if ($configPath === false || !is_file($configPath) || !is_readable($configPath)) {
        throw new UpdateError('Die private Konfigurationsdatei fehlt oder ist nicht lesbar.');
    }
    $config = require $configPath;
    $paths = Rates::configuration($config, $configPath, __DIR__);

    $lock = fopen($paths['runtime'] . '/update.lock', 'c');
    if ($lock === false) {
        throw new UpdateError('Die private Sperrdatei konnte nicht geöffnet werden.');
    }
    chmod($paths['runtime'] . '/update.lock', 0600);
    if (!flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        fwrite(STDOUT, "Ein Kurslauf ist bereits aktiv. Keine Änderung.\n");
        exit(0);
    }
    try {
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        // Validate the existing public files before spending an API request.
        Rates::readExisting($paths['assets'], $now);
        $response = Rates::fetch($config['api_key']);
        Rates::apply($paths['assets'], $response, $now);
        fwrite(STDOUT, "Vier EUR/g-Kurse geprüft und veröffentlicht.\n");
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
} catch (UpdateError $error) {
    // Only messages authored in this program are printed; never raw API/cURL errors.
    fwrite(STDERR, 'Kursupdate abgebrochen. ' . $error->getMessage() . "\n");
    exit(1);
} catch (Throwable $error) {
    fwrite(STDERR, "Kursupdate abgebrochen. Konfiguration, Dateizugriff oder Antwortformat prüfen.\n");
    exit(1);
}
