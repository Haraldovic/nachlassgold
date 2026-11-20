/* Small progressive enhancements. Content and links stay usable without JavaScript. */
(() => {
  'use strict';
  const stoneButtons = [...document.querySelectorAll('[data-stone]')];
  const stoneImage = document.querySelector('[data-stone-image]');
  if (stoneImage) stoneButtons.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      const stone = button.dataset.stone;
      if (!['diamant', 'rubin', 'saphir', 'smaragd'].includes(stone)) return;
      stoneButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      stoneImage.src = `assets/atlas-${stone}.webp`;
      stoneImage.alt = button.dataset.stoneAlt;
      stoneImage.dataset.stoneCurrent = stone;
      document.querySelector('[data-stone-name]').textContent = button.dataset.stoneTitle;
      document.querySelector('[data-stone-caption]').textContent = button.dataset.stoneSubtitle;
    });
  });
  const productImage = document.getElementById('produktansicht');
  const productButtons = [...document.querySelectorAll('[data-product-image]')];
  if (productImage) productButtons.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      productButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      productImage.src = button.dataset.productImage;
      productImage.alt = button.dataset.productAlt;
      document.querySelector('[data-product-caption]').textContent = button.dataset.productAlt;
    });
  });
  const colourButtons = [...document.querySelectorAll('[data-colour]')];
  colourButtons.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-picked]').forEach(item => item.removeAttribute('data-picked'));
      colourButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      const cell = button.closest('th');
      cell.dataset.picked = 'true';
      const table = cell.closest('table');
      const sample = table.tBodies[0].rows[0].cells[cell.cellIndex];
      sample.dataset.picked = 'true';
      const group = table.caption.textContent.trim();
      document.querySelector('[data-colour-result]').textContent = `Farbgrad ${button.dataset.colour} · ${group}. Schematische Darstellung zur Orientierung.`;
    });
  });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const targets = [...document.querySelectorAll('.fv-feature-product, .fv-world, .fv-signature, .ng-service-options>a, .ng-process li, .gg-topic-list>a')];
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('reveal-pending');
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
      }
    }), {threshold: 0.08});
    targets.forEach(target => {
      if (target.getBoundingClientRect().top > window.innerHeight) {
        target.setAttribute('data-reveal','');
        target.classList.add('reveal-pending');
        observer.observe(target);
      }
    });
    reduced.addEventListener('change', event => {
      if (event.matches) {observer.disconnect(); targets.forEach(target => target.classList.remove('reveal-pending'));}
    });
  }
})();
