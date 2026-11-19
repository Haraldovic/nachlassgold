"""Build the local market data files. Uses only Python's standard library."""
from datetime import date, datetime, timedelta, timezone
import json
import math
import os
from pathlib import Path
import sys
from urllib.error import HTTPError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request

METALS = ("gold", "silver", "platinum", "palladium")
GRADES = {
    "gold": (333, 375, 410, 585, 750, 900, 916, 999),
    "silver": (800, 835, 900, 925, 950, 999),
    "platinum": (950, 999),
    "palladium": (950, 999),
}

class InvalidFeed(ValueError):
    pass


class MissingResource(InvalidFeed):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def fetch_json(url):
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "Nachlassgold-Kursdienst/1.0"})
    try:
        with build_opener(NoRedirect()).open(request, timeout=22) as response:
            blob = response.read(512_001)
    except HTTPError as error:
        if error.code == 404:
            raise MissingResource("Die angefragte Ressource fehlt (HTTP 404).") from None
        raise InvalidFeed(f"Datenanbieter meldet HTTP {error.code}.") from None
    except OSError:
        raise InvalidFeed("Datenanbieter nicht erreichbar.") from None
    if len(blob) > 512_000:
        raise InvalidFeed("Unerwartete Datenmenge.")
    try:
        return json.loads(blob)
    except (UnicodeDecodeError, ValueError):
        raise InvalidFeed("Antwort ist kein gültiges JSON.") from None


def price(value):
    if type(value) not in (int, float) or not math.isfinite(value) or not (0 < value < 1_000_000):
        raise InvalidFeed("Ungültiger Preis.")
    return value


def check_as_of(stamp, today, max_age):
    if stamp > today + timedelta(minutes=5) or today - stamp > max_age:
        raise InvalidFeed("Der Kursstand ist veraltet oder liegt in der Zukunft.")


def metals_dev(key, today, fetch):
    query = urlencode({"api_key": key, "currency": "EUR", "unit": "g"})
    data = fetch("https://api.metals.dev/v1/latest?" + query)
    if (data.get("status"), data.get("currency"), data.get("unit")) != ("success", "EUR", "g"):
        raise InvalidFeed("Metals.Dev liefert keine verwertbaren EUR/g-Kurse.")
    stamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        raise InvalidFeed("Kurszeit ohne Zeitzone.")
    check_as_of(stamp, today, timedelta(days=7))
    stamp = stamp.astimezone(timezone.utc).isoformat(timespec="seconds")
    return {
        metal: {"source": "metalsdev", "asOf": stamp, "eurPerGram": price(data["metals"][metal])}
        for metal in METALS
    }


def nbp(today, fetch):
    # Gold and currency tables can be published at different times. Pair by effective date.
    base = "https://api.nbp.pl/api/"
    gold_data = fetch(base + "cenyzlota/last/10/?format=json")
    euro_data = fetch(base + "exchangerates/rates/a/eur/last/10/?format=json")
    if euro_data.get("table") != "A" or euro_data.get("code") != "EUR":
        raise InvalidFeed("NBP lieferte eine unerwartete Währungstabelle.")
    gold = {date.fromisoformat(row["data"]): price(row["cena"]) for row in gold_data}
    euro = {date.fromisoformat(row["effectiveDate"]): price(row["mid"]) for row in euro_data["rates"]}
    common_dates = gold.keys() & euro.keys()
    if not common_dates:
        raise InvalidFeed("Kein gemeinsamer Stichtag für Gold und Währung.")
    latest = max(common_dates)
    check_as_of(datetime(latest.year, latest.month, latest.day, tzinfo=timezone.utc), today, timedelta(days=10))
    return {
        "source": "nbp", "asOf": latest.isoformat(), "eurPerGram": price(gold[latest] / euro[latest]),
        "goldPlnPerGram": gold[latest], "plnPerEuro": euro[latest]
    }


