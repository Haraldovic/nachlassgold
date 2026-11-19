/* Each WebP contains eight ray-traced camera views in two rows. */
(() => {
  'use strict';
  const columns = 4;
  const rows = 2;
  const perSheet = columns * rows;
  const names = new Set(['emerald', 'diamond', 'champagne']);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function mount(stage) {
    const gem = stage.dataset.jewel;
    const still = stage.querySelector('.jewel-still');
    const canvas = stage.querySelector('canvas');
    const control = stage.querySelector('.jewel-control');
    if (!names.has(gem) || !still || !canvas || !control || stage.dataset.jewelMounted) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    stage.dataset.jewelMounted = 'true';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sheets = [];
    let playing = !reduced.matches;
    let visible = false;
    let loading = false;
    let failed = false;
    let frameHandle = 0;
    let lastTime = null;
    let phase = 0;
    let pointer = 0;
    let wantedPointer = 0;
    let lastPosition = -1;

    function updateControl() {
      const label = playing ? 'Schliffstudie pausieren' : 'Schliffstudie abspielen';
      control.textContent = '';
      control.dataset.state = playing ? 'playing' : 'paused';
      control.setAttribute('aria-label', label);
      control.title = label;
      control.hidden = failed;
    }

    function drawView(frame, opacity) {
      const sheet = sheets[Math.floor(frame / perSheet)];
      const index = frame % perSheet;
      const cellWidth = sheet.naturalWidth / columns;
      const cellHeight = sheet.naturalHeight / rows;
      context.globalAlpha = opacity;
      context.drawImage(sheet, (index % columns) * cellWidth, Math.floor(index / columns) * cellHeight,
        cellWidth, cellHeight, 0, 0, canvas.width, canvas.height);
    }

    function draw(position) {
      const left = Math.floor(position);
      const right = Math.min(31, left + 1);
      const fraction = position - left;
      if (!sheets[Math.floor(left / perSheet)] || (fraction > 0 && !sheets[Math.floor(right / perSheet)])) return;
      if (Math.abs(position - lastPosition) < .0001) return;
      drawView(left, 1);
      if (fraction > .002) drawView(right, fraction);
      context.globalAlpha = 1;
      lastPosition = position;
      canvas.hidden = false;
    }

    function tick(now) {
      frameHandle = 0;
      if (!visible || document.hidden || !playing || failed) return;
      const dt = lastTime === null ? 0 : Math.min(.075, (now - lastTime) / 1000);
      lastTime = now;
      phase += dt * 2 * Math.PI / 10.8;
      pointer += (wantedPointer - pointer) * (1 - Math.exp(-dt * 5.5));
      draw(clamp(16 + 12.4 * Math.sin(phase) + pointer, 0, 31));
      frameHandle = requestAnimationFrame(tick);
    }

    async function loadSheets() {
      if (loading || failed) return;
      loading = true;
      try {
        // Frame 16 is the poster pose. Its sheet starts the showcase immediately.
        for (const i of [2, 1, 3, 0]) {
          const sprite = new Image();
          sprite.decoding = 'async';
          await new Promise((resolve, reject) => {
            sprite.onload = resolve;
            sprite.onerror = reject;
            sprite.src = new URL(gem + '-' + i + '.webp', still.src).href;
          });
          if (sprite.decode) await sprite.decode();
          if (i === 2) {
            canvas.width = sprite.naturalWidth / columns;
            canvas.height = sprite.naturalHeight / rows;
          }
          sheets[i] = sprite;
          if (i === 2) refresh();
        }
      } catch {
        failed = true;
        canvas.hidden = true;
        updateControl();
        refresh();
      }
    }

    function refresh() {
      if (failed || !visible || document.hidden || !playing) {
        if (frameHandle) cancelAnimationFrame(frameHandle);
        frameHandle = 0;
        lastTime = null;
        return;
      }
      if (!loading) void loadSheets();
      if (sheets[2] && !frameHandle) frameHandle = requestAnimationFrame(tick);
    }

    function toggle() {
      if (failed) return;
      playing = !playing;
      updateControl();
      refresh();
    }
    control.addEventListener('click', toggle);
    control.setAttribute('aria-keyshortcuts', 'K');
    stage.tabIndex = -1;
    stage.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.target !== stage && event.target !== control) return;
      // Space and Enter on the button already dispatch a native click.
      if (event.key.toLowerCase() !== 'k' && !(event.target === stage && event.key === ' ')) return;
      event.preventDefault();
      toggle();
    });
    const onPreferenceChange = () => {
      playing = !reduced.matches;
      if (reduced.matches) {
        canvas.hidden = true;
        phase = 0;
        pointer = wantedPointer = 0;
        lastPosition = -1;
      }
      updateControl();
      refresh();
    };
    if (reduced.addEventListener) reduced.addEventListener('change', onPreferenceChange);
    else reduced.addListener(onPreferenceChange);
    document.addEventListener('visibilitychange', refresh);
    stage.addEventListener('pointermove', event => {
      if (!playing || event.pointerType === 'touch') return;
      const box = stage.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const x = (event.clientX - box.left) / box.width * 2 - 1;
      const y = (event.clientY - box.top) / box.height * 2 - 1;
      wantedPointer = clamp(2.45 * x - .55 * y, -3, 3);
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { wantedPointer = 0; });

    updateControl();
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        refresh();
      });
      observer.observe(stage);
    } else {
      visible = true;
      refresh();
    }
  }

  const init = () => document.querySelectorAll('.jewel-stage[data-jewel]').forEach(mount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
