/* Both sample lenses read their descriptions from the printed index below. */
(() => {
  'use strict';
  const index = document.querySelector('.ta-clarity-index');
  const comparator = document.querySelector('[data-compare]');
  if (!index || !comparator) return;
  const grades = new Map(Array.from(index.querySelectorAll('tbody tr[data-grade]'), row => [
    row.dataset.grade, row.querySelector('[data-summary]').textContent,
  ]));
  for (const select of comparator.querySelectorAll('[data-grade-select]')) {
    const box = select.closest('.ta-specimen');
    const plot = box.querySelector('[data-grade-view]');
    const note = box.querySelector('[data-grade-note]');
    function update() {
      if (!grades.has(select.value)) return;
      plot.setAttribute('href', '#ta-plot-' + select.value);
      note.textContent = grades.get(select.value);
    }
    select.disabled = false;
    select.addEventListener('change', update);
    update();
  }
})();
