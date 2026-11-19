/* Shared lighting and scroll choreography. All media and motion stay on this page. */
(() => {
  'use strict';
  const body = document.body;
  if (!body || !body.classList.contains('lux-v5')) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const observerAvailable = 'IntersectionObserver' in window;
  const decor = name => {
    const item = document.createElement('span');
    item.className = name;
    item.setAttribute('aria-hidden', 'true');
    return item;
  };
  const stage = document.querySelector('[data-jewel]');
  let sky;
  if (stage) {
    sky = decor('lux-sky');
    for (let i = 0; i < 6; i++) sky.appendChild(document.createElement('i'));
    stage.append(sky);
    const hero = stage.closest('main > section');
    if (hero) hero.after(decor('lux-facet'));
  }
  const atlas = document.querySelector('main > .dv-atlas-call');
  if (atlas && !atlas.previousElementSibling?.classList.contains('lux-facet')) atlas.before(decor('lux-facet'));

  const cards = document.querySelectorAll('[data-lux-card], main .card, main .ng5-route');
  for (const card of cards) {
    card.classList.add('lux-card');
    card.append(decor('lux-card-shine'), decor('lux-card-rim'));
  }
  const titles = document.querySelectorAll('main section h2, main .page-intro h1, [data-lux-title]');
  titles.forEach(el => el.classList.add('lux-title'));
  const actions = document.querySelectorAll('main a.button, .fvn-primary, .ng5-sell, .gp-actions a, .dv-atlas-call > a, [data-lux-cta]');
  for (const action of actions) {
    action.classList.add('lux-cta');
    action.append(decor('lux-cta-shine'));
  }
  const subjects = [...document.querySelectorAll('.lux-title,.lux-facet,.lux-cta,.lux-card,[data-lux-reveal]')];
  const photos = [...document.querySelectorAll('main figure.photo:not(:has(button)) > img, .gp-portraits figure img, .ng5-photo img, [data-lux-depth]')];
  const activePhotos = new Set();
  let revealObserver, nearObserver;
  let frame = 0, hasScrolled = false;
  const pointer = decor('lux-pointer');
  let point;
  let pointing = false;
  function schedule() {
    if (!frame && !motion.matches && !document.hidden) frame = requestAnimationFrame(update);
  }
  function update() {
    frame = 0;
    if (point && pointing && mouse.matches) {
      pointer.style.transform = 'translate3d(' + (point.x - 85) + 'px,' + (point.y - 85) + 'px,0)';
      pointer.classList.add('lux-on');
    }
    if (!hasScrolled && !activePhotos.size) return;
    for (const photo of activePhotos) {
      const rect = photo.getBoundingClientRect();
      const fraction = 1 - (rect.top + rect.height / 2) / innerHeight * 2;
      const shift = Math.max(-4, Math.min(4, fraction * 4));
      photo.style.setProperty('--lux-depth', shift.toFixed(2) + 'px');
    }
    hasScrolled = false;
  }
  function addPass(el) {
    el.classList.add('lux-pass');
    window.setTimeout(() => el.classList.remove('lux-pass'), 1900);
  }
  function configure() {
    revealObserver?.disconnect();
    nearObserver?.disconnect();
    activePhotos.clear();
    subjects.forEach(el => el.classList.remove('lux-pending','lux-pass','lux-in'));
    photos.forEach(el => el.classList.remove('lux-depth'));
    if (sky) sky.classList.remove('lux-nearby');
    pointer.remove();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (motion.matches) return;
    if (mouse.matches) body.append(pointer);
    if (!observerAvailable) return;
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        if (el.classList.contains('lux-pending')) {
          el.classList.remove('lux-pending');
          el.classList.add('lux-in');
        }
        if (el.matches('.lux-title,.lux-cta,.lux-facet')) addPass(el);
        revealObserver.unobserve(el);
      }
    }, { threshold: .09 });
    const fold = innerHeight - 5;
    for (const el of subjects) {
      if (el.getBoundingClientRect().top >= fold && el.matches('.lux-card,[data-lux-reveal]')) {
        el.classList.add('lux-reveal','lux-pending');
      }
      revealObserver.observe(el);
    }
    nearObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === stage) {
          if (sky) sky.classList.toggle('lux-nearby', entry.isIntersecting && !document.hidden);
          continue;
        }
        if (entry.isIntersecting) activePhotos.add(entry.target);
        else activePhotos.delete(entry.target);
      }
      schedule();
    });
    photos.forEach(el => { el.classList.add('lux-depth'); nearObserver.observe(el); });
    if (stage) nearObserver.observe(stage);
  }
  window.addEventListener('scroll', () => { hasScrolled = true; schedule(); }, { passive:true });
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || motion.matches || !mouse.matches) return;
    point = {x:event.clientX,y:event.clientY};
    pointing = true;
    schedule();
  }, {passive:true});
  function hidePointer() { pointing = false; pointer.classList.remove('lux-on'); }
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) hidePointer(); });
  window.addEventListener('blur', hidePointer);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hidePointer();
      sky?.classList.remove('lux-nearby');
    } else if (!motion.matches && sky) {
      const rect = stage.getBoundingClientRect();
      sky.classList.toggle('lux-nearby', rect.top < innerHeight && rect.bottom > 0);
      schedule();
    }
  });
  document.addEventListener('focusin', event => {
    const el = event.target.closest('.lux-pending');
    if (el) el.classList.remove('lux-pending');
  });
  for (const query of [mouse,motion]) {
    if (query.addEventListener) query.addEventListener('change', configure);
    else query.addListener(configure);
  }
  configure();
})();
