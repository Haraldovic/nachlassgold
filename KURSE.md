# Nachlassgold auf GitHub Pages

Die mitgelieferte Kursdatei funktioniert bereits beim lokalen Öffnen. Der Goldwert vom 19. November 2026 basiert auf den veröffentlichten Daten der Narodowy Bank Polski. 487,99 PLN je Gramm Feingold geteilt durch 4,4165 PLN je EUR ergeben 110,4924714 EUR je Gramm Feingold. Bei 999er Gold zeigt die Kurstafel deshalb 110,38 EUR je Gramm der Legierung an. Die übrigen drei Metalle zeigen die am selben Tag auf nachlassgold.de abgelesenen Materialwerte je Legierung als Archiv an.

## Automatische Veröffentlichung

1. Den vollständigen Inhalt des gewünschten Website-Pakets einschließlich des Ordners `.github` in den Stamm des eigenen Repositorys legen. Genau eine `rates-data.json` gehört in das Paket. `rates.js`, `rates-data.js` und `rates-data.json` liegen nebeneinander.
2. Im Repository unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** wählen.
3. Für Marktwerte aller vier Edelmetalle unter **Settings → Secrets and variables → Actions → New repository secret** einen eigenen Metals.Dev-Schlüssel als `METALS_DEV_API_KEY` eintragen. Ohne Schlüssel holt der Workflow den Gold-Tagesreferenzwert und den EUR/PLN-Mittelkurs aus Tabelle A der polnischen Zentralbank. Er gleicht beide Veröffentlichungen nach Stichtag ab. Silber, Platin und Palladium behalten ihren belegten Stand mit Quelle und Datum.
4. Unter **Actions → Nachlassgold – Kurse und Pages → Run workflow** auf dem Standardbranch starten. Der Workflow läuft außerdem nach Änderungen auf dem Standardbranch und planmäßig um 01:17, 09:17 und 17:17 UTC. GitHub kann geplante Läufe verzögern. Drei planmäßige Abrufe pro Tag entsprechen in einem Monat mit 31 Tagen 93 Metals.Dev-Anfragen. Manuelle Starts und Änderungen am Standardbranch zählen zusätzlich zum Kontingent. Unter **Settings → Pages** lässt sich eine eigene Domain einstellen.

Die Kursbeschaffung läuft auf dem Server. Veröffentlicht werden validierte EUR/g-Daten mit dem Kurszeitpunkt. Die Browser der Besucher lesen die Kursdatei der Website und prüfen sie bei offener Seite alle 15 Minuten erneut. Ohne Internetverbindung zeigt die Website den lokalen Stand. Beim Hochladen als reine Branch-Website ohne Workflow bleiben die Paketwerte gespeichert.

## Wenn ein Anbieter nicht antwortet

Vor jedem Lauf prüft das Skript das veröffentlichte Kursdokument unter der von GitHub Pages übermittelten Adresse. Ein fehlgeschlagener Aktualisierungslauf lässt die aktive Veröffentlichung bestehen. Beim bestätigten ersten Start (öffentliches Kursdokument meldet HTTP 404) darf der Workflow einen gekennzeichneten Startstand ausliefern. Wird später der Metals.Dev-Schlüssel entfernt, bleiben belegte Silber-, Platin- und Palladiumkurse inklusive ursprünglichem Zeitstempel erhalten. Nach 36 Stunden zeigt die Oberfläche einen älteren Kursstand an. Das Datum bei archivierten Händlerwerten bezeichnet den Ablesetag.

Die Berechnung verwendet Bruttogewichte je Metall für die Staffel und den jeweiligen Feingehalt für den Materialwert. Der Rechner weist auf aus Archiv- oder älteren Kursen berechnete Beispiele hin. Ein Klick auf „Verkaufsanfrage vorbereiten“ öffnet eine E-Mail mit Positionen, Gewichten, Kursgrundlage und Schätzung im eigenen Mailprogramm. Die Nachricht kann dort geprüft und versendet werden. Längere Listen lassen sich vollständig kopieren.

## Quellen

- [Kurstafel Nachlassgold](https://www.nachlassgold.de/) und [Ankaufsrechner mit eingeblendeten Abschlägen](https://www.nachlassgold.de/ankaufsrechner)
- [Metals.Dev API](https://metals.dev/docs) und [Anfragekontingente](https://metals.dev/pricing)
- [Narodowy Bank Polski](https://www.nbp.pl/), [API-Beschreibung und Datenfelder](https://api.nbp.pl/en.html) sowie [Quellenangaben der NBP](https://static.nbp.pl/dokumenty/regulaminy/regulamin_nbppl.pdf)
- [GitHub Pages mit eigenen Workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
