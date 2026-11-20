/* Decorative, softly crossfading photography. Reduced motion keeps the first image. */
(() => {
  'use strict';
  const gallery = document.querySelector('[data-ng-gallery]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (gallery) {
    const slides = [...gallery.querySelectorAll('[data-ng-slide]')];
    let current = 0, timer, request = 0, visible = true;
    const stop = () => clearTimeout(timer);
    function schedule() {
      stop();
      if (slides.length > 1 && visible && !document.hidden && !reduce.matches) {
        timer = setTimeout(() => show((current + 1) % slides.length), 7000);
      }
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
      if (ticket !== request || reduce.matches || document.hidden || !visible) return;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-current', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
      });
      current = index;
      schedule();
    }
    document.addEventListener('visibilitychange', () => { ++request; schedule(); });
    reduce.addEventListener('change', () => { ++request; schedule(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting; ++request; schedule();
      }, {threshold: 0.1}).observe(gallery);
    }
    schedule();
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
