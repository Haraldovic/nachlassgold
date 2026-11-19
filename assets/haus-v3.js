(() => {
  const header = document.querySelector('[data-dv-header]');
  if (!header) return;
  const menu = header.querySelector('.dv-menu');
  const navigation = header.querySelector('.dv-links');
  const brands = header.querySelector('.dv-family');
  const brandToggle = brands.querySelector('summary');
  const mobile = matchMedia('(max-width: 66rem)');

  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('dv-open', open);
    if (!open) brands.open = false;
  }

  header.classList.add('dv-js');
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });

  function dismissOutside(event) {
    if (!header.contains(event.target)) setMenu(false);
    else if (!brands.contains(event.target)) brands.open = false;
  }
  document.addEventListener('pointerdown', dismissOutside);
  document.addEventListener('focusin', dismissOutside);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (brands.open) {
      brands.open = false;
      brandToggle.focus();
    } else if (menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    } else {
      return;
    }
    event.preventDefault();
  });
  mobile.addEventListener('change', () => {
    if (mobile.matches && navigation.contains(document.activeElement)) menu.focus();
    setMenu(false);
  });
})();
