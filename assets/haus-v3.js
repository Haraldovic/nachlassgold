(() => {
  const header = document.querySelector('[data-dv-header]');
  if (!header) return;
  const menu = header.querySelector('.dv-menu');
  const navigation = header.querySelector('.dv-links');
  const mobile = matchMedia('(max-width: 66rem)');

  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('dv-open', open);
  }

  header.classList.add('dv-js');
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });

  function dismissOutside(event) {
    if (!header.contains(event.target)) setMenu(false);
  }
  document.addEventListener('pointerdown', dismissOutside);
  document.addEventListener('focusin', dismissOutside);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || menu.getAttribute('aria-expanded') !== 'true') return;
    setMenu(false);
    menu.focus();
    event.preventDefault();
  });
  mobile.addEventListener('change', () => {
    if (mobile.matches && navigation.contains(document.activeElement)) menu.focus();
    setMenu(false);
  });
})();
