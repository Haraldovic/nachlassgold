/* The photo sequence is optional. Links and content work without JavaScript. */
(() => {
  'use strict';
  const gallery = document.querySelector('[data-ng-gallery]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (gallery) {
    const slides = [...gallery.querySelectorAll('[data-ng-slide]')];
    const buttons = [...gallery.querySelectorAll('[data-ng-pick]')];
    const pause = gallery.querySelector('[data-ng-pause]');
    const pauseLabel = gallery.querySelector('[data-ng-pause-label]');
    let current = 0, timer, request = 0, paused = false, hovered = false, focused = false, visible = true;
    function stop() { clearTimeout(timer); }
    function schedule() {
      stop();
      if (!paused && !hovered && !focused && !document.hidden && visible && !reduce.matches) {
        timer = setTimeout(() => show((current + 1) % slides.length), 8500);
      }
    }
    function reflectPause() {
      pause.hidden = reduce.matches;
      pauseLabel.textContent = paused ? 'Start' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Automatischen Bildwechsel starten' : 'Automatischen Bildwechsel pausieren');
    }
    async function show(index) {
      stop();
      const ticket = ++request;
      const img = slides[index].querySelector('img');
      if (img.dataset.src) {
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
      try { await img.decode(); } catch { schedule(); return; }
      if (ticket !== request) return;
      slides.forEach((slide, i) => { slide.classList.toggle('is-current', i === index); slide.setAttribute('aria-hidden', String(i !== index)); });
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      current = index;
      schedule();
    }
    buttons.forEach((button, index) => button.addEventListener('click', () => { paused = true; reflectPause(); show(index); }));
    pause.addEventListener('click', () => { paused = !paused; reflectPause(); schedule(); });
    gallery.addEventListener('mouseenter', () => { hovered = true; stop(); });
    gallery.addEventListener('mouseleave', () => { hovered = false; schedule(); });
    gallery.addEventListener('focusin', () => { focused = true; stop(); });
    gallery.addEventListener('focusout', event => { focused = gallery.contains(event.relatedTarget); schedule(); });
    document.addEventListener('visibilitychange', schedule);
    reduce.addEventListener('change', () => { reflectPause(); schedule(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, { threshold: 0.15 }).observe(gallery);
    }
    gallery.querySelector('[data-ng-controls]').hidden = false;
    reflectPause(); schedule();
  }
  const targets = [...document.querySelectorAll('.ng20-process-heading, .ng20-route-intro, .ng20-person-copy, .ng20-send-copy')];
  if (!reduce.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('is-waiting'); observer.unobserve(entry.target); }
    }), { threshold: 0.06 });
    targets.forEach(node => {
      if (node.getBoundingClientRect().top > window.innerHeight) { node.classList.add('ng20-reveal', 'is-waiting'); observer.observe(node); }
    });
    reduce.addEventListener('change', () => {
      if (reduce.matches) { observer.disconnect(); targets.forEach(node => node.classList.remove('is-waiting')); }
    });
  }
})();