def validate_bundle(data, today):
    if (data["version"], data["currency"], data["unit"]) != (1, "EUR", "g"):
        raise InvalidFeed("Ungültiges Kursdateiformat.")
    for metal in METALS:
        q = data["metals"][metal]
        stamp = datetime.fromisoformat(q["asOf"].replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            if len(q["asOf"]) != 10:
                raise InvalidFeed("Kurszeit ohne Zeitzone.")
            stamp = stamp.replace(tzinfo=timezone.utc)
        if stamp > today + timedelta(minutes=5):
            raise InvalidFeed("Zeitstempel liegt in der Zukunft.")
        if q["source"] == "archive":
            for grade in GRADES[metal]:
                price(q["alloys"][str(grade)])
        elif q["source"] == "metalsdev":
            price(q["eurPerGram"])
        elif q["source"] == "nbp" and metal == "gold":
            expected = price(q["goldPlnPerGram"]) / price(q["plnPerEuro"])
            if not math.isclose(price(q["eurPerGram"]), expected, rel_tol=1e-10):
                raise InvalidFeed("NBP-Umrechnung stimmt nicht.")
        else:
            raise InvalidFeed("Unbekannte Datenquelle.")
    return data


def source_time(quote):
    stamp = datetime.fromisoformat(quote["asOf"].replace("Z", "+00:00"))
    return stamp if stamp.tzinfo else stamp.replace(tzinfo=timezone.utc)


def newest(existing, candidate):
    if existing["source"] == "archive" and candidate["source"] != "archive":
        return candidate
    if candidate["source"] == "archive" and existing["source"] != "archive":
        return existing
    return candidate if source_time(candidate) >= source_time(existing) else existing


def write_bundle(site_dir, today, key, fetch=fetch_json, published_base=None):
    files = list(site_dir.rglob("rates-data.json"))
    if len(files) != 1:
        raise InvalidFeed("Genau eine Datei rates-data.json im Webverzeichnis erwartet.")
    path = files[0]
    seed = validate_bundle(json.loads(path.read_text(encoding="utf-8")), today)
    previous = None
    confirmed_first = False
    if published_base:
        base = urlsplit(published_base)
        if base.scheme not in ("http", "https") or not base.hostname or base.username or base.password or base.query or base.fragment:
            raise InvalidFeed("Die öffentliche Pages-Adresse ist ungültig.")
        # Pages may advertise HTTP for a custom domain. Always retrieve prices over HTTPS.
        https_base = base._replace(scheme="https").geturl().rstrip("/")
        public_url = https_base + "/" + quote(path.relative_to(site_dir).as_posix(), safe="/")
        try:
            previous = validate_bundle(fetch(public_url), today)
        except MissingResource:
            confirmed_first = True
        except Exception:
            # Without verified previous prices, a gold-only feed could roll back the other three metals.
            raise InvalidFeed("Veröffentlichter Kursstand ist nicht überprüfbar. Aktive Website bleibt erhalten.") from None
    entries = dict(seed["metals"])
    if previous:
        entries.update({m: newest(entries[m], previous["metals"][m]) for m in METALS})
    source = {"version": 1, "currency": "EUR", "unit": "g", "metals": entries}
    try:
        current = metals_dev(key, today, fetch) if key else {"gold": nbp(today, fetch)}
        for symbol, item in current.items():
            entries[symbol] = newest(entries[symbol], item)
    except Exception:
        if not confirmed_first:
            raise InvalidFeed("Kein nutzbares Update. Die bisherige Veröffentlichung bleibt erhalten.") from None
        source["feedState"] = "initial-fallback"
        print("Erstbereitstellung mit gekennzeichnetem Paketstand. Erneuter Abruf beim nächsten Lauf.")
    validate_bundle(source, today)
    raw = json.dumps(source, indent=2, allow_nan=False) + "\n"
    path.write_text(raw, encoding="utf-8")
    path.with_suffix(".js").write_text("window.NachlassgoldRates = " + raw.rstrip() + ";\n", encoding="utf-8")
    return source


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise InvalidFeed("Aufruf mit Pfad zum vorbereiteten Webverzeichnis erforderlich.")
        write_bundle(Path(sys.argv[1]), datetime.now(timezone.utc), os.environ.get("METALS_DEV_API_KEY", "").strip(),
                     published_base=os.environ.get("PAGES_BASE_URL") or None)
    except InvalidFeed as error:
        print(f"Kursupdate abgebrochen. {error}", file=sys.stderr)
        sys.exit(1)
    except Exception:
        # Raw upstream errors may contain the request URL and its API credential.
        print("Kursupdate abgebrochen. Antwortformat oder lokale Dateien sind ungültig.", file=sys.stderr)
        sys.exit(1)
    print("Kursdateien erstellt und validiert.")
