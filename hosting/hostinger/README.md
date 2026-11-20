# Kursaktualisierung auf Hostinger vorbereiten

Dieser Ordner ist eine **noch nicht aktivierte** Alternative zum bestehenden GitHub-Pages-Workflow. Es wurde kein Hosting umgestellt und kein Metals.Dev-Konto angelegt. Die Website und ihre Kursdateien bleiben unverändert.

Die Lösung braucht PHP 8.2 oder neuer mit cURL, Schreibrechte auf die beiden Kursdateien und einen Cronjob. Hostinger beschreibt PHP-Cronjobs für Web-/Cloud-Hosting. Das bisherige Python-Skript ist dort laut Hostinger nicht direkt unterstützt; Python benötigt VPS-Hosting. Hostinger Website Builder ist nicht dasselbe wie ein Webhosting-Verzeichnis mit PHP.

## Verzeichnisaufteilung

**Diesen gesamten Ordner niemals unter `public_html` hochladen.** Auch keine echte Konfiguration oder API-Schlüssel in GitHub einchecken. Die Beispielkonfiguration enthält keinen Schlüssel.

Beispielpfade (USER und DOMAIN an den tatsächlichen Account anpassen):

| Datei/Ordner | Ziel |
| --- | --- |
| Öffentliche HTML-Dateien und `assets/` | `/home/USER/domains/DOMAIN/public_html/` |
| `update-rates.php`, `rates.php`, `tests/` | `/home/USER/private/nachlassgold/` |
| Echte `config.php` | `/home/USER/private/nachlassgold/config.php` |
| Sperrdatei im privaten Laufzeitverzeichnis | `/home/USER/private/nachlassgold/runtime/` |

`assets/rates-data.json` und `assets/rates-data.js` müssen aus der Website vorhanden sein. Vor der Umstellung den zuletzt veröffentlichten, geprüften Stand übernehmen. Bei späteren Website-Uploads diese beiden Laufzeitdateien nicht mit älteren Paketwerten überschreiben. Das Programm ersetzt sie erst nach einem erfolgreichen, validierten Abruf.

1. Privates Verzeichnis außerhalb des Webverzeichnisses erstellen; möglichst Zugriffsrechte `700` setzen.
2. Die Programmdateien dorthin kopieren. Die öffentlichen Website-Dateien separat bereitstellen, ohne `.github`, Dokumentation oder diesen privaten Ordner.
3. `config.example.php` außerhalb des Webverzeichnisses als `config.php` speichern. `public_directory` und `private_runtime_directory` auf die realen absoluten Pfade setzen. Den eigenen Metals.Dev-Schlüssel ausschließlich in dieser privaten Datei eintragen, Datei-Zugriffsrechte `600` setzen.
4. PHP-Version und aktivierte cURL-Erweiterung im Hostinger-Dashboard prüfen. Keine `phpinfo.php` mit Serverinformationen öffentlich liegen lassen.

## Erst prüfen, dann aktivieren

Prüfstand der Vorbereitung: In der Erstellungsumgebung war kein PHP-Interpreter vorhanden. Der folgende PHP-Selbsttest und der echte Abruf sind deshalb vor der Aktivierung auf dem Zielsystem noch auszuführen; die öffentliche Paketierung wurde auf den Ausschluss aller privaten Dateien geprüft.

Ein einzelner Testlauf, ohne API-Schlüssel und **ohne Netzwerk**:

```bash
php /home/USER/private/nachlassgold/update-rates.php --self-test
```

Der Test verwendet ausschließlich `tests/metals-response.fixture` mit ausdrücklich künstlichen Preisen und eine eingefrorene Testzeit. Er erstellt ein zufälliges temporäres Verzeichnis, prüft erfolgreiche Aktualisierung, ungültige Werte, falsche Einheiten, fehlende Metalle, ungültige/veraltete/zukünftige Zeitstempel, Rückschritte und die Beibehaltung vorhandener Dateien bei abgelehnten Antworten. Anschließend entfernt er seine temporären Dateien. Er liest keine echte Konfiguration. Es gibt keinen `--fixture`-Schalter und keinen konfigurierbaren API-Host, mit dem Testdaten versehentlich auf die Website geleitet werden könnten. Die Dateiendung `.fixture` ist außerdem von der bestehenden öffentlichen Pages-Paketierung ausgeschlossen.

Der erste **echte** Abruf (verbraucht eine API-Anfrage und aktualisiert bei Erfolg die Website):

```bash
php /home/USER/private/nachlassgold/update-rates.php --config=/home/USER/private/nachlassgold/config.php
```

