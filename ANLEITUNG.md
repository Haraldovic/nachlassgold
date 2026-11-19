# Nachlassgold

Entpacke das ZIP und öffne `index.html` für einen ersten Rundgang. Kursübersicht und Ankaufsrechner bringen einen datierten Satz Referenzpreise vom 19. November 2026 mit. Die Aktualisierung startet beim Betrieb über den mitgelieferten GitHub-Actions-Workflow.

## Gestaltung und Bedienung

Auf der Startseite erreichst du Verkaufsanfrage, Rechner und Ankaufswege. Über die Navigation gelangst du zum Edelsteinatlas. Quelle und Datenstand der Edelmetallkurse zeigt die Kurstabelle.

## Vorschau auf GitHub Pages

1. Übernimm den gesamten entpackten Inhalt in das vorgesehene Repository. `index.html` und der Ordner `.github` müssen auf derselben obersten Ebene liegen. Bei ausgeblendeten Punktdateien hilft GitHub Desktop. Prüfe anschließend im Repository, ob die Workflow-Datei unter `.github/workflows/` sichtbar ist.
2. Wähle unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions**.
3. Öffne **Actions**, wähle den mitgelieferten Workflow und starte ihn bei Bedarf über **Run workflow** auf dem Standardbranch. Öffne nach erfolgreicher Veröffentlichung **Settings → Pages → Visit site**.
4. Prüfe in der Kursübersicht Quelle und Zeitstand je Metall. Teste im Rechner beispielsweise einen 585er-Goldring und den Download des Versandbegleitscheins.

## Kurse aktualisieren

- **Für metals.dev** legst du unter **Settings → Secrets and variables → Actions → New repository secret** ein Secret namens `METALS_DEV_API_KEY` mit deinem gültigen Schlüssel an. Starte den Workflow für den ersten Abruf erneut. Er kann damit Gold, Silber, Platin und Palladium dreimal täglich abrufen. Der Schlüssel gehört ausschließlich ins Secret.
- **Ohne Schlüssel** nutzt der Workflow für Gold den letzten veröffentlichten Goldpreis der polnischen Nationalbank (NBP) und rechnet den Betrag in Euro um. Silber, Platin und Palladium behalten ihren gekennzeichneten gespeicherten Stand. An Wochenenden und Feiertagen kann das letzte Veröffentlichungsdatum zurückliegen.
- Der Rechner zeigt eine Orientierung. Für ein konkretes Ankaufangebot prüft Dietmar das eingesandte oder vorgelegte Stück. Nach einem fehlgeschlagenen Lauf geben der Status unter **Actions** und der angezeigte Datenstand Auskunft.

## Vor der öffentlichen Nutzung

Kläre mit Dietmar, wer die Website betreibt. Prüft vor der Veröffentlichung die Anbieterangaben, den Datenschutz, die Bildrechte, die Versandunterlagen und die Ankaufsbedingungen. Die bisherige Nachlassgold-Domain ist in Betrieb. Verwende für die Präsentation eine Vorschauadresse. Für den geschäftlichen Dauerbetrieb ist ein dafür vorgesehener Hoster nötig. [GitHub-Pages-Nutzungsgrenzen](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Details zu Kursquellen, Zeitplan und Verhalten bei Ausfällen stehen in [KURSE.md](KURSE.md).

**Upload prüfen:** Die neue `index.html` und der Ordner `assets/` gehören auf dieselbe Ebene. Im Gesamtpaket gehören alle drei Markenordner neben die oberste `index.html`. Bei bestehenden Repositories die gleichnamigen Dateien ersetzen und vorhandene Domain-Einstellungen beibehalten.

Die Gestaltungsregeln stehen in [DESIGN.md](DESIGN.md). Beim Upload den Ordner `assets/fonts/` mitübernehmen.
