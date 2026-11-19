(() => {
  const head = document.querySelector('.dv-head');
  if (!head) return;
  const toggle = head.querySelector('.dv-menu');
  const nav = head.querySelector('.dv-links');
  const narrow = matchMedia('(max-width: 980px)');
  function change(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('dv-open', open);
  }
  head.classList.add('dv-js');
  toggle.addEventListener('click', () => change(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) change(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('dv-open')) {
      change(false);
      toggle.focus();
    }
  });
  narrow.addEventListener('change', () => change(false));
})();
