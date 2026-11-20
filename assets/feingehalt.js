(() => {
  'use strict';

  const grams = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const percent = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  for (const guide of document.querySelectorAll('[data-purity-guide]')) {
    const calculator = guide.closest('[data-rate-calculator]');
    const list = calculator?.querySelector('[data-calc-items]');
    if (!list) continue;
    const stamp = guide.querySelector('[data-purity-stamp]');
    const description = guide.querySelector('[data-purity-description]');
    const meter = guide.querySelector('[data-purity-meter]');
    const position = guide.querySelector('[data-purity-position]');
    const percentage = guide.querySelector('[data-purity-percent]');
    let rememberedRow;
    let previous = '';

    function sync(row) {
      if (!row || !list.contains(row)) return;
      const metal = row.querySelector('[data-metal-input]');
      const metalName = metal?.selectedOptions[0]?.textContent;
      const grade = Number(row.querySelector('[data-grade]')?.value);
      if (!metalName || !Number.isInteger(grade) || grade <= 0 || grade > 1000) return;
      const label = row.querySelector('legend')?.textContent || 'Ihre Auswahl';
      rememberedRow = row;
      const next = [metal.value, grade, label].join('/');
      if (next === previous) return;
      previous = next;
      guide.dataset.tone = metal.value;
      stamp.textContent = String(grade);
      meter.value = grade;
      position.textContent = label;
      percentage.textContent = percent.format(grade / 10) + ' % ' + metalName;
      description.textContent = grade + ' von 1.000 Gewichtsteilen sind ' + metalName +
        '. Ein Gramm dieser Legierung enthält ' + grams.format(grade / 1000) + '\u00a0g ' + metalName + '.';
    }
    const current = () => sync(rememberedRow && list.contains(rememberedRow) ? rememberedRow : list.querySelector('.ng-calc-line'));
    const selection = event => sync(event.target.closest('.ng-calc-line'));
    list.addEventListener('focusin', selection);
    list.addEventListener('change', selection);
    // Dynamic positions are created by the calculator, which owns all inputs and values.
    new MutationObserver(current).observe(list, { childList: true });
    current();
  }
})();
