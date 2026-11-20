(() => {
  'use strict';

  const metals = {
    gold: { name: 'Gold', symbol: 'Au', grades: [333,375,410,585,750,900,916,999], defaultGrade: 585 },
    silver: { name: 'Silber', symbol: 'Ag', grades: [800,835,900,925,950,999], defaultGrade: 925 },
    platinum: { name: 'Platin', symbol: 'Pt', grades: [950,999], defaultGrade: 950 },
    palladium: { name: 'Palladium', symbol: 'Pd', grades: [950,999], defaultGrade: 950 }
  };
  const names = Object.keys(metals);
  const providers = {
    archive: ['Nachlassgold', 'https://www.nachlassgold.de/'],
    nbp: ['Narodowy Bank Polski', 'https://www.nbp.pl/'],
    metalsdev: ['Metals.Dev', 'https://metals.dev/']
  };
  const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const money = value => euro.format(value);
  const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'medium' });
  const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'short' });
  const scriptUrl = document.currentScript.src;
  let bundle = window.NachlassgoldRates;
  let activeMetal = 'gold';
  let currentSummary = '';
  const tickers = [...document.querySelectorAll('[data-rate-ticker]')];
  const market = document.querySelector('[data-rate-market]');
  const calc = document.querySelector('[data-rate-calculator]');
  const overview = document.querySelector('[data-rate-overview]');
  if (!tickers.length && !market && !calc && !overview) return;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function sourceLink(key) {
    const [name, url] = providers[key];
    const link = el('a', '', name);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }
  function validQuote(quote, metal) {
    if (!quote || !Object.hasOwn(providers, quote.source) || typeof quote.asOf !== 'string') return false;
    const epoch = Date.parse(quote.asOf);
    if (!Number.isFinite(epoch) || epoch > Date.now() + 300000) return false;
    if (quote.source === 'archive') {
      return metals[metal].grades.every(grade => Number.isFinite(quote.alloys?.[grade]) && quote.alloys[grade] > 0);
    }
    return Number.isFinite(quote.eurPerGram) && quote.eurPerGram > 0 && (quote.source !== 'nbp' || metal === 'gold');
  }
  function validate(data) {
    return data?.version === 1 && data.currency === 'EUR' && data.unit === 'g' &&
      names.every(metal => validQuote(data.metals?.[metal], metal));
  }
  function quoteFor(metal) { return bundle?.metals[metal]; }
  function priceFor(quote, grade) {
    return quote.source === 'archive' ? quote.alloys[grade] : quote.eurPerGram * grade / 1000;
  }
  function status(quote) {
    if (quote.source === 'archive') return 'Archivwert';
    if (bundle?.feedState === 'initial-fallback') return 'Gespeicherter Referenzstand';
    if (Date.now() - Date.parse(quote.asOf) > 36 * 3600000) return 'Älterer Kursstand';
    return quote.source === 'nbp' ? 'Tagesreferenz' : 'Marktkurs';
  }
  function dateString(quote) {
    const formatter = quote.asOf.length === 10 ? dayFormat : timeFormat;
    return formatter.format(new Date(quote.asOf));
  }
  function attribution(quote) {
    const p = el('p', 'ng-attribution');
    if (!quote) { p.textContent = 'Kursdaten derzeit nicht verfügbar.'; return p; }
    p.append(sourceLink(quote.source), quote.source === 'archive' ? ' · Abgelesen am ' : ' · Stand ', dateString(quote));
    if (quote.asOf.length > 10) p.append(' Uhr (Berlin)');
    return p;
  }
  function renderTickers() {
    for (const ticker of tickers) {
      const gold = quoteFor('gold');
      const caption = el('span', 'ng-ticker-label', 'Gold · 999er');
      const value = el('strong', 'ng-ticker-value', gold ? money(priceFor(gold, 999)) + ' / g' : 'Kurs offen');
      const asOf = el('span', 'ng-ticker-date', gold ? status(gold) + ' · ' + dateString(gold) : 'Derzeit ohne Kursstand');
      const link = el('a', 'ng-ticker-link', 'Alle Kurse →');
      link.href = 'edelmetallkurse.html';
      ticker.replaceChildren(caption, value, asOf, link);
    }
  }
  function renderOverview() {
    const items = names.map(key => {
      const metal = metals[key];
      const quote = quoteFor(key);
      const item = el('article', 'ng20-rate');
      item.dataset.archive = String(quote?.source === 'archive');
      const name = el('span', 'ng20-rate-name');
      name.append(el('small', '', metal.symbol), metal.name);
      const value = el('strong', 'ng20-rate-value', quote ? money(priceFor(quote, 999)) : '–');
      if (quote) value.append(el('small', '', '/ g'));
      item.append(name, value, el('span', 'ng20-rate-status', quote ? status(quote) : 'Kein Kurs verfügbar'), attribution(quote));
      return item;
    });
    overview.replaceChildren(...items);
  }
  function initMarket() {
    const tabs = market.querySelector('[data-metal-tabs]');
    for (const [key, metal] of Object.entries(metals)) {
      const button = el('button', 'ng-tab', metal.name);
      button.type = 'button';
      button.dataset.metal = key;
      button.setAttribute('aria-pressed', String(key === activeMetal));
      button.addEventListener('click', () => { activeMetal = key; renderMarket(); });
      tabs.append(button);
    }
  }
  function renderMarket() {
    for (const button of market.querySelectorAll('[data-metal]')) {
      button.setAttribute('aria-pressed', String(button.dataset.metal === activeMetal));
    }
    const metal = metals[activeMetal];
    const quote = quoteFor(activeMetal);
    const lead = el('div', 'ng-market-lead');
    lead.append(el('span', 'ng-element-symbol', metal.symbol), el('h2', '', metal.name));
    if (quote) lead.append(el('span', 'ng-source-status', status(quote)));
    const table = el('table', 'ng-market-table');
    const caption = el('caption', '', 'Materialwert in Euro je Gramm');
    const head = table.createTHead().insertRow();
    ['Feingehalt', 'Materialwert / g'].forEach(text => {
      const cell = el('th', '', text); cell.scope = 'col'; head.append(cell);
    });
    const body = table.createTBody();
    for (const grade of metal.grades) {
      const row = body.insertRow();
      const label = el('th', '', String(grade) + ' ‰'); label.scope = 'row'; row.append(label);
      row.insertCell().textContent = quote ? money(priceFor(quote, grade)) : '–';
    }
    table.prepend(caption);
    const detail = market.querySelector('[data-metal-detail]');
    detail.replaceChildren(lead, table, attribution(quote));
    if (quote?.source === 'nbp') {
      detail.append(el('p', 'ng-rate-note', 'Der Goldwert je Gramm Feingold wird aus dem Goldpreis in Złoty und dem EUR-Mittelkurs der NBP vom selben Stichtag berechnet.'));
    }
  }
  function parseWeight(value) {
    const normalized = value.trim().replace(',', '.');
    if (!/^(?:\d{1,9}(?:\.\d{0,3})?|\.\d{1,3})$/.test(normalized)) return null;
    const mg = Math.round(Number(normalized) * 1000);
    return mg > 0 && Number.isSafeInteger(mg) ? mg : null;
  }
  function discount(metal, grade, totalMg) {
    if (metal === 'gold') return grade === 999 ? 5 : (totalMg > 50000 ? 10 : 12);
    if (metal === 'silver') return (grade === 999 ? 15 : 20) - (totalMg > 2000000 ? 3 : 0);
    return 25;
  }
  function field(label, input) {
    const wrapper = el('label', 'ng-field');
    wrapper.append(el('span', '', label), input);
    return wrapper;
  }
  function option(value, text) {
    const op = el('option', '', text); op.value = String(value); return op;
  }
  function updateGrades(row) {
    const key = row.querySelector('[data-metal-input]').value;
    const select = row.querySelector('[data-grade]');
    select.replaceChildren(...metals[key].grades.map(g => option(g, key === 'silver' && g === 999 ? '999 ‰ · Münzen / Barren' : g + ' ‰')));
    select.value = String(metals[key].defaultGrade);
  }
  function addLine(focus) {
    const group = el('fieldset', 'ng-calc-line');
    const legend = el('legend', '', 'Position');
    const grid = el('div', 'ng-line-fields');
    const metal = el('select'); metal.dataset.metalInput = '';
    names.forEach(key => metal.append(option(key, metals[key].name)));
    const grade = el('select'); grade.dataset.grade = '';
    const weight = el('input'); weight.type = 'text'; weight.inputMode = 'decimal';
    weight.placeholder = 'z. B. 12,5'; weight.maxLength = 13; weight.dataset.weight = '';
    weight.autocomplete = 'off';
    const remove = el('button', 'ng-remove', 'Entfernen'); remove.type = 'button'; remove.dataset.remove = '';
    const feedback = el('p', 'ng-line-note'); feedback.dataset.feedback = '';
    grid.append(field('Edelmetall', metal), field('Feingehalt', grade), field('Gewicht (g)', weight));
    group.append(legend, grid, feedback, remove);
    calc.querySelector('[data-calc-items]').append(group);
    updateGrades(group);
    metal.addEventListener('change', () => { updateGrades(group); renderCalc(); });
    grade.addEventListener('change', renderCalc);
    weight.addEventListener('input', renderCalc);
    remove.addEventListener('click', () => {
      const next = group.nextElementSibling || group.previousElementSibling;
      group.remove(); renderCalc(); next?.querySelector('[data-metal-input]').focus();
    });
    renderCalc();
    if (focus) metal.focus();
  }
  function renderCalc() {
    const weightTotals = Object.fromEntries(names.map(key => [key, 0]));
    const lines = [...calc.querySelectorAll('.ng-calc-line')].map((row, index, all) => {
      const key = row.querySelector('[data-metal-input]').value;
      const grade = Number(row.querySelector('[data-grade]').value);
      const input = row.querySelector('[data-weight]');
      const mg = parseWeight(input.value);
      const invalid = input.value.trim() !== '' && mg === null;
      input.setAttribute('aria-invalid', String(invalid));
      row.querySelector('legend').textContent = 'Position ' + (index + 1);
      const remove = row.querySelector('[data-remove]');
      remove.hidden = all.length === 1;
      remove.setAttribute('aria-label', 'Position ' + (index + 1) + ' entfernen');
      weightTotals[key] += mg || 0;
      return { row, key, grade, mg, invalid, quote: quoteFor(key) };
    });
    const used = lines.filter(line => line.mg);
    const hasError = lines.some(line => line.invalid) || used.some(line => !line.quote);
    const historic = used.some(line => line.quote && ['Archivwert', 'Älterer Kursstand', 'Gespeicherter Referenzstand'].includes(status(line.quote)));
    let material = 0;
    let deduction = 0;
    for (const {row, key, grade, mg, invalid, quote} of lines) {
      const feedback = row.querySelector('[data-feedback]');
      if (invalid) { feedback.textContent = 'Bitte geben Sie ein positives Gewicht mit höchstens drei Nachkommastellen ein.'; continue; }
      if (!quote) { feedback.textContent = 'Für dieses Metall liegt kein nutzbarer Kurs vor.'; continue; }
      const cut = discount(key, grade, weightTotals[key]);
      const rate = priceFor(quote, grade);
      const value = (mg || 0) / 1000 * rate;
      material += value; deduction += value * cut / 100;
      feedback.textContent = money(rate) + ' Materialwert / g · ' + cut + ' % Abschlag' + (mg ? ' · ' + money(value * (1 - cut / 100)) + ' Ankaufswert' : '');
    }
    const show = !hasError && used.length > 0;
    calc.querySelector('[data-total]').textContent = show ? money(material - deduction) : '–';
    calc.querySelector('[data-material]').textContent = show ? money(material) : '–';
    calc.querySelector('[data-deduction]').textContent = show ? '−' + money(deduction) : '–';
    calc.querySelector('[data-result-label]').textContent = hasError ? 'Bitte prüfen Sie die markierten Positionen.' :
      !show ? 'Geben Sie ein Gewicht ein.' : historic ? 'Beispielrechnung mit archiviertem oder älterem Kursstand' : 'Unverbindlicher Ankaufswert zum Kursstand';
    const request = calc.querySelector('[data-sale-request]');
    const mailNote = calc.querySelector('[data-mail-note]');
    request.href = 'kontakt.html'; request.textContent = 'Persönliche Beratung →';
    mailNote.hidden = true; mailNote.textContent = '';
    currentSummary = '';
    if (show) {
      const rows = used.map(({key, grade, quote, mg}) => {
        const grams = (mg / 1000).toLocaleString('de-DE', { maximumFractionDigits: 3 });
        const rate = priceFor(quote, grade);
        const cut = discount(key, grade, weightTotals[key]);
        return metals[key].name + ' ' + grade + ' ‰, ' + grams + ' g, ' +
          money(rate) + '/g Materialwert, ' + cut + ' % Abschlag, geschätzt ' +
          money(mg / 1000 * rate * (1 - cut / 100)) + '. ' + status(quote) + ' · ' +
          providers[quote.source][0] + ', ' + dateString(quote) + '.';
      });
      const totals = ['Materialwert ' + money(material), 'Ankaufsabschlag ' + money(deduction),
        (historic ? 'Beispielwert ' : 'Geschätzter Ankaufswert ') + money(material - deduction)];
      const title = 'Nachlassgold – unverbindliche Berechnung';
      currentSummary = [title, ...rows, ...totals].join('\n');
      const mail = items => {
        const body = ['Guten Tag Herr Vogelmann,', '', 'ich möchte diese Stücke zum Verkauf anbieten:', '',
          title, ...items, ...totals, '', 'Bitte melden Sie sich für die persönliche Prüfung bei mir.', ''].join('\r\n');
        return 'mailto:info@nachlassgold.de?subject=' + encodeURIComponent('Verkaufsanfrage · Nachlassgold') +
          '&body=' + encodeURIComponent(body);
      };
      const complete = mail(rows);
      if (complete.length <= 1800) {
        request.href = complete;
        mailNote.textContent = 'Öffnet Ihren E-Mail-Entwurf mit Positionen und Kursstand. Sie prüfen und versenden ihn selbst.';
      } else {
        const included = [];
        const summary = 'Vollständige Liste bei Bedarf aus dem Rechner einfügen.';
        for (const row of rows) {
          if (mail([...included, row, summary]).length > 1750) break;
          included.push(row);
        }
        request.href = mail([...included, '(' + (rows.length - included.length) + ' weitere Positionen) ' + summary]);
        mailNote.textContent = 'Der E-Mail-Entwurf enthält die Gesamtschätzung und einen Auszug. Mit „Berechnung kopieren“ können Sie die vollständige Positionsliste einfügen.';
      }
      request.textContent = 'Verkaufsanfrage vorbereiten →';
      mailNote.hidden = false;
    }
    calc.querySelector('[data-copy-result]').hidden = !show;
    calc.querySelector('[data-copy-message]').textContent = '';
    calc.querySelector('[data-copy-fallback]').hidden = true;
    const sources = calc.querySelector('[data-calc-sources]');
    const keys = [...new Set((used.length ? used : lines).map(line => line.key))];
    sources.replaceChildren(...keys.map(key => {
      const quote = quoteFor(key);
      const line = attribution(quote);
      line.prepend(metals[key].name + (quote ? ' · ' + status(quote) : '') + ' · ');
      return line;
    }));
  }
  function render() { renderTickers(); if (overview) renderOverview(); if (market) renderMarket(); if (calc) renderCalc(); }
  if (!validate(bundle)) bundle = null;
  if (market) initMarket();
  if (calc) {
    addLine(false);
    calc.querySelector('[data-copy-result]').addEventListener('click', async () => {
      if (!currentSummary) return;
      const message = calc.querySelector('[data-copy-message]');
      try {
        await navigator.clipboard.writeText(currentSummary);
        message.textContent = 'Für Ihre Anfrage kopiert.';
      } catch {
        const box = calc.querySelector('[data-copy-fallback]');
        box.value = currentSummary; box.hidden = false; box.focus(); box.select();
        message.textContent = 'Sie können den markierten Text jetzt kopieren.';
      }
    });
    calc.querySelector('[data-add-item]').addEventListener('click', () => addLine(true));
  }
  render();

  // Only the website's own published data file is requested by visitors.
  if (!['https:', 'http:'].includes(location.protocol)) return;
  const dataUrl = new URL('rates-data.json', scriptUrl);
  if (dataUrl.origin !== location.origin) return;
  let loading = false;
  async function refresh() {
    if (loading || document.hidden) return;
    loading = true;
    try {
      const response = await fetch(dataUrl, { cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const next = await response.json();
        if (validate(next)) bundle = next;
      }
    } catch { /* Keep the timestamped local data when offline. */ }
    finally { loading = false; render(); }
  }
  refresh();
  setInterval(refresh, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