Danach `edelmetallkurse.html` neu öffnen und alle vier Metalle kontrollieren: Quelle Metals.Dev, passendes Datum/Uhrzeit, EUR je Gramm. Im Ankaufsrechner zusätzlich Gewicht, Feingehalt, Abschlag und Schätzung prüfen. Keine künstlichen Testwerte manuell in die öffentlichen Dateien kopieren.

Das Programm verweigert Webaufrufe, leere Schlüssel und öffentlich abgelegte Programm-/Konfigurationspfade. Im Betrieb werden nur `https://api.metals.dev/v1/latest`, EUR und Gramm verwendet; Weiterleitungen sind abgeschaltet. Die API-Antwort ist auf 512 kB und der Abruf auf 22 Sekunden begrenzt. Rohantworten, API-URLs und Schlüssel werden nicht protokolliert.

## Cronjob in Hostinger

Unter **Websites → Manage site → Cron Jobs** einen PHP-Cronjob mit dem absoluten Skriptpfad und dem obigen `--config`-Argument einrichten. Falls das PHP-Feld im konkreten Tarif keine Argumente annimmt, Typ **Custom** mit dem vollständigen Befehl verwenden:

```text
/usr/bin/php /home/USER/private/nachlassgold/update-rates.php --config=/home/USER/private/nachlassgold/config.php
```

Den tatsächlichen PHP-Pfad im Account bestätigen. Hostinger dokumentiert `/usr/bin/php` für PHP-Cronbefehle. Beispielzeitplan: **Minute 17, jede Stunde, jeden Tag** (`17 * * * *`). Hostinger verwendet UTC; die Website zeigt Kurszeiten in Europe/Berlin.

Bei stündlichem Abruf fallen höchstens 744 Anfragen in einem Monat mit 31 Tagen an, zuzüglich manueller Läufe. Metals.Dev nennt am 20.11.2026 für Free 100 Anfragen/Monat, für Copper 2.000 Anfragen/Monat zu 1,79 USD. Tarif und Preis vor Aktivierung prüfen. Das Programm kauft nichts und ändert keinen Tarif. Ein kostenloser Betrieb mit zwei Abrufen pro Tag benötigt höchstens 62 geplante Anfragen, hat aber entsprechend ältere Zwischenstände.

Nach dem Umzug nur **einen** Kurszeitplan für die produktive Website betreiben. Die GitHub-Pages-Vorschau und deren Workflow werden durch diese Vorbereitung nicht verändert.

## Fehler, Alter und Veröffentlichung

- Ein fehlender Schlüssel, Netzwerk-/API-Fehler oder eine unbrauchbare Antwort beendet den Lauf mit Fehlercode 1. Der vorhandene Stand wird behalten. Es gibt hier keinen automatischen Wechsel zu Gold-only-NBP-Daten.
- Alle vier Preise müssen positive endliche Zahlen unter 1.000.000 EUR/g sein; Währung und Einheit müssen exakt EUR/g entsprechen. Der neue Zeitstempel benötigt eine Zeitzone, darf höchstens fünf Minuten voraus und höchstens sieben Tage zurückliegen (wie im bisherigen Updater).
- Kein Metall darf auf einen älteren Stand zurückgesetzt werden. Bereits archivierte Anfangswerte werden erst durch einen geprüften vollständigen Metals.Dev-Abruf ersetzt.
- Die bestehende Oberfläche zeigt Quelle und Stand und kennzeichnet Daten nach 36 Stunden als älter. Die Toleranz des Updaters ist kein Versprechen einer Echtzeit-Aktualisierung.
- Eine private Dateisperre verhindert überlappende Cronläufe. Beide Ausgabedateien werden vollständig vorbereitet und einzeln atomar ersetzt: JS zuerst, das für Browser-Aktualisierungen maßgebliche JSON danach. Schlägt die zweite Ersetzung fehl, wird das alte JS zurückgesetzt. Ein kompletter Dateisystemausfall ist keine garantierte Zwei-Dateien-Transaktion; nach einem solchen Vorfall beide Dateien prüfen. Normale API-/Validierungsfehler verändern keine der beiden Dateien.
- Cronausgaben regelmäßig prüfen. Fehlgeschlagene Abrufe melden keine geheimen Inhalte; die öffentliche Website behält ihren nachvollziehbaren Zeitstempel.

## Offizielle Quellen

- [Hostinger: Cronjobs erstellen](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/)
- [Hostinger: unterstützte Sprachen, Python nur auf VPS](https://www.hostinger.com/support/which-programming-languages-and-frameworks-are-supported-at-hostinger/)
- [Hostinger: PHP-Konfiguration prüfen](https://www.hostinger.com/support/1583467-how-to-check-the-php-information-of-your-website-in-hostinger/)
- [Metals.Dev: API-Dokumentation](https://metals.dev/docs)
- [Metals.Dev: Tarife und Anfragekontingente](https://metals.dev/pricing)
