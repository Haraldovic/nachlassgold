<?php
declare(strict_types=1);

namespace Nachlassgold\Hostinger;

use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

final class UpdateError extends RuntimeException {}

final class Rates
{
    private const METALS = ['gold', 'silver', 'platinum', 'palladium'];
    private const GRADES = [
        'gold' => [333, 375, 410, 585, 750, 900, 916, 999],
        'silver' => [800, 835, 900, 925, 950, 999],
        'platinum' => [950, 999], 'palladium' => [950, 999],
    ];
    private const MAX_BYTES = 512000;

    private static function inside(string $path, string $directory): bool
    {
        return $path === $directory || str_starts_with($path, $directory . DIRECTORY_SEPARATOR);
    }

    public static function configuration(mixed $config, string $configPath, string $codeDirectory): array
    {
        if (!is_array($config) || !is_string($config['api_key'] ?? null) ||
            trim($config['api_key']) === '' || strlen($config['api_key']) > 512 ||
            preg_match('/[\x00-\x20\x7f]/', $config['api_key'])) {
            throw new UpdateError('Ein gültiger Metals.Dev-Schlüssel ist in der privaten Konfiguration erforderlich. Bestehende Kurse bleiben erhalten.');
        }
        foreach (['public_directory', 'private_runtime_directory'] as $name) {
            if (!is_string($config[$name] ?? null) || !str_starts_with($config[$name], '/')) {
                throw new UpdateError('Öffentliches Verzeichnis und privates Laufzeitverzeichnis benötigen absolute Pfade.');
            }
        }
        $public = realpath($config['public_directory']);
        $code = realpath($codeDirectory);
        if ($public === false || $public === '/' || !is_dir($public) || $code === false ||
            self::inside($configPath, $public) || self::inside($code, $public)) {
            throw new UpdateError('Programm und Konfiguration müssen außerhalb des öffentlichen Webverzeichnisses liegen.');
        }
        $assets = realpath($public . '/assets');
        if ($assets === false || !is_dir($assets) || !self::inside($assets, $public) || !is_writable($assets)) {
            throw new UpdateError('Das öffentliche assets-Verzeichnis fehlt oder ist nicht beschreibbar.');
        }
        $runtimePath = rtrim($config['private_runtime_directory'], '/');
        if (!is_dir($runtimePath)) {
            $parent = realpath(dirname($runtimePath));
            if ($parent === false || self::inside($parent, $public) || !mkdir($runtimePath, 0700)) {
                throw new UpdateError('Das private Laufzeitverzeichnis konnte nicht angelegt werden.');
            }
        }
        $runtime = realpath($runtimePath);
        if ($runtime === false || self::inside($runtime, $public) || !is_writable($runtime)) {
            throw new UpdateError('Das beschreibbare Laufzeitverzeichnis muss außerhalb des Webverzeichnisses liegen.');
        }
        return ['public' => $public, 'assets' => $assets, 'runtime' => $runtime];
    }

