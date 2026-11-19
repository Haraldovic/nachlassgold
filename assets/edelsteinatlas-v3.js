(() => {
  'use strict';

  for (const atlas of document.querySelectorAll('[data-gem-atlas]')) {
    const fancy = atlas.querySelector('[data-at-fancy]');
    if (fancy) {
      const picker = fancy.querySelector('fieldset');
      const descriptions = fancy.querySelectorAll('[data-at-hue]');
      function selectHue() {
        const selected = picker.querySelector('input:checked');
        if (!selected) return;
        for (const description of descriptions) {
          description.hidden = description.dataset.atHue !== selected.value;
        }
      }
      selectHue();
      picker.addEventListener('change', selectHue);
      picker.hidden = false;
    }
    for (const group of atlas.querySelectorAll('[data-at-controls]')) {
      const type = group.dataset.atControls;
      const table = atlas.querySelector('[data-at-table="' + type + '"]');
      const output = atlas.querySelector('[data-at-output="' + type + '"]');
      if (!table || !output) continue;
      const rows = [...table.querySelectorAll('tbody tr')];
      const options = [...group.querySelectorAll('input[type="radio"]')];
      if (rows.length !== options.length || !options.length) continue;
      function update() {
        const checked = group.querySelector('input:checked');
        const row = rows[Number(checked?.value)];
        if (!checked || !row) return;
        const [code, name, detail] = [...row.cells].map(cell => cell.textContent.trim());
        output.querySelector('[data-at-code]').textContent = code;
        output.querySelector('[data-at-name]').textContent = name;
        output.querySelector('[data-at-detail]').textContent = detail;
        if (type === 'color') {
          const stone = output.querySelector('[data-at-selected-stone]');
          if (stone) stone.className = 'at-sample at-sample-' + Number(checked.value);
        }
        if (type === 'clarity') {
          for (const mark of atlas.querySelectorAll('[data-at-plot]')) {
            mark.toggleAttribute('data-visible', mark.dataset.atPlot === code);
          }
        }
      }
      group.addEventListener('change', update);
      table.open = false;
      group.hidden = false;
      update();
    }
  }
})();