    public static function fetch(string $key): string
    {
        if (!extension_loaded('curl')) {
            throw new UpdateError('Die PHP-Erweiterung cURL ist erforderlich.');
        }
        // Fixed, allowlisted HTTPS host. Neither the host nor a URL is configurable.
        $url = 'https://api.metals.dev/v1/latest?' . http_build_query(
            ['api_key' => $key, 'currency' => 'EUR', 'unit' => 'g'], '', '&', PHP_QUERY_RFC3986
        );
        $handle = curl_init($url);
        if ($handle === false) {
            throw new UpdateError('Der Kursabruf konnte nicht vorbereitet werden.');
        }
        $body = '';
        curl_setopt_array($handle, [
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_MAXREDIRS => 0,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 22,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
            CURLOPT_USERAGENT => 'Nachlassgold-Kursdienst/1.0',
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
                if (strlen($body) + strlen($chunk) > self::MAX_BYTES) {
                    return 0;
                }
                $body .= $chunk;
                return strlen($chunk);
            },
        ]);
        try {
            $ok = curl_exec($handle);
            $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
            if ($ok === false || $status !== 200) {
                throw new UpdateError('Datenanbieter nicht erreichbar oder Abruf abgelehnt. Vorherige Kurse bleiben erhalten.');
            }
            return $body;
        } finally {
            curl_close($handle);
        }
    }

    private static function decode(string $raw): array
    {
        if (strlen($raw) > self::MAX_BYTES) {
            throw new UpdateError('Unerwartete Datenmenge.');
        }
        $value = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($value)) {
            throw new UpdateError('Antwort ist kein Kursdokument.');
        }
        return $value;
    }

    private static function price(mixed $value): float|int
    {
        if ((!is_float($value) && !is_int($value)) || !is_finite((float) $value) || $value <= 0 || $value >= 1000000) {
            throw new UpdateError('Ungültiger Metallpreis.');
        }
        return $value;
    }

    private static function time(mixed $value, DateTimeImmutable $now, bool $dateAllowed = false): DateTimeImmutable
    {
        $isDate = is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value);
        $isTimestamp = is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/D', $value);
        if ((!$dateAllowed || !$isDate) && !$isTimestamp) {
            throw new UpdateError('Ungültiger Kurszeitpunkt.');
        }
        $stamp = new DateTimeImmutable($value, new DateTimeZone('UTC'));
        $errors = DateTimeImmutable::getLastErrors();
        if (($errors !== false && ($errors['warning_count'] || $errors['error_count'])) || $stamp->getTimestamp() > $now->getTimestamp() + 300) {
            throw new UpdateError('Kurszeitpunkt ungültig oder in der Zukunft.');
        }
        return $stamp;
    }

    public static function validateBundle(array $data, DateTimeImmutable $now): array
    {
        if (($data['version'] ?? null) !== 1 || ($data['currency'] ?? null) !== 'EUR' || ($data['unit'] ?? null) !== 'g') {
            throw new UpdateError('Ungültiges bestehendes Kursdateiformat.');
        }
        foreach (self::METALS as $metal) {
            $quote = $data['metals'][$metal] ?? null;
            if (!is_array($quote)) {
                throw new UpdateError('Ein Metall fehlt im Kursdokument.');
            }
            self::time($quote['asOf'] ?? null, $now, true);
            if (($quote['source'] ?? null) === 'archive') {
                foreach (self::GRADES[$metal] as $grade) {
                    self::price($quote['alloys'][(string) $grade] ?? null);
                }
            } elseif (($quote['source'] ?? null) === 'metalsdev') {
                self::price($quote['eurPerGram'] ?? null);
            } elseif (($quote['source'] ?? null) === 'nbp' && $metal === 'gold') {
                $expected = self::price($quote['goldPlnPerGram'] ?? null) / self::price($quote['plnPerEuro'] ?? null);
                if (abs(self::price($quote['eurPerGram'] ?? null) - $expected) > abs($expected) * 1.0e-10) {
                    throw new UpdateError('Die bestehende NBP-Umrechnung stimmt nicht.');
                }
            } else {
                throw new UpdateError('Unbekannte Kursquelle.');
            }
        }
        return $data;
    }

    public static function readExisting(string $assets, DateTimeImmutable $now): array
    {
        foreach (['rates-data.json', 'rates-data.js'] as $name) {
            $path = $assets . '/' . $name;
            if (!is_file($path) || is_link($path) || !is_readable($path) || filesize($path) > self::MAX_BYTES) {
                throw new UpdateError('Beide vorhandenen Kursdateien müssen regulär, lesbar und vollständig bereitliegen.');
            }
        }
        $raw = file_get_contents($assets . '/rates-data.json');
        if ($raw === false) {
            throw new UpdateError('Der bestehende Kursstand konnte nicht gelesen werden.');
        }
        return self::validateBundle(self::decode($raw), $now);
    }

    public static function apply(string $assets, string $response, DateTimeImmutable $now): void
    {
        $previous = self::readExisting($assets, $now);
        $feed = self::decode($response);
        if (($feed['status'] ?? null) !== 'success' || ($feed['currency'] ?? null) !== 'EUR' || ($feed['unit'] ?? null) !== 'g') {
            throw new UpdateError('Metals.Dev liefert keine verwertbaren EUR/g-Kurse.');
        }
        $stamp = self::time($feed['timestamp'] ?? null, $now);
        if ($now->getTimestamp() - $stamp->getTimestamp() > 7 * 86400) {
            throw new UpdateError('Der gelieferte Kursstand ist älter als sieben Tage.');
        }
        $next = ['version' => 1, 'currency' => 'EUR', 'unit' => 'g', 'metals' => []];
        foreach (self::METALS as $metal) {
            if ($stamp < self::time($previous['metals'][$metal]['asOf'], $now, true)) {
                throw new UpdateError('Der Abruf würde einen neueren bestehenden Kurs zurücksetzen.');
            }
            $next['metals'][$metal] = [
                'source' => 'metalsdev',
                'asOf' => $stamp->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:sP'),
                'eurPerGram' => self::price($feed['metals'][$metal] ?? null),
            ];
        }
        self::validateBundle($next, $now);
        $json = json_encode($next, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
        self::publish($assets, $json, 'window.NachlassgoldRates = ' . rtrim($json) . ";\n");
    }

    private static function stage(string $directory, string $bytes): string
    {
        $temporary = tempnam($directory, '.rates-');
        if ($temporary === false || dirname($temporary) !== $directory) {
            if ($temporary !== false) { unlink($temporary); }
            throw new UpdateError('Kursdatei konnte nicht im Zielverzeichnis vorbereitet werden.');
        }
        if (file_put_contents($temporary, $bytes, LOCK_EX) !== strlen($bytes) || !chmod($temporary, 0644)) {
            unlink($temporary);
            throw new UpdateError('Kursdatei konnte nicht vollständig vorbereitet werden.');
        }
        return $temporary;
    }

    private static function publish(string $assets, string $json, string $javascript): void
    {
        $staged = [];
        try {
            // Prepare every file and a JS rollback copy before touching public files.
            $oldJs = file_get_contents($assets . '/rates-data.js');
            if ($oldJs === false) { throw new UpdateError('JavaScript-Kursstand nicht lesbar.'); }
            $staged[] = $jsonFile = self::stage($assets, $json);
            $staged[] = $jsFile = self::stage($assets, $javascript);
            $staged[] = $rollback = self::stage($assets, $oldJs);
            if (!rename($jsFile, $assets . '/rates-data.js')) {
                throw new UpdateError('Die Kursdateien konnten nicht ersetzt werden.');
            }
            // JSON is authoritative for browser refresh; each replacement is atomic.
            if (!rename($jsonFile, $assets . '/rates-data.json')) {
                if (!rename($rollback, $assets . '/rates-data.js')) {
                    throw new UpdateError('Dateisystemfehler beim Rücksetzen. Kursdateien vor weiterem Betrieb prüfen.');
                }
                throw new UpdateError('JSON-Veröffentlichung fehlgeschlagen. Vorheriger Kursstand wiederhergestellt.');
            }
        } finally {
            foreach ($staged as $temporary) {
                if (is_file($temporary)) { unlink($temporary); }
            }
        }
    }
}
